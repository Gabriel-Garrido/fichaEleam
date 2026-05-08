import { supabase } from "../../services/supabaseConfig";

function ensureSupabase() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

// Lista los residentes vinculados al familiar autenticado.
// La RLS de familiar_residentes garantiza que solo vea sus propios vínculos.
export async function getMyResidentes() {
  const sb = ensureSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: vinculos, error } = await sb
    .from("familiar_residentes")
    .select("residente_id, parentesco, residentes(*)")
    .eq("profile_id", user.id);
  if (error) throw error;

  return (vinculos ?? [])
    .filter((v) => v.residentes)
    .map((v) => ({ ...v.residentes, parentesco: v.parentesco }));
}

// Últimos signos vitales del residente (RLS valida acceso por familiar).
export async function getRecentVitals(residenteId, limit = 8) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("signos_vitales")
    .select("*")
    .eq("residente_id", residenteId)
    .order("fecha_hora", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Últimas observaciones del residente.
export async function getRecentObservations(residenteId, limit = 10) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("observaciones_diarias")
    .select("*")
    .eq("residente_id", residenteId)
    .order("fecha_hora", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Visitas del familiar al residente.
export async function getVisits(residenteId, limit = 50) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("visitas_familiar")
    .select("*, profiles!visitas_familiar_profile_id_fkey(nombre)")
    .eq("residente_id", residenteId)
    .order("fecha_hora", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// El familiar registra una visita propia. Si no se pasa profile_id se
// asume el usuario actual (RLS lo exige así).
export async function logVisit({ residenteId, fechaHora, duracionMin, notas }) {
  const sb = ensureSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const payload = {
    residente_id: residenteId,
    profile_id: user.id,
    registrado_por: user.id,
    fecha_hora: fechaHora || new Date().toISOString(),
    duracion_min: duracionMin || null,
    notas: notas?.trim() || null,
  };
  const { data, error } = await sb
    .from("visitas_familiar")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}
