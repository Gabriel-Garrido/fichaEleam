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
