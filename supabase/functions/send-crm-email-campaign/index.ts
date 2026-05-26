// POST /functions/v1/send-crm-email-campaign
//
// Body: { campaign_id: uuid, prospect_ids: uuid[] }    (max 50)
//
// Envía una campaña CRM a un lote de prospectos. Para cada destinatario:
//   - omite si no_contactar=true o email inválido/ausente
//   - construye HTML con plantilla maestra + texto sugerido
//   - invoca Resend con from/replyTo de la campaña o defaults globales
//   - guarda resultado por destinatario en crm_email_sends (upsert)
//   - actualiza estado de la campaña al final del lote
//
// Solo superadmin puede invocar. Procesamiento secuencial con sleep de
// 50ms entre envíos para mantenerse muy por debajo del rate limit Resend
// (~100/s). Cap de 50 destinatarios por invocación para no exceder el
// timeout de Edge Functions (~150s).

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";
import {
  sendEmail,
  buildCrmProspectingEmail,
  getCrmFromEmail,
  getCrmReplyTo,
  renderCrmTemplate,
  findUnknownCrmTemplateVariables,
} from "../_shared/email.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const MAX_BATCH = 50;
const INTER_SEND_DELAY_MS = 50;

type Campaign = {
  id: string;
  nombre: string;
  asunto_default: string;
  cuerpo_default: string | null;
  mensaje_rrss_template: string | null;
  script_llamada_template: string | null;
  from_email: string | null;
  from_name: string | null;
  reply_to_email: string | null;
  estado: string;
  total_destinatarios: number;
  total_enviados: number;
  total_fallidos: number;
  total_omitidos: number;
  iniciada_en: string | null;
  finalizada_en: string | null;
};

type Prospect = {
  id: string;
  eleam_nombre: string;
  comuna: string | null;
  telefono: string | null;
  email: string | null;
  origen: string | null;
  canal_preferido: string | null;
  digitalizacion_estado: string | null;
  software_actual: string | null;
  dolor_principal: string | null;
  decision_maker_nombre: string | null;
  decision_maker_cargo: string | null;
  cargo_contacto: string | null;
  num_residentes: number | null;
  urgencia: string | null;
  fit_score: number | null;
  proxima_accion_fecha: string | null;
  competidor: string | null;
  estado: string;
  no_contactar: boolean;
  unsubscribe_token: string;
};

type SendResult = {
  prospect_id: string;
  email: string | null;
  status: "enviado" | "fallido" | "omitido";
  resend_id?: string;
  error?: string;
};

function fail(req: Request, code: string, message: string, status = 400) {
  return jsonResponse(req, { ok: false, code, message }, status);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampSubject(value: string): string {
  const trimmed = (value ?? "").trim().slice(0, 200);
  return trimmed || "FichaEleam para tu ELEAM";
}

function clampError(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value ?? "");
  return text.trim().slice(0, 1000) || "Error desconocido";
}

function composeFromAddress(campaign: Campaign): string {
  const fromName = campaign.from_name?.trim();
  const fromEmail = campaign.from_email?.trim();
  if (fromName && fromEmail) return `${fromName} <${fromEmail}>`;
  if (fromEmail) return fromEmail;
  return getCrmFromEmail();
}

function composeReplyTo(campaign: Campaign): string {
  return campaign.reply_to_email?.trim() || getCrmReplyTo();
}

