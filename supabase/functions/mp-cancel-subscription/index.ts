// POST /functions/v1/mp-cancel-subscription
//
// Cancela el preapproval del ELEAM del admin autenticado.
// Solo el admin del ELEAM puede ejecutar esta acción.
//
// El cambio definitivo de subscription_status llega vía webhook,
// pero anticipamos el estado a 'cancelado' para que la UI lo refleje.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";
import { updatePreapprovalStatus } from "../_shared/mercadopago.ts";

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
      .select("id, mp_preapproval_id")
      .eq("id", profile.eleam_id)
      .maybeSingle();
    if (eleamErr || !eleam) {
      return jsonResponse(req, { error: "ELEAM no encontrado" }, 404);
    }
    if (!eleam.mp_preapproval_id) {
      return jsonResponse(req, { error: "No hay suscripción activa" }, 400);
    }

    await updatePreapprovalStatus(eleam.mp_preapproval_id, "cancelled");

    await sb.from("eleams").update({
      subscription_status: "cancelado",
      cancelado_en: new Date().toISOString(),
    }).eq("id", eleam.id);

    return jsonResponse(req, { ok: true });
  } catch (e) {
    console.error("mp-cancel-subscription", e);
    return jsonResponse(req, {
      error: "Error interno", detail: String(e?.message ?? e),
    }, 500);
  }
});
