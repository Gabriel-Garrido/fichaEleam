import { supabase } from "../../services/supabaseConfig";

function ensureSupabase() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

const VISIT_SELECT =
  "id, residente_id, profile_id, fecha_hora, duracion_min, notas, registrado_por, estado, validado_por, validado_en, salida_hora, creado_en";

// Lista los residentes vinculados al familiar autenticado.
export async function getMyResidentes() {
  const sb = ensureSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: vinculos, error } = await sb
    .from("familiar_residentes")
    .select(`
      residente_id,
      parentesco,
      residentes(
        id, nombre, apellido, fecha_nacimiento, estado, habitacion, cama, nivel_dependencia
      )
    `)
    .eq("profile_id", user.id);
  if (error) throw error;

  return (vinculos ?? [])
    .filter((v) => v.residentes)
    .map((v) => ({ ...v.residentes, parentesco: v.parentesco }));
}

// Snapshot completo del residente para el portal familiar (vía RPC security definer).
// La función SQL ya NO filtra por visible_familiar: muestra todos los registros.
export async function getFamiliarResidentSnapshot(residenteId) {
  const sb = ensureSupabase();
  const { data, error } = await sb.rpc("get_familiar_resident_snapshot", {
    p_residente_id: residenteId,
  });
  if (error) throw error;
  return data ?? {};
}

// Visitas del residente (todas, para el portal).
export async function getVisits(residenteId, limit = 50) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("visitas_familiar")
    .select(`
      ${VISIT_SELECT},
      profiles!visitas_familiar_profile_id_fkey(nombre),
      validador:profiles!visitas_familiar_validado_por_fkey(nombre)
    `)
    .eq("residente_id", residenteId)
    .order("fecha_hora", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Visitas activas/pendientes de un residente (para el panel de staff).
export async function getPendingVisits(residenteId) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("visitas_familiar")
    .select(`
      ${VISIT_SELECT},
      profiles!visitas_familiar_profile_id_fkey(nombre)
    `)
    .eq("residente_id", residenteId)
    .in("estado", ["pendiente", "activa"])
    .order("fecha_hora", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// El familiar anuncia su llegada creando una visita pendiente.
export async function requestVisit({ residenteId, notas }) {
  const sb = ensureSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data, error } = await sb
    .from("visitas_familiar")
    .insert({
      residente_id: residenteId,
      profile_id: user.id,
      registrado_por: user.id,
      fecha_hora: new Date().toISOString(),
      notas: notas?.trim() || null,
      estado: "pendiente",
    })
    .select(VISIT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

// Staff valida la entrada del familiar (estado pendiente → activa).
export async function validateVisitEntry(visitId) {
  const sb = ensureSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  const { data, error } = await sb
    .from("visitas_familiar")
    .update({
      estado: "activa",
      validado_por: profile?.id ?? user.id,
      validado_en: new Date().toISOString(),
      fecha_hora: new Date().toISOString(),
    })
    .eq("id", visitId)
    .eq("estado", "pendiente")
    .select(VISIT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

// Staff registra la salida del familiar (estado activa → completada).
export async function registerVisitExit({ visitId, notas }) {
  const sb = ensureSupabase();
  const salidaHora = new Date().toISOString();

  const { data: visit } = await sb
    .from("visitas_familiar")
    .select("fecha_hora")
    .eq("id", visitId)
    .single();

  let duracionMin = null;
  if (visit?.fecha_hora) {
    const entradaMs = new Date(visit.fecha_hora).getTime();
    const salidaMs = new Date(salidaHora).getTime();
    const diff = Math.round((salidaMs - entradaMs) / 60000);
    if (diff > 0 && diff <= 1440) duracionMin = diff;
  }

  const { data, error } = await sb
    .from("visitas_familiar")
    .update({
      estado: "completada",
      salida_hora: salidaHora,
      duracion_min: duracionMin,
      notas: notas?.trim() || null,
    })
    .eq("id", visitId)
    .eq("estado", "activa")
    .select(VISIT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

// Cancelar una visita pendiente (staff o el propio familiar).
export async function cancelVisit(visitId) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("visitas_familiar")
    .update({ estado: "cancelada" })
    .eq("id", visitId)
    .in("estado", ["pendiente", "activa"])
    .select(VISIT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

// Compatibilidad: logVisit usada en flujos legacy (crea visita completada directamente por staff).
export async function logVisit({ residenteId, fechaHora, duracionMin, notas }) {
  const sb = ensureSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data, error } = await sb
    .from("visitas_familiar")
    .insert({
      residente_id: residenteId,
      profile_id: user.id,
      registrado_por: user.id,
      fecha_hora: fechaHora || new Date().toISOString(),
      duracion_min: duracionMin || null,
      notas: notas?.trim() || null,
      estado: "completada",
    })
    .select(VISIT_SELECT)
    .single();
  if (error) throw error;
  return data;
}
