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
  getPayment,
} from "../_shared/mercadopago.ts";
import {
  sendEmail,
  paymentReceiptHtml,
  paymentAdminNotificationHtml,
} from "../_shared/email.ts";

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

  // Body (puede venir vacío según el tipo de notificación de MercadoPago)
  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch (_) { bodyText = ""; }

  let body: Record<string, unknown> = {};
  if (bodyText) {
    try { body = JSON.parse(bodyText); } catch (_) { body = {}; }
  }
  const bodyAction = typeof body?.action === "string" ? body.action : "";
  const bodyType = typeof body?.type === "string" ? body.type as string : "";
  const actionTopic = bodyAction.includes(".") ? bodyAction.split(".")[0] : bodyAction;

  const dataId =
    queryDataId ??
    (typeof body?.data === "object" && body.data !== null
      ? String((body.data as Record<string, unknown>).id ?? "")
      : "") ??
    "";
  const topic = queryType || bodyType || actionTopic || "";

  // 1. Verificar firma antes de tocar la BD. Si falta MP_WEBHOOK_SECRET → 401.
  const sig = await verifyWebhookSignature({
    signature: xSignature,
    requestId: xRequestId,
    dataId,
  });

  if (!sig.ok) {
    console.warn("mp-webhook signature invalid", sig.reason);
    return jsonOk({ error: "invalid-signature", reason: sig.reason }, 401);
  }

  // 2. Audit log idempotente (solo para peticiones con firma válida)
  const sb = adminClient();
  const eventInsert = await sb
    .from("mp_webhook_events")
    .insert({
      mp_request_id: xRequestId,
      topic,
      data_id: dataId,
      action: bodyAction || null,
      payload: body,
      signature_ok: true,
    })
    .select("id")
    .maybeSingle();

  // Si el insert duplicó por unique(mp_request_id) significa retry → ya procesado.
  if (eventInsert.error && /duplicate|unique/i.test(eventInsert.error.message)) {
    return jsonOk({ ok: true, deduped: true });
  }
  if (eventInsert.error) {
    console.error("mp-webhook event insert failed", eventInsert.error);
    return jsonOk({ error: "event-log-failed" }, 500);
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
    } else if (topic === "payment") {
      await handlePayment(sb, dataId);
    } else {
      // otros eventos: ignorar (registrado en mp_webhook_events)
    }

    if (eventInsert.data?.id) {
      await sb.from("mp_webhook_events")
        .update({ processed_ok: true, procesado_en: new Date().toISOString() })
        .eq("id", eventInsert.data.id);
    }

    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
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

type BillingWindow = {
  fechaInicio: string;
  fechaFin: string;
  fechaFinIso: string;
  proximoCobro: string;
};

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function addPlanFrequency(base: Date, frequency: number, frequencyType: string): Date {
  const next = new Date(base);
  const amount = Number.isFinite(frequency) && frequency > 0 ? frequency : 1;
  if (frequencyType === "days") {
    next.setDate(next.getDate() + amount);
  } else {
    next.setMonth(next.getMonth() + amount);
  }
  return next;
}

async function resolveBillingWindow(
  sb: Sb,
  planId: string | null,
  paidAt: string,
  preferredNextIso: string | null,
): Promise<BillingWindow> {
  const start = safeDate(paidAt) ?? new Date();
  let end = safeDate(preferredNextIso);

  if (!end) {
    let frequency = 1;
    let frequencyType = "months";

    if (planId) {
      const { data: plan, error } = await sb
        .from("planes")
        .select("frequency, frequency_type")
        .eq("id", planId)
        .maybeSingle();

      if (error) {
        console.warn("resolveBillingWindow: plan lookup failed", error);
      } else if (plan) {
        frequency = Number(plan.frequency ?? 1);
        frequencyType = String(plan.frequency_type ?? "months");
      }
    }

    end = addPlanFrequency(start, frequency, frequencyType);
  }

  return {
    fechaInicio: start.toISOString().slice(0, 10),
    fechaFin: end.toISOString().slice(0, 10),
    fechaFinIso: end.toISOString(),
    proximoCobro: end.toISOString(),
  };
}

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
    update.plan = "mensual";
    update.crm_estado = "cliente_activo";
    update.fecha_pago = new Date().toISOString();
    if (proximo) {
      update.fecha_vencimiento_suscripcion = proximo;
    } else {
      // Fallback: compute expiry from frequency when MP omits next_payment_date.
      const rec = pre.auto_recurring;
      if (rec) {
        const expiry = new Date();
        if (rec.frequency_type === "days") {
          expiry.setDate(expiry.getDate() + (rec.frequency ?? 1));
        } else {
          expiry.setMonth(expiry.getMonth() + (rec.frequency ?? 1));
        }
        update.fecha_vencimiento_suscripcion = expiry.toISOString();
      }
    }
  }
  if (status === "pendiente") update.crm_estado = "pendiente_pago";
  if (status === "cancelado") {
    update.cancelado_en = new Date().toISOString();
    update.crm_estado = "cliente_riesgo";
  }

  const { error: updErr } = await sb
    .from("eleams")
    .update(update)
    .eq("id", eleam.id);
  if (updErr) throw updErr;

  if (status === "activo") {
    await markDemoLeadConverted(sb, eleam.id);
  }
}

