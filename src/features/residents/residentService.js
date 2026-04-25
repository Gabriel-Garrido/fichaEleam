import { supabase } from "../../services/supabaseConfig";

// Obtiene el eleam_id del perfil del usuario autenticado actual
async function getMyEleamId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");
  const { data, error } = await supabase
    .from("profiles")
    .select("eleam_id")
    .eq("id", user.id)
    .single();
  if (error || !data?.eleam_id) throw new Error("ELEAM no encontrado para este usuario.");
  return { userId: user.id, eleamId: data.eleam_id };
}

export const getResidents = async (estado = null) => {
  // La RLS filtra automáticamente por eleam_id del usuario autenticado
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
  if (!isValidUUID(id)) throw new Error("ID de residente inválido.");
  // La RLS garantiza que solo se devuelve si pertenece al ELEAM del usuario
  const { data, error } = await supabase
    .from("residentes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
};

export const createResident = async (residentData) => {
  const { userId, eleamId } = await getMyEleamId();
  const { data, error } = await supabase
    .from("residentes")
    .insert({ ...residentData, creado_por: userId, eleam_id: eleamId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateResident = async (id, residentData) => {
  if (!isValidUUID(id)) throw new Error("ID de residente inválido.");
  // La RLS garantiza que solo se puede actualizar si pertenece al ELEAM del usuario
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
  if (!isValidUUID(id)) throw new Error("ID de residente inválido.");
  // La RLS garantiza que solo se puede eliminar si pertenece al ELEAM del usuario
  const { error } = await supabase.from("residentes").delete().eq("id", id);
  if (error) throw error;
};

export const getResidentStats = async () => {
  // La RLS filtra automáticamente al ELEAM del usuario
  const { data, error } = await supabase.from("residentes").select("estado");
  if (error) throw error;
  const total         = data.length;
  const activos       = data.filter((r) => r.estado === "activo").length;
  const hospitalizados = data.filter((r) => r.estado === "hospitalizado").length;
  const egresados     = data.filter((r) => r.estado === "egresado").length;
  return { total, activos, hospitalizados, egresados };
};

// Valida formato UUID v4
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}
