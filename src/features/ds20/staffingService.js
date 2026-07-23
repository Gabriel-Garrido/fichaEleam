import { ensureSupabase } from "../../services/serviceContext";
import { todayIso } from "../../utils/dateUtils";
import { getMyEleamContext } from "./ds20Service";

export const TURNOS_DS20 = ["mañana", "tarde", "noche"];

export const TIPO_DOTACION_LABEL = {
  cuidador: "Cuidador/a",
  tens: "TENS / auxiliar",
  profesional: "Profesional",
  manipulador: "Manipulador alimentos",
  aseo: "Aseo",
  administrativo: "Administrativo",
  otro: "Otro",
};

export const COMPETENCY_CATALOG = [
  "Medicamentos",
  "Signos vitales",
  "Alimentación por sonda",
  "Insulina y heparina",
  "Soporte vital básico",
  "Actividades de vida diaria",
  "Manipulación de alimentos",
];

const STAFF_SELECT = `
  id, eleam_id, profile_id, nombre, email, telefono, cargo, tipo_dotacion,
  activo, creado_en, actualizado_en,
  profile:profiles!staff_members_profile_id_fkey(rol)
`;

const COMPETENCY_SELECT = `
  id, eleam_id, staff_member_id, competencia, estado, fecha_emision,
  fecha_vencimiento, certificado_path, notas, registrado_por, creado_en, actualizado_en
`;

const TRAINING_SELECT = `
  id, eleam_id, staff_member_id, nombre, tema, fecha, horas, proveedor,
  certificado_path, notas, registrado_por, creado_en, actualizado_en
`;

const SHIFT_SELECT = `
  id, eleam_id, staff_member_id, fecha, turno, rol_turno, estado, notas,
  creado_por, creado_en, actualizado_en,
  staff:staff_members(id, nombre, cargo, tipo_dotacion, activo)
`;

