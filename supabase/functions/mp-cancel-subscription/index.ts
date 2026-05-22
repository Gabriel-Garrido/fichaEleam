// POST /functions/v1/mp-cancel-subscription
//
// Cancela el preapproval del ELEAM del admin autenticado.
// Solo el admin del ELEAM puede ejecutar esta acción.
//
// Si el usuario solo cancela un checkout pendiente durante el demo, liberamos
// el proceso de MercadoPago sin marcar el ELEAM como cliente cancelado.

import { preflight, jsonResponse, internalErrorResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";
import { updatePreapprovalStatus, MercadoPagoApiError } from "../_shared/mercadopago.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Método no permitido" }, 405);
  }

  try {
    const { profile, error } = await getCallerProfile(req);
    if (error || !profile) {
      return jsonResponse(req, { error: error ?? "No autenticado" }, 401);
    }
    if (profile.rol !== "admin_eleam") {
      return jsonResponse(req, { error: "Solo el admin puede cancelar" }, 403);
    }
    if (!profile.eleam_id) {
      return jsonResponse(req, { error: "Perfil sin ELEAM" }, 400);
    }

    const sb = adminClient();
    const { data: eleam, error: eleamErr } = await sb
      .from("eleams")
      .select("id, plan, subscription_status, fecha_vencimiento_suscripcion, mp_preapproval_id")
      .eq("id", profile.eleam_id)
      .maybeSingle();
    if (eleamErr || !eleam) {
      return jsonResponse(req, { error: "ELEAM no encontrado" }, 404);
    }
    if (!eleam.mp_preapproval_id) {
      return jsonResponse(req, { ok: true, already_clear: true });
    }

    const demoStillValid = eleam.plan === "demo" &&
      eleam.subscription_status === "pendiente" &&
      eleam.fecha_vencimiento_suscripcion !== null &&
      new Date(eleam.fecha_vencimiento_suscripcion).getTime() > Date.now();

    let mpCancelWarning: string | null = null;
    try {
      await updatePreapprovalStatus(eleam.mp_preapproval_id, "cancelled");
    } catch (mpErr) {
      // 404 / 409 means the preapproval is already cancelled or doesn't exist in MP.
      // For pending demo checkouts, local cleanup must still succeed so the user can retry.
      const mpStatus = mpErr instanceof MercadoPagoApiError ? mpErr.status : null;
      const canIgnoreMpFailure = demoStillValid || mpStatus === 404 || mpStatus === 409;
      if (!canIgnoreMpFailure) throw mpErr;

      mpCancelWarning = mpErr instanceof Error ? mpErr.message : "MercadoPago no confirmó la cancelación";
      console.warn("mp-cancel: continuing with local cleanup after MP cancel failure", mpStatus, mpCancelWarning);
    }

    const update = demoStillValid
      ? {
          mp_preapproval_id: null,
          mp_payer_email: null,
          plan_id: null,
          proximo_cobro_en: null,
          cancelado_en: null,
          crm_estado: "prueba",
        }
      : {
          subscription_status: "cancelado",
          cancelado_en: new Date().toISOString(),
          crm_estado: "cliente_riesgo",
          mp_preapproval_id: null,
          mp_payer_email: null,
          proximo_cobro_en: null,
        };

    const { error: updateErr } = await sb.from("eleams").update(update).eq("id", eleam.id);
    if (updateErr) {
      console.error("mp-cancel local update", updateErr);
      return jsonResponse(req, {
        error: "MercadoPago canceló la suscripción, pero no se pudo actualizar el estado local. Contacta a soporte.",
      }, 500);
    }

    return jsonResponse(req, { ok: true, mp_cancel_warning: mpCancelWarning });
  } catch (e) {
    console.error("mp-cancel-subscription", e);
    return internalErrorResponse(req);
  }
});
