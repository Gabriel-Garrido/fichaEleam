// POST /functions/v1/mp-create-subscription
//
// Body: { plan_codigo: string, back_url?: string }
//
// Crea un preapproval de MercadoPago para el ELEAM del admin autenticado
// y devuelve init_point. El frontend redirige al usuario a esa URL.
//
// Solo el admin del ELEAM (rol = 'admin_eleam') puede activar la suscripción.
// Un funcionario nunca paga — su acceso depende del estado del ELEAM.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { getCallerProfile, adminClient } from "../_shared/supabase.ts";
import {
  createPreapproval,
  PreapprovalCreateInput,
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
    // back_url es controlado: solo aceptamos paths internos que empiecen con "/"
    // seguido de un carácter que no sea "/" ni "\" (bloquea //evil.com y /\evil.com).
    const requestedReturn = String(body.back_url ?? "/pago/return");
    const isSafePath = /^\/[^/\\]/.test(requestedReturn);
    const safeReturn = isSafePath ? requestedReturn : "/pago/return";
    const back_url = `${backOrigin}${safeReturn}`;

    const admin = adminClient();

    // Cargar plan
    const { data: plan, error: planErr } = await admin
      .from("planes")
      .select("id, codigo, nombre, precio_clp, frequency, frequency_type, activo")
      .eq("codigo", planCodigo)
      .eq("activo", true)
      .maybeSingle();
    if (planErr || !plan) {
      return jsonResponse(req, { error: "Plan no encontrado" }, 404);
    }

    // Cargar ELEAM y validar estado
    const { data: eleam, error: eleamErr } = await admin
      .from("eleams")
      .select("id, nombre, subscription_status, mp_preapproval_id")
      .eq("id", profile.eleam_id)
      .maybeSingle();
    if (eleamErr || !eleam) {
      return jsonResponse(req, { error: "ELEAM no encontrado" }, 404);
    }

    if (eleam.subscription_status === "activo" ||
        eleam.subscription_status === "en_gracia") {
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

    // notification_url: webhook público de Edge Function
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");
    const notification_url = `${supabaseUrl}/functions/v1/mp-webhook`;

    const idempotencyKey = crypto.randomUUID();
    const input: PreapprovalCreateInput = {
      reason: `FichaEleam — ${plan.nombre} (${eleam.nombre})`,
      external_reference: eleam.id,
      payer_email: profile.email ?? user.email!,
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

    const preapproval = await createPreapproval(input, idempotencyKey);

    // Guardar el preapproval id pendiente en el ELEAM
    const { error: updErr } = await admin
      .from("eleams")
      .update({
        plan_id: plan.id,
        mp_preapproval_id: preapproval.id,
        mp_payer_email: input.payer_email,
        subscription_status: "pendiente",
      })
      .eq("id", eleam.id);
    if (updErr) {
      console.error("eleams update", updErr);
    }

    return jsonResponse(req, {
      ok: true,
      preapproval_id: preapproval.id,
      init_point: preapproval.init_point,
      status: preapproval.status,
    });
  } catch (e) {
    console.error("mp-create-subscription error", e);
    return jsonResponse(
      req,
      { error: "Error interno", detail: String(e?.message ?? e) },
      500,
    );
  }
});
