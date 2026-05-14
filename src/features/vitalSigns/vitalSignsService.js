import { supabase } from "../../services/supabaseConfig";

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

export const createVitalSigns = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("signos_vitales")
    .insert({ ...payload, registrado_por: user?.id })
    .select(VITAL_SIGNS_SELECT)
    .single();
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