function unsubscribeUrl(token: string): string {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").trim().replace(/\/+$/, "");
  return `${base}/functions/v1/crm-unsubscribe?token=${encodeURIComponent(token)}`;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return fail(req, "method_not_allowed", "Método no permitido", 405);
  }

  // Auth: solo superadmin
  const auth = await getCallerProfile(req);
  if (auth.error || !auth.user || !auth.profile) {
    return fail(req, "unauthenticated", "No autenticado", 401);
  }
  if (auth.profile.rol !== "superadmin") {
    return fail(req, "forbidden", "Solo superadmin puede enviar campañas", 403);
  }

  // Body
  const body = await req.json().catch(() => ({})) as {
    campaign_id?: string;
    prospect_ids?: string[];
  };
  const campaignId = String(body.campaign_id ?? "").trim();
  if (!UUID_RE.test(campaignId)) {
    return fail(req, "validation_error", "campaign_id inválido", 400);
  }
  const prospectIds = Array.isArray(body.prospect_ids) ? body.prospect_ids : [];
  if (prospectIds.length === 0) {
    return fail(req, "validation_error", "prospect_ids vacío", 400);
  }
  if (prospectIds.length > MAX_BATCH) {
    return fail(req, "validation_error", `Máximo ${MAX_BATCH} destinatarios por lote`, 400);
  }
  if (!prospectIds.every((id) => typeof id === "string" && UUID_RE.test(id))) {
    return fail(req, "validation_error", "prospect_ids contiene UUID inválido", 400);
  }

  const sb = adminClient();

  // Campaign
  const { data: campaign, error: campErr } = await sb
    .from("crm_email_campaigns")
    .select("id, nombre, asunto_default, cuerpo_default, mensaje_rrss_template, script_llamada_template, from_email, from_name, reply_to_email, estado, total_destinatarios, total_enviados, total_fallidos, total_omitidos, iniciada_en, finalizada_en")
    .eq("id", campaignId)
    .maybeSingle();
  if (campErr || !campaign) {
    return fail(req, "not_found", "Campaña no encontrada", 404);
  }
  if (!["borrador", "enviando", "enviada", "fallida"].includes(campaign.estado)) {
    return fail(req, "invalid_state", `La campaña está en estado "${campaign.estado}" y no se puede enviar`, 409);
  }
  const unknownVariables = findUnknownCrmTemplateVariables(
    campaign.asunto_default,
    campaign.cuerpo_default,
    campaign.mensaje_rrss_template,
    campaign.script_llamada_template,
  );
  if (unknownVariables.length > 0) {
    return fail(req, "validation_error", `La campaña usa variables no permitidas: ${unknownVariables.map((v) => `{{${v}}}`).join(", ")}`, 400);
  }

  // Marcar como enviando si no lo estaba
  if (campaign.estado !== "enviando") {
    await sb.from("crm_email_campaigns")
      .update({
        estado: "enviando",
        iniciada_en: campaign.iniciada_en ?? new Date().toISOString(),
      })
      .eq("id", campaignId);
  }

  // Prospects
  const { data: prospects, error: pErr } = await sb
    .from("crm_prospects")
    .select("id, eleam_nombre, comuna, telefono, email, origen, canal_preferido, digitalizacion_estado, software_actual, dolor_principal, decision_maker_nombre, decision_maker_cargo, cargo_contacto, num_residentes, urgencia, fit_score, proxima_accion_fecha, competidor, estado, no_contactar, unsubscribe_token")
    .in("id", prospectIds);
  if (pErr) {
    console.error("send-crm-email-campaign read prospects", pErr);
    return fail(req, "db_error", "No se pudieron leer los prospectos", 500);
  }
  const byId = new Map<string, Prospect>((prospects ?? []).map((p) => [p.id as string, p as Prospect]));

  const fromAddr = composeFromAddress(campaign as Campaign);
  const replyTo = composeReplyTo(campaign as Campaign);

  const results: SendResult[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const prospectId of prospectIds) {
    const prospect = byId.get(prospectId);
    if (!prospect) {
      skipped++;
      results.push({ prospect_id: prospectId, email: null, status: "omitido", error: "Prospecto no encontrado" });
      await upsertSend(sb, campaignId, prospectId, "", clampSubject(campaign.asunto_default), "omitido", { errorMessage: "Prospecto no encontrado" });
      continue;
    }

    const email = (prospect.email ?? "").trim().toLowerCase();
    const asunto = clampSubject(renderCrmTemplate(campaign.asunto_default, prospect, campaign.asunto_default));

    if (prospect.no_contactar) {
      skipped++;
      results.push({ prospect_id: prospectId, email: email || null, status: "omitido", error: "Marcado no_contactar" });
      await upsertSend(sb, campaignId, prospectId, email, asunto, "omitido", { errorMessage: "Marcado no_contactar" });
      await updateCampaignMember(sb, campaignId, prospectId, "no_contactar");
      continue;
    }
    if (!email || !EMAIL_RE.test(email)) {
      skipped++;
      results.push({ prospect_id: prospectId, email: email || null, status: "omitido", error: "Email inválido o ausente" });
      await upsertSend(sb, campaignId, prospectId, email, asunto, "omitido", { errorMessage: "Email inválido o ausente" });
      await updateCampaignMember(sb, campaignId, prospectId, "seleccionado");
      continue;
    }

    const html = buildCrmProspectingEmail({
      prospect: {
        eleam_nombre: prospect.eleam_nombre,
        comuna: prospect.comuna,
        telefono: prospect.telefono,
        email: prospect.email,
        origen: prospect.origen,
        canal_preferido: prospect.canal_preferido,
        digitalizacion_estado: prospect.digitalizacion_estado,
        software_actual: prospect.software_actual,
        dolor_principal: prospect.dolor_principal,
        decision_maker_nombre: prospect.decision_maker_nombre,
        decision_maker_cargo: prospect.decision_maker_cargo,
        cargo_contacto: prospect.cargo_contacto,
        num_residentes: prospect.num_residentes,
        urgencia: prospect.urgencia,
        fit_score: prospect.fit_score,
        proxima_accion_fecha: prospect.proxima_accion_fecha,
        competidor: prospect.competidor,
      },
      campaign: { cuerpo_default: campaign.cuerpo_default },
      unsubscribeUrl: unsubscribeUrl(prospect.unsubscribe_token),
    });

    let resendId: string | undefined;
    let errorMessage: string | undefined;
    try {
      const result = await sendEmail({
        to: email,
        subject: asunto,
        html,
        from: fromAddr,
        replyTo,
      });
      if (result.sent) {
        resendId = result.providerMessageId;
        sent++;
        results.push({ prospect_id: prospectId, email, status: "enviado", resend_id: resendId });
        await upsertSend(sb, campaignId, prospectId, email, asunto, "enviado", { resendId, enviadoEn: new Date().toISOString() });
        // Toca ultimo_email_enviado_en para el prospecto.
        const now = new Date().toISOString();
        const prospectUpdate: Record<string, unknown> = { ultimo_email_enviado_en: now, ultimo_contacto_en: now };
        if (["nuevo", "investigacion", "contactar"].includes(prospect.estado)) {
          prospectUpdate.estado = "contactado";
        }
        await sb.from("crm_prospects").update(prospectUpdate).eq("id", prospectId);
        await updateCampaignMember(sb, campaignId, prospectId, "contactado");
      } else {
        errorMessage = clampError(result.error ?? "Resend no envió el correo");
        failed++;
        results.push({ prospect_id: prospectId, email, status: "fallido", error: errorMessage });
        await upsertSend(sb, campaignId, prospectId, email, asunto, "fallido", { errorMessage });
        await updateCampaignMember(sb, campaignId, prospectId, "seleccionado");
      }
    } catch (err) {
      errorMessage = clampError(err);
      failed++;
      results.push({ prospect_id: prospectId, email, status: "fallido", error: errorMessage });
      await upsertSend(sb, campaignId, prospectId, email, asunto, "fallido", { errorMessage });
      await updateCampaignMember(sb, campaignId, prospectId, "seleccionado");
    }

    // Rate limit Resend (~100/s). Pequeño respiro entre envíos.
    if (prospectId !== prospectIds[prospectIds.length - 1]) {
      await sleep(INTER_SEND_DELAY_MS);
    }
  }

  // Totales por estado (lectura desde sends para reflejar realidad).
  const { data: counts } = await sb
    .from("crm_email_sends")
    .select("estado")
    .eq("campaign_id", campaignId);
  const totalEnviados = (counts ?? []).filter((s) => s.estado === "enviado").length;
  const totalFallidos = (counts ?? []).filter((s) => s.estado === "fallido").length;
  const totalOmitidos = (counts ?? []).filter((s) => s.estado === "omitido" || s.estado === "baja").length;
  const totalDestinatarios = (counts ?? []).length;

  // Estado final de la campaña: si todos los enviados fueron fallidos, marca fallida.
  // Si hubo al menos uno enviado o todos omitidos, marca enviada.
  const finalEstado = totalEnviados === 0 && totalFallidos > 0
    ? "fallida"
    : "enviada";

  await sb.from("crm_email_campaigns")
    .update({
      estado: finalEstado,
      total_destinatarios: totalDestinatarios,
      total_enviados: totalEnviados,
      total_fallidos: totalFallidos,
      total_omitidos: totalOmitidos,
      finalizada_en: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return jsonResponse(req, {
    ok: true,
    campaign_id: campaignId,
    sent,
    failed,
    skipped,
    results,
  });
});

