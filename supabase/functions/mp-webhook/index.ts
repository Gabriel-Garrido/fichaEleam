// POST /functions/v1/mp-webhook
//
// Endpoint público que recibe notificaciones de MercadoPago.
//
// Pasos de seguridad (en orden):
//   1. Extraer x-signature, x-request-id y data.id (query).
//   2. Verificar firma HMAC SHA-256 del manifest oficial.
//      Si falla → 401 (NO procesa).
//   3. Insertar evento en mp_webhook_events (idempotente vía mp_request_id).
//      Si ya existe → 200 OK (sin reprocesar).
//   4. Re-fetch del recurso vía API MP (no confiar en el body).
//   5. Validar external_reference contra la tabla eleams.
//   6. Actualizar estado del ELEAM y/o registrar el pago.
//
// Devuelve siempre 200/2xx en el camino feliz para evitar reintentos
// agresivos de MP. Solo devuelve 4xx/5xx si la firma es inválida o
// si hay error de programación (no por errores de negocio).

import { adminClient } from "../_shared/supabase.ts";
import {
  verifyWebhookSignature,
  getPreapproval,
  getAuthorizedPayment,
} from "../_shared/mercadopago.ts";

function jsonOk(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS no aplica: MP postea server-to-server.
  if (req.method !== "POST") {
    return jsonOk({ error: "method-not-allowed" }, 405);
  }

  const url = new URL(req.url);
  const queryDataId =
    url.searchParams.get("data.id") ??
    url.searchParams.get("id") ??
    null;
  const queryType =
    url.searchParams.get("type") ??
    url.searchParams.get("topic") ??
    null;

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  // Body (puede ser vacío en algunos modos legacy)
  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch (_) { bodyText = ""; }

  let body: Record<string, unknown> = {};
  if (bodyText) {
    try { body = JSON.parse(bodyText); } catch (_) { body = {}; }
  }

  const dataId =
    queryDataId ??
    (typeof body?.data === "object" && body.data !== null
      ? String((body.data as Record<string, unknown>).id ?? "")
      : "") ??
    "";
  const topic =
    queryType ??
    (typeof body?.type === "string" ? (body.type as string) : "") ??
    "";

  // 1. Verificar firma. Si falta MP_WEBHOOK_SECRET o falla → 401.
  const sig = await verifyWebhookSignature({
    signature: xSignature,
    requestId: xRequestId,
    dataId,
  });

  // 2. Audit log idempotente
  const sb = adminClient();
  const eventInsert = await sb
    .from("mp_webhook_events")
    .insert({
      mp_request_id: xRequestId,
      topic,
      data_id: dataId,
      action: typeof body?.action === "string" ? body.action : null,
      payload: body,
      signature_ok: sig.ok,
    })
    .select("id")
    .maybeSingle();

  // Si el insert duplicó por unique(mp_request_id) significa retry → ya procesado.
  if (eventInsert.error && /duplicate|unique/i.test(eventInsert.error.message)) {
    return jsonOk({ ok: true, deduped: true });
  }

  if (!sig.ok) {
    console.warn("mp-webhook signature invalid", sig.reason);
    return jsonOk({ error: "invalid-signature", reason: sig.reason }, 401);
  }

  // Si no hay data.id útil, simplemente acusamos recibo.
  if (!dataId) {
    await sb.from("mp_webhook_events")
      .update({ processed_ok: true, procesado_en: new Date().toISOString() })
      .eq("id", eventInsert.data?.id);
    return jsonOk({ ok: true, ignored: "no data.id" });
  }

  try {
    if (topic === "preapproval" || topic === "subscription_preapproval") {
      await handlePreapproval(sb, dataId);
    } else if (
      topic === "subscription_authorized_payment" ||
      topic === "authorized_payment"
    ) {
      await handleAuthorizedPayment(sb, dataId);
    } else {
      // payments y otros: ignorar por ahora (registrado en mp_webhook_events)
    }

    if (eventInsert.data?.id) {
      await sb.from("mp_webhook_events")
        .update({ processed_ok: true, procesado_en: new Date().toISOString() })
        .eq("id", eventInsert.data.id);
    }

    return jsonOk({ ok: true });
  } catch (e) {
    const msg = String(e?.message ?? e);
    console.error("mp-webhook handler error", msg);
    if (eventInsert.data?.id) {
      await sb.from("mp_webhook_events")
        .update({
          error: msg.slice(0, 1000),
          procesado_en: new Date().toISOString(),
        })
        .eq("id", eventInsert.data.id);
    }
    // Devolver 200 para no entrar en reintento infinito de MP — el evento
    // queda registrado con error y el superadmin puede investigarlo.
    return jsonOk({ ok: false, error: msg }, 200);
  }
});

// ─────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────

