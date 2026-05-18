import { supabase } from "../../services/supabaseConfig";
import { applyOwnVisitFilter } from "./familiarUtils";
import { withResidentLocation } from "../beds/bedsUtils";

function ensureSupabase() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

const VISIT_SELECT =
  "id, residente_id, profile_id, fecha_hora, duracion_min, notas, registrado_por, estado, validado_por, validado_en, salida_anunciada_en, salida_hora, salida_validada_por, salida_validada_en, creado_en";

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
        id, nombre, apellido, fecha_nacimiento, estado, nivel_dependencia, cama_actual_id,
        cama_actual:camas!residentes_cama_actual_id_fkey(
          id, codigo, nombre, tipo, estado,
          habitacion:habitaciones!camas_habitacion_id_fkey(id, codigo, nombre, piso, sector, estado)
        )
      )
    `)
    .eq("profile_id", user.id);
  if (error) throw error;

  return (vinculos ?? [])
    .filter((v) => v.residentes)
    .map((v) => ({ ...withResidentLocation(v.residentes), parentesco: v.parentesco }));
}

// Snapshot del residente para el portal familiar (vía RPC security definer).
// El SQL solo publica observaciones, cuidados y medicamentos marcados como visibles para familia.
export async function getFamiliarResidentSnapshot(residenteId, fecha = new Date().toISOString().slice(0, 10)) {
  const sb = ensureSupabase();
  const { data, error } = await sb.rpc("get_familiar_resident_snapshot", {
    p_residente_id: residenteId,
    p_fecha: fecha,
  });
  if (error) throw error;
  return data ?? {};
}

// Visitas del residente (todas, para ficha clínica/staff).
export async function getVisits(residenteId, limit = 50) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("visitas_familiar")
    .select(`
      ${VISIT_SELECT},
      profiles!visitas_familiar_profile_id_fkey(nombre),
      validador:profiles!visitas_familiar_validado_por_fkey(nombre),
      validador_salida:profiles!visitas_familiar_salida_validada_por_fkey(nombre)
    `)
    .eq("residente_id", residenteId)
    .order("fecha_hora", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Visitas propias del familiar autenticado (portal familiar).
export async function getMyVisits(residenteId, limit = 50) {
  const sb = ensureSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  let query = sb
    .from("visitas_familiar")
    .select(`
      ${VISIT_SELECT},
      profiles!visitas_familiar_profile_id_fkey(nombre),
      validador:profiles!visitas_familiar_validado_por_fkey(nombre),
      validador_salida:profiles!visitas_familiar_salida_validada_por_fkey(nombre)
    `)
    .eq("residente_id", residenteId);

  query = applyOwnVisitFilter(query, user.id);

  const { data, error } = await query
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
    .in("estado", ["pendiente", "activa", "salida_pendiente"])
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

// El familiar anuncia su salida; queda pendiente de validación por funcionario.
export async function announceVisitExit(visitId) {
  const sb = ensureSupabase();
  const salidaAnunciada = new Date().toISOString();

  const { data, error } = await sb
    .from("visitas_familiar")
    .update({
      estado: "salida_pendiente",
      salida_anunciada_en: salidaAnunciada,
    })
    .eq("id", visitId)
    .eq("estado", "activa")
    .select(VISIT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

function appendVisitNote(current, extra) {
  const clean = extra?.trim();
  if (!clean) return current || null;
  if (!current?.trim()) return clean;
  return `${current.trim()}\nSalida: ${clean}`;
}

// Staff valida la salida anunciada por el familiar (estado salida_pendiente → completada).
export async function registerVisitExit({ visitId, notas }) {
  const sb = ensureSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const salidaHora = new Date().toISOString();

  const { data: visit } = await sb
    .from("visitas_familiar")
    .select("fecha_hora, notas")
    .eq("id", visitId)
    .eq("estado", "salida_pendiente")
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
      salida_validada_por: user.id,
      salida_validada_en: salidaHora,
      duracion_min: duracionMin,
      notas: appendVisitNote(visit?.notas, notas),
    })
    .eq("id", visitId)
    .eq("estado", "salida_pendiente")
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
    .in("estado", ["pendiente", "activa", "salida_pendiente"])
    .select(VISIT_SELECT)
    .single();
  if (error) throw error;
  return data;
}
