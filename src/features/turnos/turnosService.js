import { supabase } from "../../services/supabaseConfig";
import { getRequisitosEleam, getObservaciones, buildResumen } from "../accreditation/accreditationService";
import { recordOverallStatus, recordOverallLabel, VITAL_DEFS } from "../vitalSigns/vitalRanges";
import { CARE_OPEN_STATUSES, isCareTaskOverdue, listCareTasks, getSessionProfile, todayIso, currentTurno } from "../carePlans/carePlansService";
import { listMedicationAdministrations } from "../emar/emarService";

export const TURNOS = ["mañana", "tarde", "noche"];

export { todayIso, currentTurno };

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

async function loadObservations(fecha, turno) {
  const { start, end } = dayBounds(fecha);
  const recent = recentBounds(fecha, 3);
  const [today, incidents, followups] = await Promise.all([
    supabase
      .from("observaciones_diarias")
      .select("id, residente_id, fecha_hora, turno, tipo, descripcion, acciones_tomadas, requiere_seguimiento, seguimiento_fecha, seguimiento_turno, seguimiento_estado, residentes(id, nombre, apellido, habitacion, cama)")
      .gte("fecha_hora", start)
      .lt("fecha_hora", end)
      .order("fecha_hora", { ascending: false }),
    supabase
      .from("observaciones_diarias")
      .select("id, residente_id, fecha_hora, turno, tipo, descripcion, requiere_seguimiento, seguimiento_fecha, seguimiento_turno, seguimiento_estado, residentes(id, nombre, apellido, habitacion, cama)")
      .in("tipo", ["caida", "incidente"])
      .gte("fecha_hora", recent.start)
      .lte("fecha_hora", recent.end)
      .order("fecha_hora", { ascending: false })
      .limit(12),
    supabase
      .from("observaciones_diarias")
      .select("id, residente_id, fecha_hora, turno, tipo, descripcion, acciones_tomadas, requiere_seguimiento, seguimiento_fecha, seguimiento_turno, seguimiento_estado, residentes(id, nombre, apellido, habitacion, cama)")
      .eq("requiere_seguimiento", true)
      .eq("seguimiento_fecha", fecha)
      .eq("seguimiento_turno", turno)
      .eq("seguimiento_estado", "pendiente")
      .order("fecha_hora", { ascending: true }),
  ]);
  if (today.error) throw today.error;
  if (incidents.error) throw incidents.error;
  if (followups.error) throw followups.error;
  return {
    today: today.data ?? [],
    incidents: incidents.data ?? [],
    followups: followups.data ?? [],
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

function summarizeRows(rows, statusKeys) {
  return rows.reduce((acc, row) => {
    acc.total += 1;
    if (statusKeys.includes(row.estado)) acc[row.estado] = (acc[row.estado] ?? 0) + 1;
    return acc;
  }, Object.fromEntries([["total", 0], ...statusKeys.map((key) => [key, 0])]));
}

function isDueNow(row, status = "pendiente") {
  if (row._arrastre) return true;
  if (row.estado !== status || row.fecha !== todayIso() || !row.hora) return false;
  const due = new Date(`${row.fecha}T${row.hora}`);
  return !Number.isNaN(due.valueOf()) && due < new Date();
}

async function loadCareTurno(fecha, turno) {
  try {
    const rows = await listCareTasks({ fecha, turno, estado: null, generate: true, limit: 300 });
    const resumen = summarizeRows(rows, ["pendiente", "cumplida", "omitida", "reprogramada", "cancelada"]);
    resumen.pendientes_operativos = rows.filter((row) => CARE_OPEN_STATUSES.includes(row.estado)).length;
    resumen.vencidas = rows.filter((row) => isCareTaskOverdue(row)).length;
    return {
      resumen,
      pendientes: rows
        .filter((row) => CARE_OPEN_STATUSES.includes(row.estado))
        .slice(0, 12)
        .map((row) => ({
          id: row.id,
          hora: row.hora,
          estado: row.estado,
          titulo: row.actividad?.titulo ?? "Actividad de cuidado",
          categoria: row.actividad?.categoria ?? null,
          prioridad: row.actividad?.prioridad ?? "media",
          instrucciones: row.actividad?.instrucciones ?? null,
          residente: residentMeta(row.residentes),
          vencida: isCareTaskOverdue(row),
          reprogramada_para: row.reprogramada_para ?? null,
        })),
      omitidas: rows
        .filter((row) => row.estado === "omitida")
        .slice(0, 6)
        .map((row) => ({
          id: row.id,
          hora: row.hora,
          titulo: row.actividad?.titulo ?? "Actividad de cuidado",
          motivo_omision: row.motivo_omision,
          residente: residentMeta(row.residentes),
        })),
    };
  } catch (error) {
    console.warn("No se pudo cargar tareas de cuidado para entrega de turno:", error);
    return {
      resumen: { total: 0, pendiente: 0, cumplida: 0, omitida: 0, reprogramada: 0, cancelada: 0, vencidas: 0, pendientes_operativos: 0 },
      pendientes: [],
      omitidas: [],
      error: true,
    };
  }
}

async function loadEmarTurno(fecha, turno) {
  try {
    const rows = await listMedicationAdministrations({ fecha, turno, estado: null, generate: true, limit: 300 });
    const resumen = summarizeRows(rows, ["pendiente", "administrado", "omitido", "pendiente_validacion", "validado", "cancelado"]);
    resumen.controlados = rows.filter((row) => row.indicacion?.es_controlado).length;
    resumen.vencidas = rows.filter((row) => isDueNow(row)).length;
    return {
      resumen,
      pendientes: rows
        .filter((row) => row.estado === "pendiente")
        .slice(0, 12)
        .map((row) => ({
          id: row.id,
          hora: row.hora,
          medicamento: row.indicacion?.medicamento_nombre ?? "Medicamento",
          dosis: row.indicacion?.dosis ?? null,
          via: row.indicacion?.via ?? null,
          controlado: row.indicacion?.es_controlado === true,
          residente: residentMeta(row.residentes),
          vencida: isDueNow(row),
        })),
      por_validar: rows
        .filter((row) => row.estado === "pendiente_validacion")
        .slice(0, 12)
        .map((row) => ({
          id: row.id,
          hora: row.hora,
          medicamento: row.indicacion?.medicamento_nombre ?? "Medicamento",
          dosis: row.indicacion?.dosis ?? null,
          residente: residentMeta(row.residentes),
        })),
      omitidas: rows
        .filter((row) => row.estado === "omitido")
        .slice(0, 6)
        .map((row) => ({
          id: row.id,
          hora: row.hora,
          medicamento: row.indicacion?.medicamento_nombre ?? "Medicamento",
          motivo_omision: row.motivo_omision,
          residente: residentMeta(row.residentes),
        })),
    };
  } catch (error) {
    console.warn("No se pudo cargar eMAR para entrega de turno:", error);
    return {
      resumen: { total: 0, pendiente: 0, administrado: 0, omitido: 0, pendiente_validacion: 0, validado: 0, cancelado: 0, controlados: 0, vencidas: 0 },
      pendientes: [],
      por_validar: [],
      omitidas: [],
      error: true,
    };
  }
}

export async function buildTurnoSummary({ fecha = todayIso(), turno = currentTurno() } = {}) {
  const [residentes, signos, obs, seremi, careTurno, emarTurno] = await Promise.all([
    loadActiveResidents(),
    loadVitals(fecha),
    loadObservations(fecha, turno),
    loadSeremiAlerts(),
    loadCareTurno(fecha, turno),
    loadEmarTurno(fecha, turno),
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

  const seguimiento = obs.followups
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      tipo: item.tipo,
      descripcion: item.descripcion,
      acciones_tomadas: item.acciones_tomadas,
      fecha_hora: item.fecha_hora,
      seguimiento_fecha: item.seguimiento_fecha,
      seguimiento_turno: item.seguimiento_turno,
      seguimiento_estado: item.seguimiento_estado,
      residente: residentMeta(item.residentes),
    }));

  const actividadTurno = {
    signos: signos.filter((item) => item.turno === turno).length,
    observaciones: obs.today.filter((item) => item.turno === turno).length,
    tareas_cuidado: careTurno.resumen.total,
    tareas_cuidado_pendientes: careTurno.resumen.pendientes_operativos ?? ((careTurno.resumen.pendiente ?? 0) + (careTurno.resumen.reprogramada ?? 0)),
    medicamentos: emarTurno.resumen.total,
    medicamentos_pendientes: emarTurno.resumen.pendiente,
    medicamentos_por_validar: emarTurno.resumen.pendiente_validacion,
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
    tareas_cuidado: careTurno,
    emar: emarTurno,
    actividad_turno: actividadTurno,
    actividad_dia: {
      signos: signos.length,
      observaciones: obs.today.length,
      tareas_cuidado: careTurno.resumen.total,
      medicamentos: emarTurno.resumen.total,
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
  const { eleamId, userId } = await getSessionProfile();
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
