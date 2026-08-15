// Desactiva o restaura una cuenta del mismo ELEAM sin borrar su historial.
// La base de datos revoca el acceso de inmediato y Supabase Auth bloquea
// nuevos ingresos. Solo un administrador activo del mismo ELEAM puede actuar.

import { preflight, jsonResponse, internalErrorResponse } from "../_shared/cors.ts";
import { adminClient, eleamHasOperationalAccess, getCallerProfile, userClient } from "../_shared/supabase.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonResponse(req, { error: "Método no permitido" }, 405);

  try {
    const { user, profile, error } = await getCallerProfile(req);
    if (error || !user || !profile) return jsonResponse(req, { error: "No autenticado" }, 401);
    if (profile.rol !== "admin_eleam" || !profile.eleam_id) {
      return jsonResponse(req, { error: "Solo un administrador activo puede gestionar accesos" }, 403);
    }
    if (!await eleamHasOperationalAccess(profile.eleam_id)) {
      return jsonResponse(req, { error: "El ELEAM no tiene acceso activo" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const profileId = String(body.profile_id ?? "").trim();
    const action = String(body.action ?? "desactivar").trim();
    const reason = String(body.motivo ?? "").trim().replace(/\s+/g, " ").slice(0, 500);

    if (!UUID_RE.test(profileId)) return jsonResponse(req, { error: "Usuario inválido" }, 400);
    if (!["desactivar", "restaurar"].includes(action)) return jsonResponse(req, { error: "Acción inválida" }, 400);
    if (profileId === user.id) return jsonResponse(req, { error: "No puedes gestionar tu propia cuenta" }, 403);
    if (action === "desactivar" && reason.length < 3) {
      return jsonResponse(req, { error: "Indica brevemente el motivo de la desactivación" }, 400);
    }

    const sb = adminClient();
    const { data: target, error: targetError } = await sb
      .from("profiles")
      .select("id, rol, eleam_id, nombre, email, acceso_activo")
      .eq("id", profileId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return jsonResponse(req, { error: "Usuario no encontrado" }, 404);
    if (target.eleam_id !== profile.eleam_id || !["admin_eleam", "funcionario"].includes(target.rol)) {
      return jsonResponse(req, { error: "El usuario no pertenece a tu ELEAM" }, 403);
    }

    const banDuration = action === "desactivar" ? "876000h" : "none";
    const { error: authError } = await sb.auth.admin.updateUserById(profileId, { ban_duration: banDuration });
    if (authError) {
      console.error("manage-user-access auth", authError);
      return jsonResponse(req, { error: action === "desactivar" ? "No se pudo bloquear la cuenta" : "No se pudo habilitar la cuenta" }, 500);
    }

    const callerClient = userClient(req);
    const { data: result, error: accessError } = await callerClient.rpc("gestionar_acceso_usuario", {
      p_profile_id: profileId,
      p_accion: action,
      p_motivo: action === "desactivar" ? reason : null,
    });
    if (accessError) {
      // Compensación: si falla la transacción, Auth vuelve al estado original.
      const rollbackDuration = target.acceso_activo === false ? "876000h" : "none";
      const { error: rollbackError } = await sb.auth.admin.updateUserById(profileId, { ban_duration: rollbackDuration });
      if (rollbackError) console.error("manage-user-access auth rollback", rollbackError);
      const safeMessage = accessError.message?.includes("último administrador")
        || accessError.message?.includes("al menos un administrador")
        ? "El ELEAM debe conservar al menos un administrador activo"
        : accessError.message?.includes("propia cuenta")
          ? "No puedes gestionar tu propia cuenta"
          : "No se pudo cambiar el acceso del usuario";
      return jsonResponse(req, { error: safeMessage }, 409);
    }

    return jsonResponse(req, {
      ok: true,
      action,
      profile_id: profileId,
      access_active: result?.access_active ?? action === "restaurar",
    });
  } catch (error) {
    console.error("delete-staff-user", error);
    return internalErrorResponse(req);
  }
});