async function handleAuthorizedPayment(sb: Sb, dataId: string) {
  const ap = await getAuthorizedPayment(dataId);
  const preapprovalId = String(ap.preapproval_id ?? "");
  if (!preapprovalId) throw new Error("authorized_payment sin preapproval_id");

  const { data: eleam, error: eleamErr } = await sb
    .from("eleams")
    .select("id, nombre, plan, plan_id")
    .eq("mp_preapproval_id", preapprovalId)
    .maybeSingle();
  if (eleamErr) throw eleamErr;
  if (!eleam) throw new Error(`ELEAM no encontrado para preapproval_id=${preapprovalId}`);

  const status = String(ap.status ?? "");
  const monto = Math.round(Number(ap.transaction_amount ?? 0));
  const moneda = String(ap.currency_id ?? "CLP");
  const fechaPago = ap.payment_date ?? ap.date_created ?? new Date().toISOString();
  const proximo = ap.next_payment_date
    ? new Date(ap.next_payment_date).toISOString()
    : null;
  const billing = await resolveBillingWindow(
    sb,
    eleam.plan_id ?? null,
    ap.debit_date ?? fechaPago,
    proximo,
  );

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
      fecha_inicio: billing.fechaInicio,
      fecha_fin: estadoPago === "completado" ? billing.fechaFin : null,
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
    update.plan = "mensual";
    update.subscription_status = "activo";
    update.crm_estado = "cliente_activo";
    update.fecha_pago = fechaPago;
    update.proximo_cobro_en = billing.proximoCobro;
    update.fecha_vencimiento_suscripcion = billing.fechaFinIso;
  } else if (estadoPago === "fallido") {
    update.subscription_status = eleam.plan === "demo" ? "pendiente" : "en_gracia";
  }
  if (Object.keys(update).length > 0) {
    const { error: updErr } = await sb.from("eleams")
      .update(update)
      .eq("id", eleam.id);
    if (updErr) throw updErr;
  }

  if (estadoPago === "completado") {
    await markDemoLeadConverted(sb, eleam.id);
    try {
      await sendPaymentEmails(sb, eleam.id, {
        eleamNombre: String(eleam.nombre ?? eleam.id),
        planId: eleam.plan_id ?? null,
        monto,
        moneda,
        fechaPago,
        authorizedPaymentId: String(ap.id),
        preapprovalId,
        proximoCobro: billing.proximoCobro,
      });
    } catch (emailErr) {
      console.error("mp-webhook: sendPaymentEmails failed", emailErr);
    }
  }
}

