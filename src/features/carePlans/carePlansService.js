import { supabase } from "../../services/supabaseConfig";
import { normalizeFamilyVisibility } from "../familiar/familyVisibility";

export const CARE_TURNOS = ["mañana", "tarde", "noche"];

export const CARE_CATEGORIES = [
  ["alimentacion", "Alimentación"],
  ["hidratacion", "Hidratación"],
  ["higiene", "Higiene"],
  ["bano", "Baño"],
  ["movilidad", "Movilidad"],
  ["cambios_posicion", "Cambios de posición"],
  ["eliminacion", "Eliminación"],
  ["prevencion_caidas", "Prevención de caídas"],
  ["prevencion_up", "Prevención UPP"],
  ["actividad", "Actividad"],
  ["controles", "Controles"],
  ["otro", "Otro"],
];

export const CARE_CATEGORY_LABEL = Object.fromEntries(CARE_CATEGORIES);

export const CARE_ACTIVITY_PRESETS = [
  {
    id: "desayuno-asistido",
    area: "Nutrición",
    activity: {
      categoria: "alimentacion",
      titulo: "Desayuno asistido",
      descripcion: "Apoyo y registro de tolerancia durante el desayuno.",
      instrucciones: "Respetar pauta alimentaria, textura indicada y alertas de deglución.",
      prioridad: "alta",
      requiere_observacion: false,
    },
    schedule: { frecuencia: "diaria", hora: "08:30", turno: "mañana", tolerancia_min: 45 },
  },
  {
    id: "almuerzo-asistido",
    area: "Nutrición",
    activity: {
      categoria: "alimentacion",
      titulo: "Almuerzo asistido",
      descripcion: "Apoyo en alimentación y supervisión de ingesta.",
      instrucciones: "Registrar rechazo, baja ingesta o signos de disfagia.",
      prioridad: "alta",
      requiere_observacion: false,
    },
    schedule: { frecuencia: "diaria", hora: "12:30", turno: "tarde", tolerancia_min: 60 },
  },
  {
    id: "once-cena-asistida",
    area: "Nutrición",
    activity: {
      categoria: "alimentacion",
      titulo: "Once / cena asistida",
      descripcion: "Apoyo en alimentación de tarde-noche.",
      instrucciones: "Verificar dieta indicada y tolerancia antes del descanso.",
      prioridad: "media",
      requiere_observacion: false,
    },
    schedule: { frecuencia: "diaria", hora: "18:30", turno: "tarde", tolerancia_min: 60 },
  },
  {
    id: "hidratacion-manana",
    area: "Nutrición",
    activity: {
      categoria: "hidratacion",
      titulo: "Hidratación supervisada",
      descripcion: "Oferta y supervisión de líquidos según pauta.",
      instrucciones: "Considerar restricción hídrica, espesantes o indicación clínica.",
      prioridad: "media",
      requiere_observacion: false,
    },
    schedule: { frecuencia: "diaria", hora: "10:30", turno: "mañana", tolerancia_min: 45 },
  },
  {
    id: "bano-higiene",
    area: "Higiene",
    activity: {
      categoria: "bano",
      titulo: "Baño y aseo personal",
      descripcion: "Asistencia en baño, muda o aseo en cama según dependencia.",
      instrucciones: "Resguardar privacidad, seguridad térmica y condición de piel.",
      prioridad: "alta",
      requiere_observacion: true,
    },
    schedule: { frecuencia: "diaria", hora: "09:30", turno: "mañana", tolerancia_min: 90 },
  },
  {
    id: "higiene-oral",
    area: "Higiene",
    activity: {
      categoria: "higiene",
      titulo: "Higiene oral y prótesis",
      descripcion: "Aseo oral, cuidado de prótesis y confort bucal.",
      instrucciones: "Avisar lesiones, dolor, sangrado o rechazo persistente.",
      prioridad: "media",
      requiere_observacion: false,
    },
    schedule: { frecuencia: "diaria", hora: "20:30", turno: "noche", tolerancia_min: 45 },
  },
  {
    id: "vestuario-ropa-cama",
    area: "Higiene",
    activity: {
      categoria: "higiene",
      titulo: "Vestuario y ropa de cama",
      descripcion: "Cambio de ropa, revisión de pertenencias y cama limpia/seca.",
      instrucciones: "Priorizar residentes con incontinencia, sudoración o lesiones cutáneas.",
      prioridad: "media",
      requiere_observacion: false,
    },
    schedule: { frecuencia: "diaria", hora: "10:00", turno: "mañana", tolerancia_min: 90 },
  },
  {
    id: "eliminacion-muda",
    area: "Continencia",
    activity: {
      categoria: "eliminacion",
      titulo: "Eliminación y muda",
      descripcion: "Apoyo en baño, cambio de absorbente y cuidado de piel.",
      instrucciones: "Registrar diarrea, constipación, diuresis alterada o lesiones.",
      prioridad: "alta",
      requiere_observacion: true,
    },
    schedule: { frecuencia: "diaria", hora: "14:30", turno: "tarde", tolerancia_min: 60 },
  },
  {
    id: "movilizacion-transferencias",
    area: "Movilidad",
    activity: {
      categoria: "movilidad",
      titulo: "Movilización y transferencias",
      descripcion: "Levantada, marcha asistida o traslado seguro según capacidad.",
      instrucciones: "Usar ayudas técnicas y registrar dolor, mareo o rechazo.",
      prioridad: "alta",
      requiere_observacion: true,
    },
    schedule: { frecuencia: "diaria", hora: "11:00", turno: "mañana", tolerancia_min: 60 },
  },
  {
    id: "cambios-posicion",
    area: "Prevención",
    activity: {
      categoria: "cambios_posicion",
      titulo: "Cambios de posición",
      descripcion: "Reposicionamiento para prevención de úlceras por presión.",
      instrucciones: "Revisar prominencias óseas y dejar alineación cómoda.",
      prioridad: "alta",
      requiere_observacion: false,
    },
    schedule: { frecuencia: "diaria", hora: "02:00", turno: "noche", tolerancia_min: 45 },
  },
  {
    id: "prevencion-caidas",
    area: "Prevención",
    activity: {
      categoria: "prevencion_caidas",
      titulo: "Chequeo de prevención de caídas",
      descripcion: "Revisión de entorno, calzado, timbre, barandas y ayudas técnicas.",
      instrucciones: "Corregir riesgos antes de cambios de turno o deambulación.",
      prioridad: "alta",
      requiere_observacion: false,
    },
    schedule: { frecuencia: "diaria", hora: "07:30", turno: "mañana", tolerancia_min: 45 },
  },
  {
    id: "actividad-estimulacion",
    area: "Bienestar",
    activity: {
      categoria: "actividad",
      titulo: "Actividad y estimulación",
      descripcion: "Actividad recreativa, cognitiva o acompañamiento significativo.",
      instrucciones: "Adaptar a preferencia, ánimo y nivel funcional del residente.",
      prioridad: "media",
      requiere_observacion: false,
    },
    schedule: { frecuencia: "diaria", hora: "16:30", turno: "tarde", tolerancia_min: 90 },
  },
];

