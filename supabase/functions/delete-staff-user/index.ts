// POST /functions/v1/delete-staff-user
//
// Body: { profile_id: uuid }
//
// Elimina un usuario (funcionario o familiar) del ELEAM del admin.
// Requiere Admin API (service role) para borrar de auth.users.
// El CASCADE en profiles y familiar_residentes limpia el resto.
//
// Reglas:
//   • Solo admin_eleam puede eliminar.
//   • El target debe pertenecer al mismo ELEAM.
//   • No se puede eliminar al propio admin_eleam.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Método no permitido" }, 405);
  }

  try {
    const { user, profile, error } = await getCallerProfile(req);
    if (error || !user || !profile) {
      return jsonResponse(req, { error: "No autenticado" }, 401);
    }
    if (profile.rol !== "admin_eleam" || !profile.eleam_id) {
      return jsonResponse(req, { error: "Solo el administrador del ELEAM puede eliminar usuarios" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const profileId = String(body.profile_id ?? "").trim();

    if (!profileId) {
      return jsonResponse(req, { error: "profile_id es obligatorio" }, 400);
    }
    if (!UUID_RE.test(profileId)) {
      return jsonResponse(req, { error: "profile_id tiene formato inválido" }, 400);
    }

    const sb = adminClient();

    // Verificar que el target existe y pertenece al mismo ELEAM
    const { data: target } = await sb
      .from("profiles")
      .select("id, rol, eleam_id, nombre")
      .eq("id", profileId)
      .maybeSingle();

    if (!target) {
      return jsonResponse(req, { error: "Usuario no encontrado" }, 404);
    }
    if (target.eleam_id !== profile.eleam_id) {
      return jsonResponse(req, { error: "El usuario no pertenece a tu ELEAM" }, 403);
    }
    if (target.rol === "admin_eleam") {
      return jsonResponse(req, { error: "No se puede eliminar al administrador del ELEAM" }, 403);
    }
    if (target.id === user.id) {
      return jsonResponse(req, { error: "No puedes eliminarte a ti mismo" }, 403);
    }

    // Eliminar de auth.users — CASCADE limpia profiles, familiar_residentes, funcionario_permisos
    const { error: deleteError } = await sb.auth.admin.deleteUser(profileId);
    if (deleteError) {
      console.error("delete-staff-user error:", deleteError);
      return jsonResponse(req, { error: "No se pudo eliminar el usuario" }, 500);
    }

    return jsonResponse(req, { ok: true });
  } catch (e) {
    console.error("delete-staff-user", e);
    return jsonResponse(req, { error: "Error interno", detail: String(e?.message ?? e) }, 500);
  }
});
