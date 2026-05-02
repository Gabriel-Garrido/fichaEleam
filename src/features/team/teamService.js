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
    .select("id, email, token, expira_en, creado_en, usado")
    .eq("eleam_id", eleamId)
    .eq("usado", false)
    .gt("expira_en", new Date().toISOString())
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Crea invitación llamando a la Edge Function.
export async function inviteFuncionario(email) {
  const sb = ensureSupabase();
  const { data, error } = await sb.functions.invoke("invite-funcionario", {
    body: { email },
  });
  if (error) throw new Error(error.message ?? "No se pudo invitar");
  if (data?.error) throw new Error(data.error);
  return data;
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