export const CARE_STATUS_LABEL = {
  pendiente: "Pendiente",
  cumplida: "Cumplida",
  omitida: "Omitida",
  reprogramada: "Reprogramada",
  cancelada: "Cancelada",
};

export const CARE_OPEN_STATUSES = ["pendiente", "reprogramada"];

export const OMISSION_REASONS = [
  ["rechazo", "Rechazo del residente"],
  ["no_disponible", "Recurso no disponible"],
  ["contraindicado", "Contraindicado"],
  ["residente_ausente", "Residente ausente"],
  ["otro", "Otro"],
];

const CARE_PLAN_SELECT = `
  id, eleam_id, residente_id, titulo, objetivos,
  pauta_alimentacion, pauta_hidratacion, restricciones,
  riesgo_caidas, riesgo_up, estado, version,
  creado_por, actualizado_por, creado_en, actualizado_en
`;

const CARE_ACTIVITY_SELECT = `
  id, eleam_id, residente_id, plan_id, categoria, titulo,
  descripcion, instrucciones, prioridad, requiere_observacion,
  visible_familiar, resumen_familiar, activo,
  creado_por, actualizado_por, creado_en, actualizado_en
`;

const CARE_SCHEDULE_SELECT = `
  id, eleam_id, residente_id, actividad_id, frecuencia,
  dias_semana, dias_mes, fecha_unica, hora, turno,
  tolerancia_min, activo, creado_en, actualizado_en
`;