async function handlePayment(sb: Sb, dataId: string) {
  const payment = await getPayment(dataId);

  // El external_reference del preapproval es el eleam.id
  const externalRef = String(payment.external_reference ?? "").trim();
  if (!externalRef) {
    throw new Error(`payment sin external_reference id=${dataId}`);
  }

  const { data: eleam, error: eleamErr } = await sb
    .from("eleams")
    .select("id, nombre, plan, plan_id, mp_preapproval_id, subscription_status, fecha_vencimiento_suscripcion")
    .eq("id", externalRef)
    .maybeSingle();
  if (eleamErr) throw eleamErr;
  if (!eleam) {
    throw new Error(`ELEAM no encontrado para payment.external_reference=${externalRef}`);
  }

  const estadoPago = mapPaymentStatus(String(payment.status ?? ""));
  const monto = Math.round(Number(payment.transaction_amount ?? 0));
  const moneda = String(payment.currency_id ?? "CLP");
  const fechaPago = String(payment.date_approved ?? payment.date_created ?? new Date().toISOString());
  const billing = await resolveBillingWindow(sb, eleam.plan_id ?? null, fechaPago, null);
  const preapprovalId =
    String(payment.preapproval_id ?? "").trim() ||
    String((payment.metadata as Record<string, unknown> | undefined)?.preapproval_id ?? "").trim() ||
    String(eleam.mp_preapproval_id ?? "").trim();

  const { data: existingPago, error: existingPagoErr } = await sb
    .from("pagos")
    .select("id")
    .eq("mp_payment_id", String(payment.id))
    .maybeSingle();
  if (existingPagoErr) throw existingPagoErr;

  const { error: payErr } = await sb
    .from("pagos")
    .upsert({
      eleam_id: eleam.id,
      plan_id: eleam.plan_id,
      monto: monto > 0 ? monto : 1,
      moneda,
      plan: "mensual",
      fecha_pago: fechaPago,
      fecha_inicio: billing.fechaInicio,
      fecha_fin: estadoPago === "completado" ? billing.fechaFin : null,
      mp_payment_id: String(payment.id),
      mp_preapproval_id: preapprovalId || null,
      metodo_pago: "mercadopago",
      referencia_externa: String(payment.id),
      estado: estadoPago,
      raw: payment as unknown as Record<string, unknown>,
    }, { onConflict: "mp_payment_id" });
  if (payErr) throw payErr;

  if (estadoPago !== "completado") {
    await releasePendingCheckoutAfterFailedPayment(sb, eleam, estadoPago);
    return;
  }

  const update: Record<string, unknown> = {
    plan: "mensual",
    subscription_status: "activo",
    crm_estado: "cliente_activo",
    fecha_pago: fechaPago,
    fecha_vencimiento_suscripcion: billing.fechaFinIso,
    proximo_cobro_en: billing.proximoCobro,
  };
  if (preapprovalId) update.mp_preapproval_id = preapprovalId;

  const { error: updErr } = await sb.from("eleams").update(update).eq("id", eleam.id);
  if (updErr) throw updErr;

  await markDemoLeadConverted(sb, eleam.id);

  if (!existingPago) {
    try {
      await sendPaymentEmails(sb, eleam.id, {
        eleamNombre: String(eleam.nombre ?? eleam.id),
        planId: eleam.plan_id ?? null,
        monto,
        moneda,
        fechaPago,
        authorizedPaymentId: String(payment.id),
        preapprovalId,
        proximoCobro: billing.proximoCobro,
      });
    } catch (emailErr) {
      console.error("mp-webhook handlePayment: sendPaymentEmails", emailErr);
    }
  }
}

async function releasePendingCheckoutAfterFailedPayment(
  sb: Sb,
  eleam: {
    id: string;
    plan: string | null;
    subscription_status: string | null;
    fecha_vencimiento_suscripcion: string | null;
  },
  estadoPago: "completado" | "fallido" | "pendiente" | "reembolsado",
) {
  if (estadoPago !== "fallido" && estadoPago !== "reembolsado") return;
  if (eleam.subscription_status !== "pendiente") return;

  const demoStillValid = eleam.plan === "demo" &&
    eleam.fecha_vencimiento_suscripcion !== null &&
    new Date(eleam.fecha_vencimiento_suscripcion).getTime() > Date.now();

  const update: Record<string, unknown> = {
    mp_preapproval_id: null,
    mp_payer_email: null,
    plan_id: null,
    proximo_cobro_en: null,
    cancelado_en: null,
    crm_estado: demoStillValid ? "prueba" : "pendiente_pago",
  };

  if (!demoStillValid) {
    update.subscription_status = "inactivo";
  }

  const { error } = await sb.from("eleams").update(update).eq("id", eleam.id);
  if (error) throw error;
}

