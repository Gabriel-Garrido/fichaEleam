import { supabase } from "../../services/supabaseConfig";
import { normalizeFamilyVisibility } from "../familiar/familyVisibility";

const OBSERVATION_SELECT = `
  id, residente_id, fecha_hora, turno, tipo, descripcion, acciones_tomadas,
  requiere_seguimiento, seguimiento_fecha, seguimiento_turno, seguimiento_estado,
  visible_familiar, resumen_familiar, registrado_por,
  creado_en, actualizado_en
`;

export const getObservations = async (
  residenteId = null,
  { limit = 50, desde = null, hasta = null, tipo = null, soloSeguimiento = false } = {}
) => {
  let query = supabase
    .from("observaciones_diarias")
    .select(`${OBSERVATION_SELECT}, residentes(nombre, apellido)`)
    .order("fecha_hora", { ascending: false })
    .limit(limit);

  if (residenteId)    query = query.eq("residente_id", residenteId);
  // Convert local date boundaries to UTC ISO strings so timestamptz comparisons
  // respect the browser's timezone (e.g. UTC-3 Chile).
  if (desde)          query = query.gte("fecha_hora", new Date(desde + "T00:00:00").toISOString());
  if (hasta)          query = query.lte("fecha_hora", new Date(hasta + "T23:59:59").toISOString());
  if (tipo)           query = query.eq("tipo", tipo);
  if (soloSeguimiento) query = query.eq("requiere_seguimiento", true);

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createObservation = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser();
  const requiereSeguimiento = payload.requiere_seguimiento === true;
  const cleanPayload = {
    ...payload,
    ...normalizeFamilyVisibility(payload),
    seguimiento_fecha: requiereSeguimiento ? payload.seguimiento_fecha || null : null,
    seguimiento_turno: requiereSeguimiento ? payload.seguimiento_turno || null : null,
    seguimiento_estado: requiereSeguimiento ? payload.seguimiento_estado || "pendiente" : "pendiente",
  };
  const { data, error } = await supabase
    .from("observaciones_diarias")
    .insert({ ...cleanPayload, registrado_por: user?.id })
    .select(OBSERVATION_SELECT)
    .single();
  if (error) throw error;
  return data;
};

export const updateObservation = async (id, payload) => {
  const cleanPayload = { ...payload };
  if ("visible_familiar" in payload || "resumen_familiar" in payload) {
    Object.assign(cleanPayload, normalizeFamilyVisibility(payload));
  }

  const { data, error } = await supabase
    .from("observaciones_diarias")
    .update(cleanPayload)
    .eq("id", id)
    .select(OBSERVATION_SELECT)
    .single();
  if (error) throw error;
  return data;
};

export const deleteObservation = async (id) => {
  const { error } = await supabase.from("observaciones_diarias").delete().eq("id", id);
  if (error) throw error;
};

export const getPendingSeguimientos = async (fecha, turno) => {
  const { data, error } = await supabase
    .from("observaciones_diarias")
    .select(`${OBSERVATION_SELECT}, residentes(nombre, apellido)`)
    .eq("requiere_seguimiento", true)
    .eq("seguimiento_estado", "pendiente")
    .eq("seguimiento_fecha", fecha)
    .eq("seguimiento_turno", turno)
    .order("creado_en", { ascending: true });
  if (error) throw error;
  return data ?? [];
};

export const resolverSeguimiento = async (id, { notas = null } = {}) => {
  const { data, error } = await supabase
    .from("observaciones_diarias")
    .update({
      seguimiento_estado: "resuelto",
      ...(notas?.trim() ? { acciones_tomadas: notas.trim() } : {}),
    })
    .eq("id", id)
    .select(OBSERVATION_SELECT)
    .single();
  if (error) throw error;
  return data;
};

export const continuarSeguimiento = async (id, { notas = null, nuevaFecha, nuevoTurno } = {}) => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: original, error: resolveError } = await supabase
    .from("observaciones_diarias")
    .update({
      seguimiento_estado: "resuelto",
      ...(notas?.trim() ? { acciones_tomadas: notas.trim() } : {}),
    })
    .eq("id", id)
    .select(OBSERVATION_SELECT)
    .single();
  if (resolveError) throw resolveError;

  const nuevaDescripcion = notas?.trim()
    ? `Seguimiento de: ${original.descripcion}\n\nEvolución: ${notas.trim()}`
    : `Seguimiento de: ${original.descripcion}`;

  const { data: nueva, error: createError } = await supabase
    .from("observaciones_diarias")
    .insert({
      residente_id: original.residente_id,
      fecha_hora: new Date().toISOString(),
      turno: nuevoTurno,
      tipo: original.tipo,
      descripcion: nuevaDescripcion,
      requiere_seguimiento: true,
      seguimiento_fecha: nuevaFecha,
      seguimiento_turno: nuevoTurno,
      seguimiento_estado: "pendiente",
      visible_familiar: false,
      resumen_familiar: null,
      registrado_por: user?.id,
    })
    .select(OBSERVATION_SELECT)
    .single();
  if (createError) throw createError;

  return { resuelta: original, nueva };
};