const CARE_TASK_SELECT = `
  id, eleam_id, residente_id, plan_id, actividad_id, horario_id,
  fecha, turno, hora, estado, motivo_omision, notas,
  requiere_seguimiento, observacion_id, fecha_original, reprogramada_para,
  cumplida_por, cumplida_en, creado_en, actualizado_en
`;

export function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentTurno(date = new Date()) {
  const h = date.getHours();
  if (h >= 7 && h < 15) return "mañana";
  if (h >= 15 && h < 23) return "tarde";
  return "noche";
}

export function nextFollowUpSlot(fecha = todayIso(), turno = currentTurno()) {
  const base = new Date(`${fecha || todayIso()}T12:00:00`);
  if (Number.isNaN(base.valueOf())) return { fecha: todayIso(), turno: currentTurno() };
  if (turno === "mañana") return { fecha: dateIsoFrom(base), turno: "tarde" };
  if (turno === "tarde") return { fecha: dateIsoFrom(base), turno: "noche" };
  base.setDate(base.getDate() + 1);
  return { fecha: dateIsoFrom(base), turno: "mañana" };
}

export function requireFollowUpSlot({ requiereSeguimiento, seguimientoFecha, seguimientoTurno }) {
  if (!requiereSeguimiento) return;
  if (!seguimientoFecha || !CARE_TURNOS.includes(seguimientoTurno)) {
    throw new Error("Debes indicar fecha y turno para dejar el seguimiento pendiente.");
  }
}

const TASK_SELECT = `
  ${CARE_TASK_SELECT},
  residentes(id, nombre, apellido, habitacion, cama, nivel_dependencia),
  actividad:plan_cuidado_actividades(id, titulo, categoria, prioridad, descripcion, instrucciones, requiere_observacion, visible_familiar, resumen_familiar),
  horario:plan_cuidado_horarios(id, tolerancia_min)
`;

export function previousTurnos(turno) {
  const index = CARE_TURNOS.indexOf(turno);
  return index > 0 ? CARE_TURNOS.slice(0, index) : [];
}

export async function getSessionProfile() {
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
  return { userId, eleamId: data.eleam_id, rol: data.rol };
}

export function normalizeSchedule(schedule = {}) {
  const frecuencia = schedule.frecuencia || "diaria";
  const diasSemana = Array.isArray(schedule.dias_semana)
    ? [...new Set(schedule.dias_semana.map(Number).filter((day) => day >= 1 && day <= 7))].sort((a, b) => a - b)
    : [];
  const diasMes = Array.isArray(schedule.dias_mes)
    ? [...new Set(schedule.dias_mes.map(Number).filter((day) => day >= 1 && day <= 31))].sort((a, b) => a - b)
    : [];
  const tolerancia = Number(schedule.tolerancia_min ?? 60);
  return {
    frecuencia,
    dias_semana: frecuencia === "semanal" ? (diasSemana.length ? diasSemana : [1, 2, 3, 4, 5, 6, 7]) : null,
    dias_mes: frecuencia === "mensual" ? (diasMes.length ? diasMes : [1]) : null,
    fecha_unica: frecuencia === "una_vez" ? schedule.fecha_unica || todayIso() : null,
    hora: schedule.hora || "09:00",
    turno: schedule.turno || currentTurno(),
    tolerancia_min: Number.isFinite(tolerancia) ? Math.max(0, Math.min(720, tolerancia)) : 60,
    activo: schedule.activo !== false,
  };
}

export function normalizeSchedules(schedules = []) {
  const source = Array.isArray(schedules) ? schedules : [schedules];
  return source
    .filter(Boolean)
    .map((schedule) => ({
      id: schedule.id ?? null,
      ...normalizeSchedule(schedule),
    }));
}