// Upsert idempotente por (campaign_id, prospect_id). Si ya hay un send
// previo para ese par, lo sobreescribe — esto soporta reintentos.
async function upsertSend(
  sb: ReturnType<typeof adminClient>,
  campaignId: string,
  prospectId: string,
  email: string,
  asunto: string,
  estado: "enviado" | "fallido" | "omitido",
  extra: { resendId?: string; errorMessage?: string; enviadoEn?: string } = {},
) {
  const row = {
    campaign_id: campaignId,
    prospect_id: prospectId,
    email,
    asunto_final: asunto,
    estado,
    resend_id: extra.resendId ?? null,
    error_mensaje: extra.errorMessage ?? null,
    enviado_en: extra.enviadoEn ?? null,
  };
  const { error } = await sb
    .from("crm_email_sends")
    .upsert(row, { onConflict: "campaign_id,prospect_id" });
  if (error) {
    console.error("upsertSend error", { campaignId, prospectId, estado, error });
  }
}

async function updateCampaignMember(
  sb: ReturnType<typeof adminClient>,
  campaignId: string,
  prospectId: string,
  estado: "seleccionado" | "contactado" | "no_contactar",
) {
  const { error } = await sb
    .from("crm_campaign_members")
    .upsert({
      campaign_id: campaignId,
      prospect_id: prospectId,
      estado,
      canal: "email",
      ultimo_toque_en: new Date().toISOString(),
    }, { onConflict: "campaign_id,prospect_id" });
  if (error) {
    console.error("updateCampaignMember error", { campaignId, prospectId, estado, error });
  }
}
