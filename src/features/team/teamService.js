import { supabase } from "../../services/supabaseConfig";

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
    .select("id, nombre, email, rol, creado_en")
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

// Crea invitación llamando a la Edge Function.
// rol: 'funcionario' | 'familiar'. Si es familiar, residenteId obligatorio.
export async function inviteMember({ email, rol = "funcionario", residenteId = null }) {
  const sb = ensureSupabase();
  const { data, error } = await sb.functions.invoke("invite-funcionario", {
    body: { email, rol, residente_id: residenteId },
  });
  if (error) throw new Error(error.message ?? "No se pudo invitar");
  if (data?.error) throw new Error(data.error);
  return data;
}

// Mantengo la firma anterior por compatibilidad con código viejo.
export async function inviteFuncionario(email) {
  return inviteMember({ email, rol: "funcionario" });
}

// Lista los residentes activos del ELEAM, para asociar familiares.
export async function getEleamResidentes(eleamId) {
  if (!eleamId) return [];
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("residentes")
    .select("id, nombre, apellido, estado, habitacion")
    .eq("eleam_id", eleamId)
    .order("apellido", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Lista los familiares vinculados a residentes del ELEAM (vista del admin).
export async function getEleamFamiliares(eleamId) {
  if (!eleamId) return [];
  const sb = ensureSupabase();
  // Traemos los vínculos cuyas residentes pertenecen al ELEAM.
  const { data, error } = await sb
    .from("familiar_residentes")
    .select("profile_id, residente_id, parentesco, residentes(eleam_id, nombre, apellido), profiles(id, nombre, email, rol)")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((row) => row.residentes?.eleam_id === eleamId);
}

// Quita el vínculo familiar↔residente.
export async function unlinkFamiliarResidente(profileId, residenteId) {
  const sb = ensureSupabase();
  const { error } = await sb
    .from("familiar_residentes")
    .delete()
    .eq("profile_id", profileId)
    .eq("residente_id", residenteId);
  if (error) throw error;
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
