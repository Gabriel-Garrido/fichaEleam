import { supabase } from "../../services/supabaseConfig";
import { getRequisitosEleam, getObservaciones, buildResumen } from "../accreditation/accreditationService";
import { recordOverallStatus, recordOverallLabel, VITAL_DEFS } from "../vitalSigns/vitalRanges";

export const TURNOS = ["mañana", "tarde", "noche"];

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function currentTurno(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 7 && hour < 14) return "mañana";
  if (hour >= 14 && hour < 21) return "tarde";
  return "noche";
}

export function turnoLabel(turno) {
  return turno ? turno.charAt(0).toUpperCase() + turno.slice(1) : "Turno";
}

function dayBounds(fecha) {
  const start = new Date(`${fecha}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function recentBounds(fecha, days = 3) {
  const end = new Date(`${fecha}T23:59:59`);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start: start.toISOString(), end: end.toISOString() };
}

function fullName(residente) {
  return [residente?.nombre, residente?.apellido].filter(Boolean).join(" ").trim() || "Residente";
}

function residentMeta(residente) {
  return {
    id: residente?.id,
    nombre: fullName(residente),
    habitacion: residente?.habitacion ?? null,
    cama: residente?.cama ?? null,
    nivel_dependencia: residente?.nivel_dependencia ?? null,
  };
}

function criticalDetails(record) {
  return Object.entries(VITAL_DEFS)
    .map(([key, def]) => {
      const status = def.statusFor(record);
      if (status !== "critical" && status !== "warning") return null;
      const value = key === "presion"
        ? def.format(record.presion_sistolica, record.presion_diastolica)
        : def.format(record[
            key === "fc" ? "frecuencia_cardiaca" :
            key === "fr" ? "frecuencia_respiratoria" :
            key === "temp" ? "temperatura" :
            key === "spo2" ? "saturacion_oxigeno" :
            key === "dolor" ? "dolor_escala" : key
          ]);
      return { key, label: def.short, value, status };
    })
    .filter(Boolean);
}

async function getMyEleamId() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Debes iniciar sesión.");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, eleam_id, rol")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.eleam_id) throw new Error("Tu cuenta no tiene ELEAM asociado.");
  return { eleamId: data.eleam_id, userId, rol: data.rol };
}

async function loadActiveResidents() {
  const { data, error } = await supabase
    .from("residentes")
    .select("id, nombre, apellido, habitacion, cama, nivel_dependencia, estado")
    .eq("estado", "activo")
    .order("apellido", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function loadVitals(fecha) {
  const { start, end } = dayBounds(fecha);
  const { data, error } = await supabase
    .from("signos_vitales")
    .select(`
      id, residente_id, fecha_hora, turno,
      presion_sistolica, presion_diastolica, frecuencia_cardiaca,
      frecuencia_respiratoria, temperatura, saturacion_oxigeno,
      glucosa, dolor_escala,
      residentes(id, nombre, apellido, habitacion, cama, nivel_dependencia)
    `)
    .gte("fecha_hora", start)
    .lt("fecha_hora", end)
    .order("fecha_hora", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function loadObservations(fecha) {
  const { start, end } = dayBounds(fecha);
  const recent = recentBounds(fecha, 3);
  const [today, incidents] = await Promise.all([
    supabase
      .from("observaciones_diarias")
      .select("id, residente_id, fecha_hora, turno, tipo, descripcion, acciones_tomadas, requiere_seguimiento, residentes(id, nombre, apellido, habitacion, cama)")
      .gte("fecha_hora", start)
      .lt("fecha_hora", end)
      .order("fecha_hora", { ascending: false }),
    supabase
      .from("observaciones_diarias")
      .select("id, residente_id, fecha_hora, turno, tipo, descripcion, requiere_seguimiento, residentes(id, nombre, apellido, habitacion, cama)")
      .in("tipo", ["caida", "incidente"])
      .gte("fecha_hora", recent.start)
      .lte("fecha_hora", recent.end)
      .order("fecha_hora", { ascending: false })
      .limit(12),
  ]);
  if (today.error) throw today.error;
  if (incidents.error) throw incidents.error;
  return {
    today: today.data ?? [],
    incidents: incidents.data ?? [],
  };
}

async function loadSeremiAlerts() {
  try {
    const [requisitos, observaciones] = await Promise.all([
      getRequisitosEleam(),
      getObservaciones({ soloAbiertas: true }),
    ]);
    const resumen = buildResumen(requisitos);
    return {
      vencidos: (resumen.vencidos ?? []).slice(0, 6),
      porVencer: (resumen.porVencer ?? []).slice(0, 6),
      observaciones: (observaciones ?? []).slice(0, 6),
    };
  } catch (error) {
    console.warn("No se pudo cargar resumen SEREMI para entrega de turno:", error);
    return { vencidos: [], porVencer: [], observaciones: [], error: true };
  }
}

export async function buildTurnoSummary({ fecha = todayIso(), turno = currentTurno() } = {}) {
  const [residentes, signos, obs, seremi] = await Promise.all([
    loadActiveResidents(),
    loadVitals(fecha),
    loadObservations(fecha),
    loadSeremiAlerts(),
  ]);

  const vitalsByResident = new Map();
  for (const signo of signos) {
    if (!vitalsByResident.has(signo.residente_id)) vitalsByResident.set(signo.residente_id, signo);
  }

  const sinSignos = residentes
    .filter((residente) => !vitalsByResident.has(residente.id))
    .map(residentMeta);

  const signosAtencion = signos
    .map((signo) => {
      const status = recordOverallStatus(signo);
      if (status !== "critical" && status !== "warning") return null;
      return {
        id: signo.id,
        fecha_hora: signo.fecha_hora,
        turno: signo.turno,
        status,
        label: recordOverallLabel(signo).label,
        residente: residentMeta(signo.residentes),
        detalles: criticalDetails(signo),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "critical" ? -1 : 1))
    .slice(0, 12);

  const seguimiento = obs.today
    .filter((item) => item.requiere_seguimiento)
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      tipo: item.tipo,
      descripcion: item.descripcion,
      acciones_tomadas: item.acciones_tomadas,
      fecha_hora: item.fecha_hora,
      residente: residentMeta(item.residentes),
    }));

  const actividadTurno = {
    signos: signos.filter((item) => item.turno === turno).length,
    observaciones: obs.today.filter((item) => item.turno === turno).length,
  };

  return {
    fecha,
    turno,
    generado_en: new Date().toISOString(),
    residentes_activos: residentes.length,
    sin_signos_hoy: sinSignos,
    signos_atencion: signosAtencion,
    seguimientos: seguimiento,
    incidentes_recientes: obs.incidents.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      descripcion: item.descripcion,
      fecha_hora: item.fecha_hora,
      residente: residentMeta(item.residentes),
    })),
    seremi,
    actividad_turno: actividadTurno,
    actividad_dia: {
      signos: signos.length,
      observaciones: obs.today.length,
    },
  };
}

export async function listTurnoEntregas(limit = 30) {
  const { data, error } = await supabase
    .from("turno_entregas")
    .select("id, eleam_id, turno, fecha, resumen_json, notas, pendientes, creado_por, creado_en, actualizado_en")
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getTurnoEntrega(id) {
  const { data, error } = await supabase
    .from("turno_entregas")
    .select("id, eleam_id, turno, fecha, resumen_json, notas, pendientes, creado_por, creado_en, actualizado_en")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveTurnoEntrega({ fecha, turno, resumen, notas, pendientes }) {
  const { eleamId, userId } = await getMyEleamId();
  const payload = {
    eleam_id: eleamId,
    fecha,
    turno,
    resumen_json: resumen ?? {},
    notas: notas?.trim() || null,
    pendientes: pendientes?.trim() || null,
    creado_por: userId,
  };

  const { data, error } = await supabase
    .from("turno_entregas")
    .upsert(payload, { onConflict: "eleam_id,fecha,turno" })
    .select("id, eleam_id, turno, fecha, resumen_json, notas, pendientes, creado_por, creado_en, actualizado_en")
    .single();
  if (error) throw error;
  return data;
}