type Sb = ReturnType<typeof adminClient>;

async function handlePreapproval(sb: Sb, dataId: string) {
  const pre = await getPreapproval(dataId);
  const externalRef = pre.external_reference ?? "";
  if (!externalRef) {
    throw new Error("preapproval sin external_reference");
  }

  // Confirmar que existe ELEAM con ese external_reference
  const { data: eleam, error: eleamErr } = await sb
    .from("eleams")
    .select("id, mp_preapproval_id, plan_id, subscription_status")
    .eq("id", externalRef)
    .maybeSingle();
  if (eleamErr) throw eleamErr;
  if (!eleam) throw new Error(`ELEAM no encontrado para external_reference=${externalRef}`);

  // Si MP devuelve un preapproval_id distinto al guardado → adoptar el de MP
  // (puede pasar si hubo una creación previa que no se registró localmente).
  const status = mapPreapprovalStatus(pre.status);
  const proximo = pre.next_payment_date ? new Date(pre.next_payment_date).toISOString() : null;

  const update: Record<string, unknown> = {
    mp_preapproval_id: pre.id,
    mp_payer_email: pre.payer_email ?? null,
    subscription_status: status,
  };
  if (proximo) update.proximo_cobro_en = proximo;
  if (status === "activo") {
    update.fecha_pago = new Date().toISOString();
    if (proximo) update.fecha_vencimiento_suscripcion = proximo;
  }
  if (status === "cancelado") update.cancelado_en = new Date().toISOString();

  const { error: updErr } = await sb
    .from("eleams")
    .update(update)
    .eq("id", eleam.id);
  if (updErr) throw updErr;
}

async function handleAuthorizedPayment(sb: Sb, dataId: string) {
  const ap = await getAuthorizedPayment(dataId);
  const preapprovalId = String(ap.preapproval_id ?? "");
  if (!preapprovalId) throw new Error("authorized_payment sin preapproval_id");

  const { data: eleam, error: eleamErr } = await sb
    .from("eleams")
    .select("id, plan_id")
    .eq("mp_preapproval_id", preapprovalId)
    .maybeSingle();
  if (eleamErr) throw eleamErr;
  if (!eleam) throw new Error(`ELEAM no encontrado para preapproval_id=${preapprovalId}`);

  const status = String(ap.status ?? "");
  const monto = Math.round(Number(ap.transaction_amount ?? 0));
  const moneda = String(ap.currency_id ?? "CLP");
  const fechaPago = ap.payment_date ?? ap.date_created ?? new Date().toISOString();
  const fechaInicio = (ap.debit_date ?? fechaPago).slice(0, 10);
  const proximo = ap.next_payment_date
    ? new Date(ap.next_payment_date).toISOString()
    : null;

  const estadoPago: "completado" | "fallido" | "pendiente" =
    status === "approved" ? "completado" :
    status === "rejected" ? "fallido"   :
    "pendiente";

  // Upsert de pagos (idempotente por mp_authorized_payment_id)
  const { error: payErr } = await sb
    .from("pagos")
    .upsert({
      eleam_id: eleam.id,
      plan_id: eleam.plan_id,
      monto: monto > 0 ? monto : 1,
      moneda,
      plan: "mensual",
      fecha_pago: fechaPago,
      fecha_inicio: fechaInicio,
      mp_authorized_payment_id: String(ap.id),
      mp_payment_id: ap.payment_id ? String(ap.payment_id) : null,
      mp_preapproval_id: preapprovalId,
      metodo_pago: "mercadopago",
      referencia_externa: ap.payment_id ? String(ap.payment_id) : String(ap.id),
      estado: estadoPago,
      raw: ap as unknown as Record<string, unknown>,
    }, { onConflict: "mp_authorized_payment_id" });
  if (payErr) throw payErr;

  // Refrescar el ELEAM en función del estado del pago
  const update: Record<string, unknown> = {};
  if (estadoPago === "completado") {
    update.subscription_status = "activo";
    update.fecha_pago = fechaPago;
    if (proximo) {
      update.proximo_cobro_en = proximo;
      update.fecha_vencimiento_suscripcion = proximo;
    }
  } else if (estadoPago === "fallido") {
    update.subscription_status = "en_gracia"; // se mantiene activo durante reintentos
  }
  if (Object.keys(update).length > 0) {
    const { error: updErr } = await sb.from("eleams")
      .update(update)
      .eq("id", eleam.id);
    if (updErr) throw updErr;
  }
}

function mapPreapprovalStatus(s?: string): string {
  switch ((s ?? "").toLowerCase()) {
    case "authorized": return "activo";
    case "pending":    return "pendiente";
    case "paused":     return "pausado";
    case "cancelled":
    case "finished":   return "cancelado";
    default:           return "pendiente";
  }
}
