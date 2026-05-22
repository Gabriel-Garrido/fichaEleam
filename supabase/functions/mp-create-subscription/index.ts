// POST /functions/v1/mp-create-subscription
//
// Body: { plan_codigo: string, back_url?: string }
//
// Crea un preapproval de MercadoPago para el ELEAM del admin autenticado
// y devuelve init_point. El frontend redirige al usuario a esa URL.
//
// Solo el admin del ELEAM (rol = 'admin_eleam') puede activar la suscripción.
// Un funcionario nunca paga — su acceso depende del estado del ELEAM.

import { preflight, jsonResponse, internalErrorResponse } from "../_shared/cors.ts";
import { getCallerProfile, adminClient } from "../_shared/supabase.ts";
import {
  createPreapproval,
  PreapprovalCreateInput,
  publicMercadoPagoError,
  updatePreapprovalStatus,
} from "../_shared/mercadopago.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Método no permitido" }, 405);
  }

  try {
    const { user, profile, error } = await getCallerProfile(req);
    if (error || !user || !profile) {
      return jsonResponse(req, { error: error ?? "No autenticado" }, 401);
    }

    if (profile.rol !== "admin_eleam") {
      return jsonResponse(
        req,
        { error: "Solo el admin del ELEAM puede activar la suscripción" },
        403,
      );
    }

    if (!profile.eleam_id) {
      return jsonResponse(
        req,
        { error: "Tu perfil no está asociado a un ELEAM" },
        400,
      );
    }

    const body = await req.json().catch(() => ({}));
    const planCodigo: string = String(body.plan_codigo ?? "").trim();
    if (!planCodigo) {
      return jsonResponse(req, { error: "plan_codigo requerido" }, 400);
    }

    // Validar back_url contra ALLOWED_ORIGINS para evitar open-redirect.
    const backOrigin = Deno.env.get("PUBLIC_APP_URL")?.replace(/\/$/, "");
    if (!backOrigin) {
      return jsonResponse(
        req,
        { error: "PUBLIC_APP_URL no configurado en el servidor" },
        500,
      );
    }
    // back_url siempre apunta a /pago/return (no aceptamos paths del cliente
    // para evitar open-redirect). MP redirige aquí con collection_status,
    // payment_id, merchant_order_id y external_reference como query params.
    const back_url = `${backOrigin}/pago/return`;

    const admin = adminClient();

    // Cargar plan
    const { data: plan, error: planErr } = await admin
      .from("planes")
      .select("id, codigo, nombre, precio_clp, max_residentes, max_funcionarios, frequency, frequency_type, activo")
      .eq("codigo", planCodigo)
      .eq("activo", true)
      .maybeSingle();
    if (planErr || !plan) {
      return jsonResponse(req, { error: "Plan no encontrado" }, 404);
    }

    // Cargar ELEAM y validar estado
    const { data: eleam, error: eleamErr } = await admin
      .from("eleams")
      .select("id, nombre, plan, subscription_status, mp_preapproval_id, fecha_vencimiento_suscripcion")
      .eq("id", profile.eleam_id)
      .maybeSingle();
    if (eleamErr || !eleam) {
      return jsonResponse(req, { error: "ELEAM no encontrado" }, 404);
    }

    const isDemo = eleam.plan === "demo";
    const hasActivePaidSubscription =
      !isDemo &&
      (eleam.subscription_status === "activo" || eleam.subscription_status === "en_gracia");

    if (hasActivePaidSubscription) {
      return jsonResponse(
        req,
        { error: "El ELEAM ya tiene una suscripción activa" },
        409,
      );
    }

    // Evitar crear múltiples preapprovals: si ya existe uno pendiente, rechazar
    // para no generar suscripciones huérfanas en MercadoPago.
    if (eleam.subscription_status === "pendiente" && eleam.mp_preapproval_id) {
      return jsonResponse(
        req,
        {
          error: "Ya hay un proceso de pago en curso. Espera a que se complete o contacta a soporte.",
          preapproval_id: eleam.mp_preapproval_id,
        },
        409,
      );
    }

    const nowIso = new Date().toISOString();
    const [residentsUsage, staffUsage, pendingInvitesUsage] = await Promise.all([
      admin
        .from("residentes")
        .select("id", { count: "exact", head: true })
        .eq("eleam_id", eleam.id)
        .in("estado", ["activo", "hospitalizado"]),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("eleam_id", eleam.id)
        .eq("rol", "funcionario"),
      admin
        .from("funcionario_invitaciones")
        .select("id", { count: "exact", head: true })
        .eq("eleam_id", eleam.id)
        .eq("rol", "funcionario")
        .eq("usado", false)
        .gt("expira_en", nowIso),
    ]);

    if (residentsUsage.error || staffUsage.error || pendingInvitesUsage.error) {
      console.error("plan usage check", residentsUsage.error, staffUsage.error, pendingInvitesUsage.error);
      return jsonResponse(
        req,
        { error: "No se pudo validar el uso actual del plan. Intenta nuevamente." },
        500,
      );
    }

    const residentsUsed = residentsUsage.count ?? 0;
    const staffUsed = (staffUsage.count ?? 0) + (pendingInvitesUsage.count ?? 0);
    if (plan.max_residentes !== null && residentsUsed > Number(plan.max_residentes)) {
      return jsonResponse(
        req,
        {
          error: `Este plan permite máximo ${plan.max_residentes} residentes activos u hospitalizados. Actualmente el ELEAM usa ${residentsUsed}.`,
        },
        409,
      );
    }
    if (plan.max_funcionarios !== null && staffUsed > Number(plan.max_funcionarios)) {
      return jsonResponse(
        req,
        {
          error: `Este plan permite máximo ${plan.max_funcionarios} funcionarios. Actualmente el ELEAM usa ${staffUsed}, incluyendo invitaciones pendientes.`,
        },
        409,
      );
    }

    // notification_url: webhook público de Edge Function
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");
    const notification_url = `${supabaseUrl}/functions/v1/mp-webhook`;

    const payerEmail = profile.email ?? user.email!;

    const idempotencyKey = crypto.randomUUID();
    const input: PreapprovalCreateInput = {
      reason: `FichaEleam — ${plan.nombre} (${eleam.nombre})`,
      external_reference: eleam.id,
      payer_email: payerEmail,
      back_url,
      notification_url,
      status: "pending",
      auto_recurring: {
        frequency: plan.frequency,
        frequency_type: plan.frequency_type,
        transaction_amount: plan.precio_clp,
        currency_id: "CLP",
      },
    };

    let preapproval;
    try {
      preapproval = await createPreapproval(input, idempotencyKey);
    } catch (mpErr) {
      console.error("mp-create-subscription MercadoPago createPreapproval", mpErr);
      const publicError = publicMercadoPagoError(mpErr);
      if (publicError) {
        return jsonResponse(req, publicError.body, publicError.status);
      }

      const message = String(mpErr instanceof Error ? mpErr.message : mpErr);
      if (message.includes("MP_ACCESS_TOKEN")) {
        return jsonResponse(
          req,
          {
            code: "mp_credentials_missing",
            error: "MP_ACCESS_TOKEN no está configurado en Supabase.",
          },
          500,
        );
      }
      throw mpErr;
    }

    if (!preapproval.id || !preapproval.init_point) {
      console.error("mp-create-subscription preapproval incomplete", preapproval);
      return jsonResponse(
        req,
        {
          code: "mp_incomplete_response",
          error: "MercadoPago no devolvió un enlace de pago válido. Intenta nuevamente.",
        },
        502,
      );
    }

    // Guardar el preapproval id pendiente en el ELEAM
    const { error: updErr } = await admin
      .from("eleams")
      .update({
        plan_id: plan.id,
        mp_preapproval_id: preapproval.id,
        mp_payer_email: payerEmail,
        subscription_status: "pendiente",
        crm_estado: "pendiente_pago",
      })
      .eq("id", eleam.id);
    if (updErr) {
      console.error("eleams update", updErr);
      try {
        await updatePreapprovalStatus(preapproval.id, "cancelled");
      } catch (cancelErr) {
        console.error("preapproval rollback failed", cancelErr);
      }
      return jsonResponse(
        req,
        { error: "No se pudo registrar el proceso de pago. Intenta nuevamente." },
        500,
      );
    }

    return jsonResponse(req, {
      ok: true,
      preapproval_id: preapproval.id,
      init_point: preapproval.init_point,
      status: preapproval.status,
    });
  } catch (e) {
    console.error("mp-create-subscription error", e);
    return internalErrorResponse(req);
  }
});
