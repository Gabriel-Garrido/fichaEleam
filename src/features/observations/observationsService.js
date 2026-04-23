import { supabase } from "../../services/supabaseConfig";

export const getObservations = async (residenteId = null, limit = 50) => {
  let query = supabase
    .from("observaciones_diarias")
    .select("*, residentes(nombre, apellido)")
    .order("fecha_hora", { ascending: false })
    .limit(limit);

  if (residenteId) query = query.eq("residente_id", residenteId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createObservation = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("observaciones_diarias")
    .insert({ ...payload, registrado_por: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateObservation = async (id, payload) => {
  const { data, error } = await supabase
    .from("observaciones_diarias")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteObservation = async (id) => {
  const { error } = await supabase.from("observaciones_diarias").delete().eq("id", id);
  if (error) throw error;
};
