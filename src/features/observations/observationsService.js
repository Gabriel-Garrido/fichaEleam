import { supabase } from "../../services/supabaseConfig";
import { localDateTimeToIso } from "../../utils/dateUtils";
import { withResidentLocation } from "../beds/bedsUtils";

const OBSERVATION_SELECT = `
  id, residente_id, fecha_hora, turno, tipo, descripcion, acciones_tomadas,
  requiere_seguimiento, seguimiento_fecha, seguimiento_turno, seguimiento_estado,
  registrado_por,
  creado_en, actualizado_en
`;

export const getObservations = async (
  residenteId = null,
  { limit = 50, offset = 0, desde = null, hasta = null, tipo = null, soloSeguimiento = false, search = null } = {}
) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  let query = supabase
    .from("observaciones_diarias")
    .select(`${OBSERVATION_SELECT}, residentes(
      id, nombre, apellido, cama_actual_id,
      cama_actual:camas!residentes_cama_actual_id_fkey(
        id, codigo, nombre, tipo, estado,
        habitacion:habitaciones!camas_habitacion_id_fkey(id, codigo, nombre, piso, sector, estado)
      )
    )`)
    .order("fecha_hora", { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1);

  if (residenteId)    query = query.eq("residente_id", residenteId);
  // Convert local date boundaries to UTC ISO strings so timestamptz comparisons
  // respect the browser's timezone (e.g. UTC-3 Chile).
  if (desde)          query = query.gte("fecha_hora", new Date(desde + "T00:00:00").toISOString());
  if (hasta)          query = query.lte("fecha_hora", new Date(hasta + "T23:59:59").toISOString());
  if (tipo)           query = query.eq("tipo", tipo);
  if (soloSeguimiento) query = query.eq("requiere_seguimiento", true);
  if (search) {
    const term = String(search).trim();
    if (term) {
      // Escapar comas y paréntesis para evitar inyección en el filtro `or`.
      const safe = term.replace(/[,()]/g, " ");
      query = query.or(`descripcion.ilike.%${safe}%,acciones_tomadas.ilike.%${safe}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const authorIds = [...new Set(rows.map((row) => row.registrado_por).filter(Boolean))];
  if (authorIds.length === 0) return rows;

  const { data: authors } = await supabase
    .from("profiles")
    .select("id, nombre")
    .in("id", authorIds);
  const authorById = new Map((authors ?? []).map((author) => [author.id, author.nombre]));
  return rows.map((row) => ({
    ...row,
    registrado_por_nombre: authorById.get(row.registrado_por) ?? null,
  }));
};

export const createObservation = async (payload) => {
  const { data: { user } } = await supabase.auth.getUser();
  const requiereSeguimiento = payload.requiere_seguimiento === true;
  const fechaHora = localDateTimeToIso(payload.fecha_hora);
  if (!fechaHora) throw new Error("La fecha y hora del registro no es válida.");
  const cleanPayload = {
    ...payload,
    fecha_hora: fechaHora,
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
  if (Object.hasOwn(payload, "fecha_hora")) {
    const fechaHora = localDateTimeToIso(payload.fecha_hora);
    if (!fechaHora) throw new Error("La fecha y hora del registro no es válida.");
    cleanPayload.fecha_hora = fechaHora;
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

export const getPendingSeguimientos = async (fecha, turno, { residenteId = null } = {}) => {
  const turnosHastaAhora = ["mañana", "tarde", "noche"].slice(0, ["mañana", "tarde", "noche"].indexOf(turno) + 1);
  if (!fecha || turnosHastaAhora.length === 0) return [];
  let query = supabase
    .from("observaciones_diarias")
    .select(`${OBSERVATION_SELECT}, residentes(
      id, nombre, apellido, cama_actual_id,
      cama_actual:camas!residentes_cama_actual_id_fkey(
        id, codigo, nombre, tipo, estado,
        habitacion:habitaciones!camas_habitacion_id_fkey(id, codigo, nombre, piso, sector, estado)
      )
    )`)
    .eq("requiere_seguimiento", true)
    .eq("seguimiento_estado", "pendiente")
    .or(`seguimiento_fecha.lt.${fecha},and(seguimiento_fecha.eq.${fecha},seguimiento_turno.in.(${turnosHastaAhora.join(",")}))`)
    .order("seguimiento_fecha", { ascending: true })
    .order("creado_en", { ascending: true })
    .limit(200);

  if (residenteId) query = query.eq("residente_id", residenteId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, residentes: withResidentLocation(row.residentes) }));
};

export const resolverSeguimiento = async (id, { notas = null } = {}) => {
  const cleanNotes = notas?.trim();
  if (!cleanNotes) {
    throw new Error("Debes registrar la evolución antes de finalizar el seguimiento.");
  }
  const { data, error } = await supabase.rpc("gestionar_seguimiento_observacion", {
    p_observacion_id: id,
    p_notas: cleanNotes,
    p_nueva_fecha: null,
    p_nuevo_turno: null,
  });
  if (error) throw error;
  return data?.resuelta;
};

export const continuarSeguimiento = async (id, { notas = null, nuevaFecha, nuevoTurno } = {}) => {
  const cleanNotes = notas?.trim();
  if (!cleanNotes) {
    throw new Error("Debes registrar la evolución antes de continuar el seguimiento.");
  }
  if (!nuevaFecha || !nuevoTurno) {
    throw new Error("Debes indicar fecha y turno para continuar el seguimiento.");
  }
  const { data, error } = await supabase.rpc("gestionar_seguimiento_observacion", {
    p_observacion_id: id,
    p_notas: cleanNotes,
    p_nueva_fecha: nuevaFecha,
    p_nuevo_turno: nuevoTurno,
  });
  if (error) throw error;
  return data;
};
