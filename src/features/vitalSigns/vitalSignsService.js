import { supabase } from "../../services/supabaseConfig";
import { withResidentLocation } from "../beds/bedsUtils";

const TURNOS = ["mañana", "tarde", "noche"];

const VITAL_SIGNS_SELECT = `
  id, residente_id, fecha_hora, turno,
  presion_sistolica, presion_diastolica,
  frecuencia_cardiaca, frecuencia_respiratoria,
  temperatura, saturacion_oxigeno, glucosa, peso,
  dolor_escala, estado_conciencia, observaciones,
  registrado_por, creado_en
`;

export const getVitalSigns = async (residenteId = null, { limit = 50, desde = null, hasta = null } = {}) => {
  let query = supabase
    .from("signos_vitales")
    .select(`${VITAL_SIGNS_SELECT}, residentes(nombre, apellido)`)
    .order("fecha_hora", { ascending: false })
    .limit(limit);

  if (residenteId) query = query.eq("residente_id", residenteId);
  // Convert local date boundaries to UTC ISO strings so the timestamptz
  // comparison in Supabase respects the browser's timezone (e.g. UTC-3 Chile).
  if (desde) query = query.gte("fecha_hora", new Date(desde + "T00:00:00").toISOString());
  if (hasta) query = query.lte("fecha_hora", new Date(hasta + "T23:59:59").toISOString());

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export function requireVitalSignsFollowUpSlot({ requiereSeguimiento, seguimientoFecha, seguimientoTurno }) {
  if (!requiereSeguimiento) return;
  if (!seguimientoFecha || !TURNOS.includes(seguimientoTurno)) {
    throw new Error("Debes indicar fecha y turno para dejar el seguimiento pendiente.");
  }
}

export const createVitalSigns = async (payload) => {
  const requiereSeguimiento = payload.requiere_seguimiento === true;
  requireVitalSignsFollowUpSlot({
    requiereSeguimiento,
    seguimientoFecha: payload.seguimiento_fecha,
    seguimientoTurno: payload.seguimiento_turno,
  });

  const { data, error } = await supabase.rpc("registrar_signos_vitales", {
    p_residente_id: payload.residente_id,
    p_fecha_hora: payload.fecha_hora,
    p_turno: payload.turno || null,
    p_presion_sistolica: payload.presion_sistolica ?? null,
    p_presion_diastolica: payload.presion_diastolica ?? null,
    p_frecuencia_cardiaca: payload.frecuencia_cardiaca ?? null,
    p_frecuencia_respiratoria: payload.frecuencia_respiratoria ?? null,
    p_temperatura: payload.temperatura ?? null,
    p_saturacion_oxigeno: payload.saturacion_oxigeno ?? null,
    p_glucosa: payload.glucosa ?? null,
    p_peso: payload.peso ?? null,
    p_dolor_escala: payload.dolor_escala ?? null,
    p_estado_conciencia: payload.estado_conciencia || null,
    p_observaciones: payload.observaciones || null,
    p_requiere_seguimiento: requiereSeguimiento,
    p_seguimiento_fecha: requiereSeguimiento ? payload.seguimiento_fecha : null,
    p_seguimiento_turno: requiereSeguimiento ? payload.seguimiento_turno : null,
  });
  if (error) throw error;
  return data;
};

export const deleteVitalSigns = async (id) => {
  const { error } = await supabase.from("signos_vitales").delete().eq("id", id);
  if (error) throw error;
};

export const getLastVitalSigns = async (residenteId) => {
  const { data, error } = await supabase
    .from("signos_vitales")
    .select(VITAL_SIGNS_SELECT)
    .eq("residente_id", residenteId)
    .order("fecha_hora", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
};

export const getPendingVitalSignsResidents = async (fecha, turno) => {
  const { data: residents, error: resError } = await supabase
    .from("residentes")
    .select(`
      id, nombre, apellido, nivel_dependencia, cama_actual_id,
      cama_actual:camas!residentes_cama_actual_id_fkey(
        id, codigo, nombre, tipo, estado,
        habitacion:habitaciones!camas_habitacion_id_fkey(id, codigo, nombre, piso, sector, estado)
      )
    `)
    .eq("estado", "activo")
    .order("apellido");
  if (resError) throw resError;
  if (!residents?.length) return [];

  const { data: existing, error: vsError } = await supabase
    .from("signos_vitales")
    .select("residente_id")
    .gte("fecha_hora", new Date(fecha + "T00:00:00").toISOString())
    .lte("fecha_hora", new Date(fecha + "T23:59:59").toISOString())
    .eq("turno", turno)
    .in("residente_id", residents.map((r) => r.id));
  if (vsError) throw vsError;

  const recorded = new Set((existing ?? []).map((r) => r.residente_id));
  return residents.map(withResidentLocation).filter((r) => !recorded.has(r.id));
};
