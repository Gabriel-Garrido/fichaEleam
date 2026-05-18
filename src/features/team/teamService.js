import { supabase } from "../../services/supabaseConfig";
import { throwEdgeFunctionError } from "../../services/edgeFunctionErrors";
import { withResidentLocation } from "../beds/bedsUtils";

function ensureSupabase() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

// Lista los funcionarios y el admin del ELEAM del usuario autenticado.
// La RLS profiles_admin_eleam_select permite al admin ver perfiles de su ELEAM.
export async function getTeamMembers(eleamId) {
  if (!eleamId) return [];
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("profiles")
    .select("id, nombre, email, rol, creado_en, must_reset_password")
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
    .select("id, email, token, expira_en, creado_en, usado, rol, residente_id")
    .eq("eleam_id", eleamId)
    .eq("usado", false)
    .gt("expira_en", new Date().toISOString())
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Lista los residentes activos del ELEAM, para asociar familiares.
export async function getEleamResidentes(eleamId) {
  if (!eleamId) return [];
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("residentes")
    .select(`
      id, nombre, apellido, estado, cama_actual_id,
      cama_actual:camas!residentes_cama_actual_id_fkey(
        id, codigo, nombre, tipo, estado,
        habitacion:habitaciones!camas_habitacion_id_fkey(id, codigo, nombre, piso, sector, estado)
      )
    `)
    .eq("eleam_id", eleamId)
    .order("apellido", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(withResidentLocation);
}

// Lista los familiares vinculados a residentes del ELEAM (vista del admin).
export async function getEleamFamiliares(eleamId) {
  if (!eleamId) return [];
  const sb = ensureSupabase();
  // Traemos los vínculos cuyas residentes pertenecen al ELEAM.
  const { data, error } = await sb
    .from("familiar_residentes")
    .select("profile_id, residente_id, parentesco, residentes(eleam_id, nombre, apellido), profiles!familiar_residentes_profile_id_fkey(id, nombre, email, rol)")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((row) => row.residentes?.eleam_id === eleamId);
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

// Crea un funcionario o familiar directamente con contraseña temporal.
// Retorna { ok, temp_password, profile_id, email, rol, email_sent, email_error? }.
// La contraseña solo viene una vez.
export async function createStaffUser({ nombre, email, rol, residenteId = null }) {
  const sb = ensureSupabase();
  const { data, error } = await sb.functions.invoke("create-staff-user", {
    body: { nombre, email, rol, residente_id: residenteId },
  });
  if (error) await throwEdgeFunctionError(error, "No se pudo crear el usuario");
  if (data?.error) throw new Error(data.error);
  return data;
}

// Elimina un usuario (funcionario o familiar) del ELEAM usando Admin API via Edge Function.
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
