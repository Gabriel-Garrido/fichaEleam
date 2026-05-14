import { supabase } from "../../services/supabaseConfig";

const OBSERVATION_SELECT = `
  id, residente_id, fecha_hora, turno, tipo, descripcion, acciones_tomadas,
  requiere_seguimiento, visible_familiar, resumen_familiar, registrado_por,
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
  const { data, error } = await supabase
    .from("observaciones_diarias")
    .insert({ ...payload, registrado_por: user?.id })
    .select(OBSERVATION_SELECT)
    .single();
  if (error) throw error;
  return data;
};

export const updateObservation = async (id, payload) => {
  const { data, error } = await supabase
    .from("observaciones_diarias")
    .update(payload)
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
