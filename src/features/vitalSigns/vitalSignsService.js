import { supabase } from "../../services/supabaseConfig";

export const getVitalSigns = async (residenteId = null, { limit = 50, desde = null, hasta = null } = {}) => {
  let query = supabase
    .from("signos_vitales")
    .select("*, residentes(nombre, apellido)")
    .order("fecha_hora", { ascending: false })
    .limit(limit);

  if (residenteId) query = query.eq("residente_id", residenteId);
  if (desde) query = query.gte("fecha_hora", desde + "T00:00:00");
  if (hasta) query = query.lte("fecha_hora", hasta + "T23:59:59");

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createVitalSigns = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("signos_vitales")
    .insert({ ...payload, registrado_por: user?.id })
    .select()
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
    .select("*")
    .eq("residente_id", residenteId)
    .order("fecha_hora", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
};