function dateIsoFrom(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.valueOf())) return todayIso();
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function careTaskDueAt(task) {
  if (!task?.fecha || !task?.hora) return null;
  const due = new Date(`${task.fecha}T${String(task.hora).slice(0, 5)}`);
  if (Number.isNaN(due.valueOf())) return null;

  const tolerance = Number(task.horario?.tolerancia_min ?? 0);
  if (Number.isFinite(tolerance) && tolerance > 0) {
    due.setMinutes(due.getMinutes() + Math.min(720, tolerance));
  }
  return due;
}

export function isCareTaskOverdue(task, now = new Date()) {
  if (!task || !CARE_OPEN_STATUSES.includes(task.estado)) return false;
  if (task._arrastre) return true;
  if (task.fecha !== dateIsoFrom(now)) return false;
  const dueAt = careTaskDueAt(task);
  return !!dueAt && dueAt < now;
}

export async function getResidentCarePlan(residenteId) {
  const { data, error } = await supabase
    .from("planes_cuidado")
    .select(`
      ${CARE_PLAN_SELECT},
      actividades:plan_cuidado_actividades(
        ${CARE_ACTIVITY_SELECT},
        horarios:plan_cuidado_horarios(${CARE_SCHEDULE_SELECT})
      )
    `)
    .eq("residente_id", residenteId)
    .eq("estado", "activo")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveCarePlan(residenteId, payload = {}) {
  const { userId, eleamId } = await getSessionProfile();
  const base = {
    titulo: payload.titulo?.trim() || "Plan de cuidado",
    objetivos: payload.objetivos?.trim() || null,
    pauta_alimentacion: payload.pauta_alimentacion?.trim() || null,
    pauta_hidratacion: payload.pauta_hidratacion?.trim() || null,
    restricciones: payload.restricciones?.trim() || null,
    riesgo_caidas: payload.riesgo_caidas || null,
    riesgo_up: payload.riesgo_up || null,
    actualizado_por: userId,
  };

  if (payload.id) {
    const { data, error } = await supabase
      .from("planes_cuidado")
      .update(base)
      .eq("id", payload.id)
      .select(CARE_PLAN_SELECT)
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("planes_cuidado")
    .insert({
      ...base,
      eleam_id: eleamId,
      residente_id: residenteId,
      creado_por: userId,
    })
    .select(CARE_PLAN_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function saveCareActivity({ plan, activity, schedule }) {
  const { userId } = await getSessionProfile();
  const schedules = normalizeSchedules(activity.schedules ?? schedule);
  if (schedules.length === 0) {
    throw new Error("Debes programar al menos un horario para la actividad.");
  }

  const payload = {
    eleam_id: plan.eleam_id,
    residente_id: plan.residente_id,
    plan_id: plan.id,
    categoria: activity.categoria,
    titulo: activity.titulo?.trim(),
    descripcion: activity.descripcion?.trim() || null,
    instrucciones: activity.instrucciones?.trim() || null,
    prioridad: activity.prioridad || "media",
    requiere_observacion: activity.requiere_observacion === true,
    ...normalizeFamilyVisibility(activity),
    activo: activity.activo !== false,
    actualizado_por: userId,
  };

  if (!payload.titulo) throw new Error("El título de la actividad es obligatorio.");

  let saved;
  if (activity.id) {
    const { data, error } = await supabase
      .from("plan_cuidado_actividades")
      .update(payload)
      .eq("id", activity.id)
      .select(CARE_ACTIVITY_SELECT)
      .single();
    if (error) throw error;
    saved = data;

  } else {
    const { data, error } = await supabase
      .from("plan_cuidado_actividades")
      .insert({ ...payload, creado_por: userId })
      .select(CARE_ACTIVITY_SELECT)
      .single();
    if (error) throw error;
    saved = data;
  }

  const keptScheduleIds = schedules.map((item) => item.id).filter(Boolean);
  let deactivateQuery = supabase
    .from("plan_cuidado_horarios")
    .update({ activo: false })
    .eq("actividad_id", saved.id);
  if (keptScheduleIds.length > 0) {
    deactivateQuery = deactivateQuery.not("id", "in", `(${keptScheduleIds.join(",")})`);
  }
  const { error: deactivateError } = await deactivateQuery;
  if (deactivateError) throw deactivateError;

  for (const horario of schedules) {
    const { id: horarioId, ...schedulePayload } = horario;
    const row = {
      ...schedulePayload,
      eleam_id: plan.eleam_id,
      residente_id: plan.residente_id,
      actividad_id: saved.id,
    };
    const result = horarioId
      ? await supabase.from("plan_cuidado_horarios").update(row).eq("id", horarioId)
      : await supabase.from("plan_cuidado_horarios").insert(row);
    if (result.error) throw result.error;
  }

  return saved;
}

export async function createCarePresetActivities({ plan, presetIds = [], existingActivities = [] }) {
  const { userId } = await getSessionProfile();
  const selectedIds = new Set(presetIds);
  const selected = CARE_ACTIVITY_PRESETS.filter((preset) => selectedIds.has(preset.id));
  const existingKeys = new Set(
    existingActivities
      .filter((item) => item.activo !== false)
      .map((item) => `${item.categoria}:${item.titulo}`.toLowerCase())
  );
  let created = 0;
  let skipped = 0;

  for (const preset of selected) {
    const activity = preset.activity;
    const key = `${activity.categoria}:${activity.titulo}`.toLowerCase();
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }

    const { data: saved, error } = await supabase
      .from("plan_cuidado_actividades")
      .insert({
        eleam_id: plan.eleam_id,
        residente_id: plan.residente_id,
        plan_id: plan.id,
        categoria: activity.categoria,
        titulo: activity.titulo,
        descripcion: activity.descripcion || null,
        instrucciones: activity.instrucciones || null,
        prioridad: activity.prioridad || "media",
        requiere_observacion: activity.requiere_observacion === true,
        visible_familiar: false,
        resumen_familiar: null,
        activo: true,
        creado_por: userId,
        actualizado_por: userId,
      })
      .select(CARE_ACTIVITY_SELECT)
      .single();
    if (error) throw error;

    const { error: scheduleError } = await supabase
      .from("plan_cuidado_horarios")
      .insert({
        ...normalizeSchedule(preset.schedule),
        eleam_id: plan.eleam_id,
        residente_id: plan.residente_id,
        actividad_id: saved.id,
      });
    if (scheduleError) throw scheduleError;

    existingKeys.add(key);
    created += 1;
  }

  return { created, skipped };
}

export async function deactivateCareActivity(activityId) {
  const { error } = await supabase
    .from("plan_cuidado_actividades")
    .update({ activo: false })
    .eq("id", activityId);
  if (error) throw error;

  const { error: scheduleError } = await supabase
    .from("plan_cuidado_horarios")
    .update({ activo: false })
    .eq("actividad_id", activityId);
  if (scheduleError) throw scheduleError;
}

export async function reactivateCareActivity(activityId) {
  const { error } = await supabase
    .from("plan_cuidado_actividades")
    .update({ activo: true })
    .eq("id", activityId);
  if (error) throw error;

  const { error: scheduleError } = await supabase
    .from("plan_cuidado_horarios")
    .update({ activo: true })
    .eq("actividad_id", activityId);
  if (scheduleError) throw scheduleError;
}

export async function generateCareTasks({ fecha = todayIso(), turno = null } = {}) {
  const { data, error } = await supabase.rpc("generar_tareas_cuidado", {
    p_fecha: fecha,
    p_turno: turno,
  });
  if (error) throw error;
  return data ?? 0;
}

export async function listCareTasks({
  fecha = todayIso(),
  turno = null,
  estado = null,
  residenteId = null,
  generate = true,
  limit = 200,
  includeCarryOver = true,
} = {}) {
  if (generate) await generateCareTasks({ fecha, turno });

  let query = supabase
    .from("tareas_cuidado")
    .select(TASK_SELECT)
    .eq("fecha", fecha)
    .order("hora", { ascending: true })
    .limit(limit);

  if (turno) query = query.eq("turno", turno);
  if (estado) query = query.eq("estado", estado);
  if (residenteId) query = query.eq("residente_id", residenteId);

  const { data, error } = await query;
  if (error) throw error;
  const currentRows = (data ?? []).map((row) => ({ ...row, _arrastre: false }));

  if (!includeCarryOver || !turno || (estado && !CARE_OPEN_STATUSES.includes(estado))) {
    return currentRows;
  }

  const carryStatuses = estado ? [estado] : CARE_OPEN_STATUSES;
  const carryQueries = [];
  let older = supabase
    .from("tareas_cuidado")
    .select(TASK_SELECT)
    .in("estado", carryStatuses)
    .lt("fecha", fecha)
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true })
    .limit(100);
  if (residenteId) older = older.eq("residente_id", residenteId);
  carryQueries.push(older);

  const previous = previousTurnos(turno);
  if (previous.length > 0) {
    let sameDay = supabase
      .from("tareas_cuidado")
      .select(TASK_SELECT)
      .in("estado", carryStatuses)
      .eq("fecha", fecha)
      .in("turno", previous)
      .order("hora", { ascending: true })
      .limit(100);
    if (residenteId) sameDay = sameDay.eq("residente_id", residenteId);
    carryQueries.push(sameDay);
  }

  const carryResults = await Promise.all(carryQueries);
  const carryRows = [];
  for (const result of carryResults) {
    if (result.error) throw result.error;
    carryRows.push(...(result.data ?? []).map((row) => ({ ...row, _arrastre: true })));
  }

  const seen = new Set();
  return [...carryRows, ...currentRows]
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort((a, b) => `${a.fecha}T${a.hora ?? "00:00"}`.localeCompare(`${b.fecha}T${b.hora ?? "00:00"}`));
}

export async function completeCareTask({
  id,
  estado,
  notas,
  motivoOmision,
  requiereSeguimiento,
  seguimientoFecha,
  seguimientoTurno,
}) {
  requireFollowUpSlot({ requiereSeguimiento, seguimientoFecha, seguimientoTurno });
  const { data, error } = await supabase.rpc("completar_tarea_cuidado", {
    p_tarea_id: id,
    p_estado: estado,
    p_notas: notas || null,
    p_motivo_omision: motivoOmision || null,
    p_requiere_seguimiento: requiereSeguimiento === true,
    p_seguimiento_fecha: requiereSeguimiento ? seguimientoFecha : null,
    p_seguimiento_turno: requiereSeguimiento ? seguimientoTurno : null,
  });
  if (error) throw error;
  return data;
}

export async function rescheduleCareTask({
  id,
  fecha,
  turno,
  hora,
  notas,
  requiereSeguimiento,
  seguimientoFecha,
  seguimientoTurno,
}) {
  requireFollowUpSlot({ requiereSeguimiento, seguimientoFecha, seguimientoTurno });
  const { data, error } = await supabase.rpc("reprogramar_tarea_cuidado", {
    p_tarea_id: id,
    p_fecha: fecha,
    p_turno: turno,
    p_hora: hora,
    p_notas: notas || null,
    p_requiere_seguimiento: requiereSeguimiento === true,
    p_seguimiento_fecha: requiereSeguimiento ? seguimientoFecha : null,
    p_seguimiento_turno: requiereSeguimiento ? seguimientoTurno : null,
  });
  if (error) throw error;
  return data;
}

export async function getCareTaskSummary({ fecha = todayIso(), turno = null } = {}) {
  const tasks = await listCareTasks({ fecha, turno, generate: true, limit: 500 });
  return tasks.reduce((acc, task) => {
    acc.total += 1;
    acc[task.estado] = (acc[task.estado] ?? 0) + 1;
    if (CARE_OPEN_STATUSES.includes(task.estado)) acc.pendientes_operativos += 1;
    if (isCareTaskOverdue(task)) acc.vencidas += 1;
    return acc;
  }, {
    total: 0,
    pendiente: 0,
    cumplida: 0,
    omitida: 0,
    reprogramada: 0,
    cancelada: 0,
    vencidas: 0,
    pendientes_operativos: 0,
  });
}
