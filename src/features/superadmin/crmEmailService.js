import { supabase } from "../../services/supabaseConfig";
import { throwEdgeFunctionError } from "../../services/edgeFunctionErrors";

// Patrón:
//  • Toda la I/O para CRM email (listas, prospectos, campañas, sends)
//    pasa por aquí. Las páginas solo conocen los nombres de las funciones.
//  • RLS valida que solo superadmin acceda a estas tablas.
//  • El envío real va por la Edge Function `send-crm-email-campaign`
//    para garantizar autenticación, rate limit y trazabilidad.

const LIST_SELECT = `
  id, nombre, descripcion, origen, creado_por, creado_en, actualizado_en
`;

const PROSPECT_SELECT = `
  id, list_id, demo_lead_id, eleam_id, eleam_nombre, comuna, telefono, email,
  facebook_url, instagram_url, tiktok_url,
  origen, canal_preferido, cargo_contacto,
  decision_maker_nombre, decision_maker_cargo, num_residentes,
  digitalizacion_estado, software_actual, dolor_principal, urgencia,
  fit_score, valor_estimado_clp, probabilidad_cierre,
  proxima_accion_fecha, motivo_perdida, competidor,
  estado, no_contactar, unsubscribe_token, notas,
  ultimo_email_enviado_en, ultimo_contacto_en, creado_por, creado_en, actualizado_en
`;

const CAMPAIGN_SELECT = `
  id, nombre, objetivo, audiencia_notas, asunto_default, cuerpo_default,
  mensaje_rrss_template, script_llamada_template, variables_usadas,
  from_email, from_name, reply_to_email, estado,
  total_destinatarios, total_enviados, total_fallidos, total_omitidos,
  iniciada_en, finalizada_en, creado_por, creado_en, actualizado_en
`;

const SEND_SELECT = `
  id, campaign_id, prospect_id, email, asunto_final, estado,
  resend_id, error_mensaje, enviado_en, creado_en
`;

const CAMPAIGN_MEMBER_SELECT = `
  id, campaign_id, prospect_id, estado, canal, ultimo_toque_en,
  proxima_accion_fecha, notas, creado_en, actualizado_en
`;

const STAGE_HISTORY_SELECT = `
  id, prospect_id, etapa_anterior, etapa_nueva, detalle, cambiado_por, cambiado_en
`;

const PROSPECT_INTERACTION_SELECT = `
  id, eleam_id, prospect_id, campaign_id, tipo, canal, resumen, resultado,
  proxima_accion, creado_por, creado_en
`;

const PROSPECT_TASK_SELECT = `
  id, eleam_id, prospect_id, campaign_id, titulo, descripcion, tipo, estado,
  prioridad, fecha_vencimiento, creado_por, completado_por,
  creado_en, completado_en, actualizado_en
`;

const PROSPECT_WRITE_COLUMNS = new Set([
  "list_id",
  "demo_lead_id",
  "eleam_id",
  "eleam_nombre",
  "comuna",
  "telefono",
  "email",
  "facebook_url",
  "instagram_url",
  "tiktok_url",
  "origen",
  "canal_preferido",
  "cargo_contacto",
  "decision_maker_nombre",
  "decision_maker_cargo",
  "num_residentes",
  "digitalizacion_estado",
  "software_actual",
  "dolor_principal",
  "urgencia",
  "fit_score",
  "valor_estimado_clp",
  "probabilidad_cierre",
  "proxima_accion_fecha",
  "motivo_perdida",
  "competidor",
  "estado",
  "no_contactar",
  "notas",
  "ultimo_email_enviado_en",
  "ultimo_contacto_en",
  "creado_por",
]);