async function sendPaymentEmails(
  sb: Sb,
  eleamId: string,
  opts: {
    eleamNombre: string;
    planId: string | null;
    monto: number;
    moneda: string;
    fechaPago: string;
    authorizedPaymentId: string;
    preapprovalId: string;
    proximoCobro: string | null;
  },
): Promise<void> {
  const [adminRes, planRes, superadminsRes] = await Promise.all([
    sb.from("profiles")
      .select("nombre, email")
      .eq("eleam_id", eleamId)
      .eq("rol", "admin_eleam")
      .maybeSingle(),
    opts.planId
      ? sb.from("planes").select("nombre").eq("id", opts.planId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sb.from("profiles")
      .select("email")
      .eq("rol", "superadmin")
      .is("eleam_id", null),
  ]);

  if (adminRes.error) console.warn("sendPaymentEmails: admin fetch", adminRes.error);
  if (planRes.error) console.warn("sendPaymentEmails: plan fetch", planRes.error);
  if (superadminsRes.error) console.warn("sendPaymentEmails: superadmins fetch", superadminsRes.error);

  const admin = adminRes.data;
  if (!admin?.email) {
    console.warn("sendPaymentEmails: no admin email for eleam", eleamId);
    return;
  }

  const planNombre = (planRes.data as { nombre?: string } | null)?.nombre ?? "Plan mensual";
  const adminNombre = admin.nombre ?? admin.email;

  const [receiptResult] = await Promise.all([
    sendEmail({
      to: admin.email,
      subject: `Comprobante de pago · FichaEleam`,
      html: paymentReceiptHtml({
        adminNombre,
        eleamNombre: opts.eleamNombre,
        planNombre,
        monto: opts.monto,
        moneda: opts.moneda,
        fechaPago: opts.fechaPago,
        proximoCobro: opts.proximoCobro,
      }),
    }),
  ]);
  if (!receiptResult.sent) {
    console.warn("sendPaymentEmails: receipt not sent", receiptResult.error);
  }

  const superadminEmails = (superadminsRes.data ?? [])
    .map((r) => (r as { email?: string }).email)
    .filter((e): e is string => Boolean(e));

  for (const email of superadminEmails) {
    const notifResult = await sendEmail({
      to: email,
      subject: `Nuevo pago confirmado · FichaEleam`,
      html: paymentAdminNotificationHtml({
        eleamNombre: opts.eleamNombre,
        planNombre,
        monto: opts.monto,
        moneda: opts.moneda,
        fechaPago: opts.fechaPago,
        adminNombre,
        adminEmail: admin.email,
        preapprovalId: opts.preapprovalId,
        authorizedPaymentId: opts.authorizedPaymentId,
        proximoCobro: opts.proximoCobro,
      }),
    });
    if (!notifResult.sent) {
      console.warn("sendPaymentEmails: superadmin notif not sent", email, notifResult.error);
    }
  }
}

async function markDemoLeadConverted(sb: Sb, eleamId: string) {
  const { data: admins, error: adminsErr } = await sb
    .from("profiles")
    .select("id")
    .eq("eleam_id", eleamId)
    .eq("rol", "admin_eleam");
  if (adminsErr) throw adminsErr;

  const adminIds = (admins ?? []).map((row) => row.id).filter(Boolean);
  if (adminIds.length === 0) return;

  const { error } = await sb
    .from("demo_leads")
    .update({ estado: "convertido" })
    .in("demo_user_id", adminIds);
  if (error) throw error;
}

function mapPreapprovalStatus(s?: string): string {
  switch ((s ?? "").toLowerCase()) {
    case "authorized":  return "activo";
    case "pending":     return "pendiente";
    case "paused":
    case "suspended":   return "pausado";
    case "cancelled":
    case "finished":    return "cancelado";
    default:            return "pendiente";
  }
}

function mapPaymentStatus(s?: string): "completado" | "fallido" | "pendiente" | "reembolsado" {
  switch ((s ?? "").toLowerCase()) {
    case "approved":      return "completado";
    case "rejected":
    case "cancelled":
    case "charged_back":  return "fallido";
    case "refunded":      return "reembolsado";
    default:              return "pendiente";
  }
}
