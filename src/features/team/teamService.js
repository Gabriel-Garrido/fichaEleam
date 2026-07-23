import { ensureSupabase } from "../../services/serviceContext";
import { throwEdgeFunctionError } from "../../services/edgeFunctionErrors";
// Lista los funcionarios y el admin del ELEAM del usuario autenticado.
// La RLS profiles_admin_eleam_select permite al admin ver perfiles de su ELEAM.
export async function getTeamMembers(eleamId) {
  if (!eleamId) return [];
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("profiles")
    .select("id, nombre, email, telefono, rol, creado_en, must_reset_password")
    .eq("eleam_id", eleamId)
    .order("creado_en", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Lista las invitaciones pendientes (no usadas y no vencidas).
export async function getPendingInvitations(eleamId) {
  if (!eleamId) return [];
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("funcionario_invitaciones")
    .select("id, nombre, email, telefono, token, expira_en, creado_en, usado, rol")
    .eq("eleam_id", eleamId)
    .eq("usado", false)
    .gt("expira_en", new Date().toISOString())
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Elimina una invitación pendiente.
export async function revokeInvitation(id) {
  const sb = ensureSupabase();
  const { error } = await sb
    .from("funcionario_invitaciones")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Crea un funcionario. La cuenta se crea con una contraseña
// aleatoria interna y el usuario recibe por correo un enlace para definir la
// suya. Retorna { ok, profile_id, email, rol, email_sent, email_error? }.
export async function createStaffUser({ nombre, email, telefono = null }) {
  const sb = ensureSupabase();
  const { data, error } = await sb.functions.invoke("create-staff-user", {
    body: { nombre, email, telefono, rol: "funcionario" },
  });
  if (error) await throwEdgeFunctionError(error, "No se pudo crear el usuario");
  if (data?.error) throw new Error(data.error);
  return data;
}

// Elimina un funcionario del ELEAM usando Admin API via Edge Function.
export async function deleteStaffUser(profileId) {
  const sb = ensureSupabase();
  const { data, error } = await sb.functions.invoke("delete-staff-user", {
    body: { profile_id: profileId },
  });
  if (error) await throwEdgeFunctionError(error, "No se pudo eliminar el usuario");
  if (data?.error) throw new Error(data.error);
}

// Obtiene los permisos granulares de un funcionario.
export async function getFuncionarioPermisos(profileId) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("funcionario_permisos")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Actualiza (upsert) los permisos de un funcionario.
export async function updateFuncionarioPermisos(profileId, permisos) {
  const sb = ensureSupabase();
  const { error } = await sb
    .from("funcionario_permisos")
    .upsert({ profile_id: profileId, ...permisos, actualizado_en: new Date().toISOString() });
  if (error) throw error;
}

export async function updateStaffUser(profileId, details) {
  const sb = ensureSupabase();
  const { data, error } = await sb.functions.invoke("update-staff-user", {
    body: { action: "update", profile_id: profileId, ...details },
  });
  if (error) await throwEdgeFunctionError(error, "No se pudieron guardar los datos");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function sendStaffPasswordRecovery(profileId) {
  const sb = ensureSupabase();
  const { data, error } = await sb.functions.invoke("update-staff-user", {
    body: { action: "reset_password", profile_id: profileId },
  });
  if (error) await throwEdgeFunctionError(error, "No se pudo enviar el correo de recuperación");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function getProfileFeaturePermissions(profileId) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("profile_feature_permissions")
    .select("feature_id, enabled")
    .eq("profile_id", profileId);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.feature_id, row.enabled !== false]));
}

export async function updateProfileFeaturePermissions(profileId, permissions) {
  const sb = ensureSupabase();
  const rows = Object.entries(permissions).map(([feature_id, enabled]) => ({
    profile_id: profileId,
    feature_id,
    enabled: enabled === true,
    actualizado_en: new Date().toISOString(),
  }));
  if (rows.length) {
    const { error } = await sb
      .from("profile_feature_permissions")
      .upsert(rows, { onConflict: "profile_id,feature_id" });
    if (error) throw error;
  }
}

export async function saveStaffMemberDetails(profileId, { nombre, email, telefono, cargo, tipo_dotacion }) {
  const sb = ensureSupabase();
  const { data: profile, error: profileError } = await sb
    .from("profiles")
    .select("eleam_id")
    .eq("id", profileId)
    .single();
  if (profileError) throw profileError;

  const row = {
    eleam_id: profile.eleam_id,
    profile_id: profileId,
    nombre,
    email,
    telefono: telefono || null,
    cargo: cargo || null,
    tipo_dotacion,
    activo: true,
    actualizado_en: new Date().toISOString(),
  };
  const { data: existing, error: lookupError } = await sb
    .from("staff_members")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const query = existing
    ? sb.from("staff_members").update(row).eq("id", existing.id)
    : sb.from("staff_members").insert(row);
  const { error } = await query;
  if (error) throw error;
}