const PROSPECT_UUID_COLUMNS = new Set(["list_id", "demo_lead_id", "eleam_id", "creado_por"]);
const PROSPECT_DATE_COLUMNS = new Set(["proxima_accion_fecha", "ultimo_email_enviado_en", "ultimo_contacto_en"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─────────────────────────────────────────────────────────────
// Listas de prospectos
// ─────────────────────────────────────────────────────────────

export async function getProspectLists() {
  const { data, error } = await supabase
    .from("crm_prospect_lists")
    .select(LIST_SELECT)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProspectList({ nombre, descripcion = null, origen = "manual" }) {
  const { data, error } = await supabase
    .from("crm_prospect_lists")
    .insert({ nombre, descripcion, origen })
    .select(LIST_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProspectList(id, payload) {
  const { data, error } = await supabase
    .from("crm_prospect_lists")
    .update(payload)
    .eq("id", id)
    .select(LIST_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProspectList(id) {
  const { error } = await supabase
    .from("crm_prospect_lists")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// Prospectos
// ─────────────────────────────────────────────────────────────

export async function getProspects({
  listId = null,
  search = "",
  estado = null,
  includeNoContactar = true,
  limit = 500,
} = {}) {
  let q = supabase
    .from("crm_prospects")
    .select(PROSPECT_SELECT)
    .order("creado_en", { ascending: false })
    .limit(limit);

  if (listId) q = q.eq("list_id", listId);
  if (estado) q = q.eq("estado", estado);
  if (!includeNoContactar) q = q.eq("no_contactar", false);

  const term = search.trim();
  if (term) {
    q = q.or(
      `eleam_nombre.ilike.%${term}%,email.ilike.%${term}%,comuna.ilike.%${term}%,software_actual.ilike.%${term}%,dolor_principal.ilike.%${term}%`,
    );
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getProspectById(id) {
  const { data, error } = await supabase
    .from("crm_prospects")
    .select(PROSPECT_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProspect(payload) {
  const { data, error } = await supabase
    .from("crm_prospects")
    .insert(normalizeProspectWrite(payload))
    .select(PROSPECT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProspect(id, payload) {
  const { data, error } = await supabase
    .from("crm_prospects")
    .update(normalizeProspectWrite(payload))
    .eq("id", id)
    .select(PROSPECT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

function applyProspectStateConsistency(payload) {
  if (!payload) return payload;
  if (payload.estado === "no_contactar") {
    return { ...payload, no_contactar: true };
  }
  if (payload.no_contactar === true && payload.estado !== "no_contactar") {
    return { ...payload, no_contactar: false };
  }
  return payload;
}

export function sanitizeProspectWritePayload(payload, { listId } = {}) {
  if (!payload) return payload;
  const source = payload.payload ?? payload;
  const out = {};

  for (const [key, value] of Object.entries(source)) {
    if (!PROSPECT_WRITE_COLUMNS.has(key)) continue;
    out[key] = sanitizeProspectValue(key, value);
  }

  if (listId !== undefined) {
    out.list_id = sanitizeProspectValue("list_id", listId);
  }

  return applyProspectStateConsistency(out);
}

function sanitizeProspectValue(key, value) {
  if (value === undefined || value === "") return null;

  if (PROSPECT_UUID_COLUMNS.has(key)) {
    const text = String(value ?? "").trim();
    return UUID_RE.test(text) ? text : null;
  }

  if (PROSPECT_DATE_COLUMNS.has(key)) {
    return normalizeProspectDate(value);
  }

  return value;
}

function normalizeProspectDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function normalizeProspectWrite(payload) {
  return sanitizeProspectWritePayload(payload);
}

export async function deleteProspect(id) {
  const { error } = await supabase
    .from("crm_prospects")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function setProspectNoContactar(id, value) {
  const update = {
    no_contactar: value,
    estado: value ? "no_contactar" : "nuevo",
  };
  const { data, error } = await supabase
    .from("crm_prospects")
    .update(update)
    .eq("id", id)
    .select(PROSPECT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function getProspectTimeline(prospectId) {
  if (!prospectId) return { interactions: [], tasks: [], stageHistory: [], campaignMembers: [] };
  const [interactionsRes, tasksRes, stagesRes, membersRes] = await Promise.all([
    supabase
      .from("crm_interactions")
      .select(`${PROSPECT_INTERACTION_SELECT}, autor:profiles!crm_interactions_creado_por_fkey(id, nombre)`)
      .eq("prospect_id", prospectId)
      .order("creado_en", { ascending: false })
      .limit(80),
    supabase
      .from("crm_tasks")
      .select(`${PROSPECT_TASK_SELECT}, autor:profiles!crm_tasks_creado_por_fkey(id, nombre)`)
      .eq("prospect_id", prospectId)
      .order("fecha_vencimiento", { ascending: true, nullsFirst: false })
      .order("creado_en", { ascending: false })
      .limit(80),
    supabase
      .from("crm_stage_history")
      .select(STAGE_HISTORY_SELECT)
      .eq("prospect_id", prospectId)
      .order("cambiado_en", { ascending: false })
      .limit(80),
    supabase
      .from("crm_campaign_members")
      .select(`${CAMPAIGN_MEMBER_SELECT}, campaign:crm_email_campaigns(id, nombre, estado)`)
      .eq("prospect_id", prospectId)
      .order("creado_en", { ascending: false })
      .limit(80),
  ]);
  for (const res of [interactionsRes, tasksRes, stagesRes, membersRes]) {
    if (res.error) throw res.error;
  }
  return {
    interactions: interactionsRes.data ?? [],
    tasks: tasksRes.data ?? [],
    stageHistory: stagesRes.data ?? [],
    campaignMembers: membersRes.data ?? [],
  };
}

export async function createProspectInteraction(payload) {
  if (!payload.prospect_id) throw new Error("Prospecto requerido.");
  if (!payload.resumen?.trim()) throw new Error("El resumen es obligatorio.");
  const { data: { user } } = await supabase.auth.getUser();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("crm_interactions")
    .insert({
      eleam_id: payload.eleam_id || null,
      prospect_id: payload.prospect_id,
      campaign_id: payload.campaign_id || null,
      tipo: payload.tipo ?? "nota",
      canal: payload.canal ?? null,
      resumen: payload.resumen.trim(),
      resultado: payload.resultado ?? null,
      proxima_accion: payload.proxima_accion?.trim() || null,
      creado_por: user?.id ?? null,
    })
    .select(PROSPECT_INTERACTION_SELECT)
    .single();
  if (error) throw error;

  await supabase
    .from("crm_prospects")
    .update({ ultimo_contacto_en: now })
    .eq("id", payload.prospect_id);

  return data;
}

export async function createProspectTask(payload) {
  if (!payload.prospect_id) throw new Error("Prospecto requerido.");
  if (!payload.titulo?.trim()) throw new Error("El título es obligatorio.");
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("crm_tasks")
    .insert({
      eleam_id: payload.eleam_id || null,
      prospect_id: payload.prospect_id,
      campaign_id: payload.campaign_id || null,
      titulo: payload.titulo.trim(),
      descripcion: payload.descripcion?.trim() || null,
      tipo: payload.tipo ?? "seguimiento",
      prioridad: payload.prioridad ?? "media",
      fecha_vencimiento: payload.fecha_vencimiento || null,
      creado_por: user?.id ?? null,
    })
    .select(PROSPECT_TASK_SELECT)
    .single();
  if (error) throw error;
  return data;
}

// Inserción masiva por chunks. Si una fila viola el unique de email, la
// devuelve en `duplicates`. El resto se inserta normalmente.
const INSERT_CHUNK = 100;

export async function bulkInsertProspects(listId, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { inserted: 0, duplicates: [], errors: [] };
  }
  const inserted = [];
  const duplicates = [];
  const errors = [];
  const normalizedRows = rows
    .map((item, index) => ({
      rowNumber: item?.rowNumber ?? index + 2,
      label: item?.label,
      payload: sanitizeProspectWritePayload(item?.payload ?? item, { listId }),
    }))
    .filter((row) => row.payload && Object.keys(row.payload).length > 0);

  // Insertar uno a uno permite detectar duplicado vs error real.
  // Para listas chicas (≤500) esto está bien; el costo es bajo.
  for (let i = 0; i < normalizedRows.length; i += INSERT_CHUNK) {
    const chunk = normalizedRows.slice(i, i + INSERT_CHUNK);
    for (const row of chunk) {
      try {
        const { data, error } = await supabase
          .from("crm_prospects")
          .insert(row.payload)
          .select("id, email")
          .single();
        if (error) {
          // 23505 = unique_violation (email duplicado)
          if (error.code === "23505") {
            duplicates.push({
              rowNumber: row.rowNumber,
              label: row.label,
              email: row.payload.email,
              eleam_nombre: row.payload.eleam_nombre,
            });
          } else {
            errors.push({
              rowNumber: row.rowNumber,
              label: row.label,
              row: row.payload,
              message: humanizeProspectInsertError(error),
            });
          }
        } else {
          inserted.push(data);
        }
      } catch (err) {
        errors.push({
          rowNumber: row.rowNumber,
          label: row.label,
          row: row.payload,
          message: humanizeProspectInsertError(err),
        });
      }
    }
  }
  return { inserted: inserted.length, duplicates, errors };
}

function humanizeProspectInsertError(error) {
  const message = error?.message || String(error);
  const details = error?.details || "";
  const code = error?.code || "";

  if (code === "23505" || /duplicate key/i.test(message)) {
    return "Ya existe un prospecto con ese correo en la base.";
  }
  if (code === "22P02" && /json/i.test(`${message} ${details}`)) {
    return "La base de datos rechazó un valor como JSON. Ejecuta nuevamente supabase_schema.sql: el bloque CRM reconstruye crm_prospects con columnas de texto para notas, dolor, software y URLs.";
  }
  if (/violates check constraint/i.test(message)) {
    return `Valor fuera del contrato de CRM: ${message}`;
  }
  if (/invalid input syntax/i.test(message)) {
    return `Valor inválido para el tipo de dato de CRM: ${message}`;
  }
  return message;
}

// ─────────────────────────────────────────────────────────────
// Campañas
// ─────────────────────────────────────────────────────────────

export async function getEmailCampaigns({ estado = null, limit = 100 } = {}) {
  let q = supabase
    .from("crm_email_campaigns")
    .select(CAMPAIGN_SELECT)
    .order("creado_en", { ascending: false })
    .limit(limit);
  if (estado) q = q.eq("estado", estado);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getEmailCampaign(id) {
  const { data, error } = await supabase
    .from("crm_email_campaigns")
    .select(CAMPAIGN_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createEmailCampaign(payload) {
  const { data, error } = await supabase
    .from("crm_email_campaigns")
    .insert(payload)
    .select(CAMPAIGN_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function createCampaignMembers(campaignId, prospectIds) {
  if (!campaignId || !Array.isArray(prospectIds) || prospectIds.length === 0) {
    return { inserted: 0 };
  }
  const rows = prospectIds.map((prospectId) => ({
    campaign_id: campaignId,
    prospect_id: prospectId,
    estado: "seleccionado",
  }));
  const { data, error } = await supabase
    .from("crm_campaign_members")
    .upsert(rows, { onConflict: "campaign_id,prospect_id", ignoreDuplicates: false })
    .select("id");
  if (error) throw error;
  return { inserted: data?.length ?? 0 };
}

export async function updateEmailCampaign(id, payload) {
  const { data, error } = await supabase
    .from("crm_email_campaigns")
    .update(payload)
    .eq("id", id)
    .select(CAMPAIGN_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEmailCampaign(id) {
  // Solo se permite eliminar borradores (validar en UI también).
  const { error } = await supabase
    .from("crm_email_campaigns")
    .delete()
    .eq("id", id)
    .eq("estado", "borrador");
  if (error) throw error;
}

export async function getCampaignSends(campaignId) {
  const { data, error } = await supabase
    .from("crm_email_sends")
    .select(`${SEND_SELECT}, prospect:crm_prospects(id, eleam_nombre, comuna, estado, digitalizacion_estado)`)
    .eq("campaign_id", campaignId)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCampaignMembers(campaignId) {
  const { data, error } = await supabase
    .from("crm_campaign_members")
    .select(`${CAMPAIGN_MEMBER_SELECT}, prospect:crm_prospects(id, eleam_nombre, comuna, email, telefono, estado, digitalizacion_estado, dolor_principal)`)
    .eq("campaign_id", campaignId)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// Envío vía Edge Function (lote máx 50)
// ─────────────────────────────────────────────────────────────

export const SEND_BATCH_MAX = 50;

export async function sendCampaignBatch(campaignId, prospectIds) {
  if (!campaignId) throw new Error("campaignId requerido");
  if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
    throw new Error("prospectIds vacío");
  }
  if (prospectIds.length > SEND_BATCH_MAX) {
    throw new Error(`El lote no puede exceder ${SEND_BATCH_MAX} destinatarios`);
  }
  const { data, error } = await supabase.functions.invoke("send-crm-email-campaign", {
    body: { campaign_id: campaignId, prospect_ids: prospectIds },
  });
  if (error) await throwEdgeFunctionError(error, "Error al enviar campaña");
  if (data?.ok === false || data?.error) {
    const normalized = new Error(data.message || data.error || "No se pudo enviar la campaña.");
    normalized.code = data.code || "campaign_send_error";
    throw normalized;
  }
  return data;
}
