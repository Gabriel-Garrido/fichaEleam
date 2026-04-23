import { supabase } from "../../services/supabaseConfig";

export const getResidents = async (estado = null) => {
  let query = supabase
    .from("residentes")
    .select("*")
    .order("apellido", { ascending: true });

  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getResidentById = async (id) => {
  const { data, error } = await supabase
    .from("residentes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
};

export const createResident = async (residentData) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("residentes")
    .insert({ ...residentData, creado_por: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateResident = async (id, residentData) => {
  const { data, error } = await supabase
    .from("residentes")
    .update({ ...residentData, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteResident = async (id) => {
  const { error } = await supabase.from("residentes").delete().eq("id", id);
  if (error) throw error;
};

export const getResidentStats = async () => {
  const { data, error } = await supabase.from("residentes").select("estado");
  if (error) throw error;
  const total = data.length;
  const activos = data.filter((r) => r.estado === "activo").length;
  const hospitalizados = data.filter((r) => r.estado === "hospitalizado").length;
  const egresados = data.filter((r) => r.estado === "egresado").length;
  return { total, activos, hospitalizados, egresados };
};