function dateFromIso(value) {
  const [y, m, d] = String(value || todayIso()).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function dateToIsoLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mondayOfWeek(value = todayIso()) {
  const date = dateFromIso(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return dateToIsoLocal(date);
}

export function addDaysIso(value, days) {
  const date = dateFromIso(value);
  date.setDate(date.getDate() + days);
  return dateToIsoLocal(date);
}

export function shiftRoleForStaff(staffType) {
  if (staffType === "cuidador") return "cuidador";
  if (staffType === "tens") return "tens";
  if (staffType === "profesional") return "responsable";
  return "apoyo";
}

export async function syncStaffMembersFromProfiles() {
  const sb = ensureSupabase();
  const { eleamId } = await getMyEleamContext();
  const [{ data: profiles, error: profilesError }, { data: existing, error: existingError }] = await Promise.all([
    sb
      .from("profiles")
      .select("id, nombre, email, telefono, rol")
      .eq("eleam_id", eleamId)
      .in("rol", ["admin_eleam", "funcionario"])
      .order("nombre", { ascending: true }),
    sb
      .from("staff_members")
      .select(STAFF_SELECT)
      .eq("eleam_id", eleamId),
  ]);
  if (profilesError) throw profilesError;
  if (existingError) throw existingError;

  const byProfile = new Set((existing ?? []).map((row) => row.profile_id).filter(Boolean));
  const missing = (profiles ?? []).filter((profile) => !byProfile.has(profile.id));
  if (missing.length > 0) {
    const { error } = await sb.from("staff_members").insert(missing.map((profile) => ({
      eleam_id: eleamId,
      profile_id: profile.id,
      nombre: profile.nombre || profile.email,
      email: profile.email,
      telefono: profile.telefono,
      cargo: profile.rol === "admin_eleam" ? "Administrador/a" : "Funcionario/a",
      tipo_dotacion: profile.rol === "admin_eleam" ? "administrativo" : "cuidador",
      activo: true,
    })));
    if (error) throw error;
  }
  return listStaffMembers();
}

export async function listStaffMembers() {
  const sb = ensureSupabase();
  const { eleamId } = await getMyEleamContext();
  const { data, error } = await sb
    .from("staff_members")
    .select(STAFF_SELECT)
    .eq("eleam_id", eleamId)
    .order("activo", { ascending: false })
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createStaffMember(payload) {
  const sb = ensureSupabase();
  const { eleamId } = await getMyEleamContext();
  const { data, error } = await sb
    .from("staff_members")
    .insert({
      eleam_id: eleamId,
      nombre: payload.nombre.trim(),
      email: payload.email?.trim().toLowerCase() || null,
      telefono: payload.telefono?.trim() || null,
      cargo: payload.cargo?.trim() || null,
      tipo_dotacion: payload.tipo_dotacion || "cuidador",
      activo: true,
    })
    .select(STAFF_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateStaffMember(id, payload) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("staff_members")
    .update({
      nombre: payload.nombre?.trim() || undefined,
      telefono: payload.telefono?.trim() || null,
      cargo: payload.cargo || null,
      tipo_dotacion: payload.tipo_dotacion || "cuidador",
      activo: payload.activo !== false,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id)
    .select(STAFF_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function listCompetenciesAndTraining() {
  const sb = ensureSupabase();
  const { eleamId } = await getMyEleamContext();
  const [competencies, training] = await Promise.all([
    sb.from("staff_competencies").select(COMPETENCY_SELECT).eq("eleam_id", eleamId),
    sb.from("staff_training_records").select(TRAINING_SELECT).eq("eleam_id", eleamId).order("fecha", { ascending: false }),
  ]);
  if (competencies.error) throw competencies.error;
  if (training.error) throw training.error;
  return { competencies: competencies.data ?? [], training: training.data ?? [] };
}

export async function saveCompetency(staffMemberId, payload) {
  const sb = ensureSupabase();
  const { userId, eleamId } = await getMyEleamContext();
  const row = {
    eleam_id: eleamId,
    staff_member_id: staffMemberId,
    competencia: payload.competencia,
    estado: payload.estado || "vigente",
    fecha_emision: payload.fecha_emision || null,
    fecha_vencimiento: payload.fecha_vencimiento || null,
    notas: payload.notas || null,
    registrado_por: userId,
    actualizado_en: new Date().toISOString(),
  };
  const { data, error } = await sb
    .from("staff_competencies")
    .upsert(row, { onConflict: "staff_member_id,competencia" })
    .select(COMPETENCY_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function saveTrainingRecord(staffMemberId, payload) {
  const sb = ensureSupabase();
  const { userId, eleamId } = await getMyEleamContext();
  const { data, error } = await sb
    .from("staff_training_records")
    .insert({
      eleam_id: eleamId,
      staff_member_id: staffMemberId || null,
      nombre: payload.nombre,
      tema: payload.tema || null,
      fecha: payload.fecha || todayIso(),
      horas: Number(payload.horas) || 0,
      proveedor: payload.proveedor || null,
      notas: payload.notas || null,
      registrado_por: userId,
    })
    .select(TRAINING_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function listShiftAssignments({ from, to }) {
  const sb = ensureSupabase();
  const { eleamId } = await getMyEleamContext();
  const { data, error } = await sb
    .from("staff_shift_assignments")
    .select(SHIFT_SELECT)
    .eq("eleam_id", eleamId)
    .gte("fecha", from)
    .lte("fecha", to)
    .order("fecha", { ascending: true })
    .order("turno", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveShiftAssignment(payload) {
  const sb = ensureSupabase();
  const { userId, eleamId } = await getMyEleamContext();
  const row = {
    eleam_id: eleamId,
    staff_member_id: payload.staff_member_id,
    fecha: payload.fecha,
    turno: payload.turno,
    rol_turno: payload.rol_turno || "cuidador",
    estado: payload.estado || "programado",
    notas: payload.notas || null,
    creado_por: userId,
    actualizado_en: new Date().toISOString(),
  };
  const { data, error } = await sb
    .from("staff_shift_assignments")
    .upsert(row, { onConflict: "staff_member_id,fecha,turno" })
    .select(SHIFT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteShiftAssignment(id) {
  const sb = ensureSupabase();
  const { error } = await sb.from("staff_shift_assignments").delete().eq("id", id);
  if (error) throw error;
}

export async function getStaffingCompliance({ from, to }) {
  const sb = ensureSupabase();
  const { data, error } = await sb.rpc("ds20_staffing_compliance", {
    p_fecha_desde: from,
    p_fecha_hasta: to,
  });
  if (error) throw error;
  return data ?? [];
}

export async function copyPreviousWeek({ weekStart }) {
  const currentStart = mondayOfWeek(weekStart);
  const previousStart = addDaysIso(currentStart, -7);
  const previousEnd = addDaysIso(previousStart, 6);
  const previous = await listShiftAssignments({ from: previousStart, to: previousEnd });
  if (previous.length === 0) return [];
  const sb = ensureSupabase();
  const { userId, eleamId } = await getMyEleamContext();
  const rows = previous.map((item) => ({
      eleam_id: eleamId,
      staff_member_id: item.staff_member_id,
      fecha: addDaysIso(item.fecha, 7),
      turno: item.turno,
      rol_turno: item.rol_turno,
      estado: item.estado === "cancelado" ? "programado" : item.estado,
      notas: item.notas,
      creado_por: userId,
      actualizado_en: new Date().toISOString(),
  }));
  const { data, error } = await sb
    .from("staff_shift_assignments")
    .upsert(rows, { onConflict: "staff_member_id,fecha,turno" })
    .select(SHIFT_SELECT);
  if (error) throw error;
  return data ?? [];
}
