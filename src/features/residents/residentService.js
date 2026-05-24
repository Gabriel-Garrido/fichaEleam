import { supabase } from "../../services/supabaseConfig";
import { isValidUUID } from "../../utils/validators";
import { withResidentLocation } from "../beds/bedsUtils";
import { createStaffUser } from "../team/teamService";

const RESIDENT_SELECT = `
  id, eleam_id, nombre, apellido, rut, fecha_nacimiento, sexo,
  nacionalidad, estado_civil, direccion_anterior,
  prevision, diagnostico_principal, diagnosticos_secundarios,
  alergias, grupo_sanguineo, fecha_ingreso, fecha_egreso,
  motivo_egreso, estado, cama_actual_id,
  indice_barthel, escala_katz, nivel_dependencia,
  creado_por, creado_en, actualizado_en,
  cama_actual:camas!residentes_cama_actual_id_fkey(
    id, eleam_id, habitacion_id, codigo, nombre, tipo, estado, notas, orden,
    habitacion:habitaciones!camas_habitacion_id_fkey(
      id, eleam_id, codigo, nombre, piso, sector, estado, notas, orden
    )
  )
`;

function stripLocationFields(payload = {}) {
  const clean = { ...payload };
  delete clean.habitacion;
  delete clean.cama;
  delete clean.cama_actual;
  delete clean.cama_actual_id;
  delete clean.ubicacion_label;
  return clean;
}

// Obtiene el eleam_id del perfil del usuario autenticado actual
async function getMyEleamId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");
  const { data, error } = await supabase
    .from("profiles")
    .select("eleam_id, rol")
    .eq("id", user.id)
    .single();
  if (error || !data?.eleam_id) throw new Error("ELEAM no encontrado para este usuario.");
  return { userId: user.id, eleamId: data.eleam_id, rol: data.rol };
}

export const getResidents = async (estado = null) => {
  // La RLS filtra automáticamente por eleam_id del usuario autenticado
  let query = supabase
    .from("residentes")
    .select(RESIDENT_SELECT)
    .order("apellido", { ascending: true });

  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(withResidentLocation);
};

export const getResidentById = async (id) => {
  if (!isValidUUID(id)) throw new Error("ID de residente inválido.");
  // La RLS garantiza que solo se devuelve si pertenece al ELEAM del usuario
  const { data, error } = await supabase
    .from("residentes")
    .select(RESIDENT_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return withResidentLocation(data);
};

export const createResident = async (residentData) => {
  const { userId, eleamId } = await getMyEleamId();
  const payload = stripLocationFields(residentData);
  const { data, error } = await supabase
    .from("residentes")
    .insert({ ...payload, creado_por: userId, eleam_id: eleamId })
    .select(RESIDENT_SELECT)
    .single();
  if (error) throw error;
  return withResidentLocation(data);
};

export const createResidentsBatch = async (rows, onProgress = null) => {
  const { userId, eleamId, rol } = await getMyEleamId();
  if (rol !== "admin_eleam") {
    throw new Error("Solo el administrador del ELEAM puede cargar residentes desde Excel.");
  }
  const results = [];
  let done = 0;

  for (const row of rows) {
    let createdResident = null;
    try {
      const payload = stripLocationFields(row.payload);
      const { data, error } = await supabase
        .from("residentes")
        .insert({ ...payload, creado_por: userId, eleam_id: eleamId })
        .select(RESIDENT_SELECT)
        .single();
      if (error) throw error;
      createdResident = withResidentLocation(data);
      if (!row.familyPayload) {
        throw new Error("Cada residente debe incluir un familiar responsable completo.");
      }
      const family = await createStaffUser({
        nombre: row.familyPayload.nombre,
        email: row.familyPayload.email,
        telefono: row.familyPayload.telefono,
        parentesco: row.familyPayload.parentesco,
        rol: "familiar",
        residenteId: createdResident.id,
      });
      results.push({ ok: true, rowNumber: row.rowNumber, label: row.label, data: createdResident, family });
    } catch (error) {
      let rollbackWarning = "";
      if (createdResident?.id) {
        const { error: deleteError } = await supabase.from("residentes").delete().eq("id", createdResident.id);
        if (deleteError) rollbackWarning = " El residente quedó creado; elimina o vincula el familiar manualmente.";
      }
      const message =
        error?.code === "23505"
          ? "Ya existe un residente con ese RUT en este establecimiento."
          : error?.message || "No se pudo crear el residente.";
      results.push({ ok: false, rowNumber: row.rowNumber, label: row.label, error: `${message}${rollbackWarning}` });
    } finally {
      done += 1;
      onProgress?.(done, rows.length);
    }
  }

  return results;
};

export const updateResident = async (id, residentData) => {
  if (!isValidUUID(id)) throw new Error("ID de residente inválido.");
  const payload = stripLocationFields(residentData);
  // La RLS garantiza que solo se puede actualizar si pertenece al ELEAM del usuario
  const { data, error } = await supabase
    .from("residentes")
    .update({ ...payload, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .select(RESIDENT_SELECT)
    .single();
  if (error) throw error;
  return withResidentLocation(data);
};

export const deleteResident = async (id) => {
  if (!isValidUUID(id)) throw new Error("ID de residente inválido.");
  // La RLS garantiza que solo se puede eliminar si pertenece al ELEAM del usuario
  const { error } = await supabase.from("residentes").delete().eq("id", id);
  if (error) throw error;
};

export const getFamiliarForResidente = async (residenteId) => {
  if (!isValidUUID(residenteId)) return null;
  const { data, error } = await supabase
    .from("familiar_residentes")
    .select("parentesco, profile_id, profiles!familiar_residentes_profile_id_fkey(id, nombre, email, telefono)")
    .eq("residente_id", residenteId)
    .order("creado_en", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const removeFamiliarLink = async (residenteId) => {
  if (!isValidUUID(residenteId)) throw new Error("ID de residente inválido.");
  const { error } = await supabase
    .from("familiar_residentes")
    .delete()
    .eq("residente_id", residenteId);
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

export const getResidentQuotaUsage = async (excludeId = null) => {
  let query = supabase
    .from("residentes")
    .select("id, estado")
    .in("estado", ["activo", "hospitalizado"]);

  if (excludeId && isValidUUID(excludeId)) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).length;
};
