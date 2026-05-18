import { supabase } from "../../services/supabaseConfig";
import {
  attachAssignmentsToBeds,
  buildBedMetrics,
  groupBedsByRoom,
  normalizeAssignment,
  withResidentLocation,
} from "./bedsUtils";

const ROOM_SELECT = `
  id, eleam_id, codigo, nombre, piso, sector, estado, notas, orden,
  creado_por, actualizado_por, creado_en, actualizado_en
`;

const BED_SELECT = `
  id, eleam_id, habitacion_id, codigo, nombre, tipo, estado, notas, orden,
  creado_por, actualizado_por, creado_en, actualizado_en,
  habitacion:habitaciones!camas_habitacion_id_fkey(
    id, eleam_id, codigo, nombre, piso, sector, estado, notas, orden
  )
`;

export const RESIDENT_LOCATION_SELECT = `
  cama_actual_id,
  cama_actual:camas!residentes_cama_actual_id_fkey(
    id, eleam_id, habitacion_id, codigo, nombre, tipo, estado, notas, orden,
    habitacion:habitaciones!camas_habitacion_id_fkey(
      id, eleam_id, codigo, nombre, piso, sector, estado, notas, orden
    )
  )
`;

const RESIDENT_SELECT = `
  id, eleam_id, nombre, apellido, rut, estado, nivel_dependencia,
  diagnostico_principal, alergias, fecha_ingreso, ${RESIDENT_LOCATION_SELECT}
`;

const ASSIGNMENT_SELECT = `
  id, eleam_id, cama_id, residente_id, estado, fecha_inicio, fecha_fin,
  motivo_fin, notas, creado_por, cerrado_por, creado_en, actualizado_en,
  residente:residentes!cama_asignaciones_residente_id_fkey(
    id, eleam_id, nombre, apellido, rut, estado, nivel_dependencia,
    diagnostico_principal, alergias, fecha_ingreso, cama_actual_id
  )
`;

async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Debe iniciar sesion.");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, eleam_id, rol")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  if (!data?.eleam_id && data?.rol !== "superadmin") {
    throw new Error("ELEAM no encontrado para este usuario.");
  }
  return { userId: user.id, eleamId: data.eleam_id, rol: data.rol };
}

function cleanText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function cleanInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roomPayload(form, profile) {
  return {
    codigo: cleanText(form.codigo),
    nombre: cleanText(form.nombre),
    piso: cleanText(form.piso),
    sector: cleanText(form.sector),
    estado: form.estado || "operativa",
    notas: cleanText(form.notas),
    orden: cleanInteger(form.orden),
    actualizado_por: profile.userId,
  };
}

function bedPayload(form, profile) {
  return {
    habitacion_id: form.habitacion_id,
    codigo: cleanText(form.codigo),
    nombre: cleanText(form.nombre),
    tipo: form.tipo || "estandar",
    estado: form.estado || "operativa",
    notas: cleanText(form.notas),
    orden: cleanInteger(form.orden),
    actualizado_por: profile.userId,
  };
}

export async function getBedsOverview() {
  const [rooms, beds, assignments, residents] = await Promise.all([
    supabase
      .from("habitaciones")
      .select(ROOM_SELECT)
      .order("orden", { ascending: true })
      .order("codigo", { ascending: true }),
    supabase
      .from("camas")
      .select(BED_SELECT)
      .order("orden", { ascending: true })
      .order("codigo", { ascending: true }),
    supabase
      .from("cama_asignaciones")
      .select(ASSIGNMENT_SELECT)
      .is("fecha_fin", null)
      .order("fecha_inicio", { ascending: false }),
    supabase
      .from("residentes")
      .select(RESIDENT_SELECT)
      .in("estado", ["activo", "hospitalizado"])
      .order("apellido", { ascending: true }),
  ]);

  for (const result of [rooms, beds, assignments, residents]) {
    if (result.error) throw result.error;
  }

  const normalizedAssignments = (assignments.data ?? []).map(normalizeAssignment);
  const normalizedBeds = attachAssignmentsToBeds(beds.data ?? [], normalizedAssignments);
  const normalizedResidents = (residents.data ?? []).map(withResidentLocation);
  const groupedRooms = groupBedsByRoom(rooms.data ?? [], normalizedBeds);
  const metrics = buildBedMetrics({
    camas: normalizedBeds,
    residentes: normalizedResidents,
  });

  return {
    habitaciones: rooms.data ?? [],
    camas: normalizedBeds,
    asignaciones: normalizedAssignments,
    residentes: normalizedResidents,
    roomsWithBeds: groupedRooms,
    metrics,
  };
}

export async function getAssignableResidents() {
  const { data, error } = await supabase
    .from("residentes")
    .select(RESIDENT_SELECT)
    .eq("estado", "activo")
    .order("apellido", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(withResidentLocation);
}

export async function saveHabitacion(form) {
  const profile = await getMyProfile();
  const payload = roomPayload(form, profile);
  if (!payload.codigo) throw new Error("El codigo de la habitacion es obligatorio.");

  const query = form.id
    ? supabase.from("habitaciones").update(payload).eq("id", form.id)
    : supabase.from("habitaciones").insert({
        ...payload,
        eleam_id: profile.eleamId,
        creado_por: profile.userId,
      });

  const { data, error } = await query.select(ROOM_SELECT).single();
  if (error) throw error;
  return data;
}

export async function saveCama(form) {
  const profile = await getMyProfile();
  const payload = bedPayload(form, profile);
  if (!payload.habitacion_id) throw new Error("Selecciona una habitacion para la cama.");
  if (!payload.codigo) throw new Error("El codigo de la cama es obligatorio.");

  const query = form.id
    ? supabase.from("camas").update(payload).eq("id", form.id)
    : supabase.from("camas").insert({
        ...payload,
        eleam_id: profile.eleamId,
        creado_por: profile.userId,
      });

  const { data, error } = await query.select(BED_SELECT).single();
  if (error) throw error;
  return data;
}

export async function deleteHabitacion(id) {
  const { error } = await supabase.from("habitaciones").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteCama(id) {
  const { error } = await supabase.from("camas").delete().eq("id", id);
  if (error) throw error;
}

export async function assignResidentToBed(residenteId, camaId, notas = null) {
  const { data, error } = await supabase.rpc("asignar_residente_a_cama", {
    p_residente_id: residenteId,
    p_cama_id: camaId,
    p_notas: notas,
  });
  if (error) throw error;
  return data;
}

export async function releaseResidentBed(residenteId, motivo = "liberacion", notas = null) {
  const { data, error } = await supabase.rpc("liberar_cama_residente", {
    p_residente_id: residenteId,
    p_motivo: motivo,
    p_notas: notas,
  });
  if (error) throw error;
  return data;
}

export async function resolveHospitalizationBed(residenteId, accion, notas = null) {
  const { data, error } = await supabase.rpc("resolver_cama_hospitalizacion", {
    p_residente_id: residenteId,
    p_accion: accion,
    p_notas: notas,
  });
  if (error) throw error;
  return data;
}

export async function getBedOccupancySummary() {
  const overview = await getBedsOverview();
  return overview.metrics;
}
