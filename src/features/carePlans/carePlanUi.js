import { CARE_ACTIVITY_PRESETS, CARE_TURNOS } from "./carePlansService";
import { PRIORITY_ORDER } from "./careTasksBoardUtils";

export const INITIAL_CARE_PLAN = {
  titulo: "Plan de cuidado",
  objetivos: "",
  pauta_alimentacion: "",
  pauta_hidratacion: "",
  restricciones: "",
  riesgo_caidas: "",
  riesgo_up: "",
  objetivo_biopsicosocial: "",
  valoracion_social: "",
  intereses_actividades: "",
  necesidades_espirituales: "",
  meta_rehabilitacion: "",
  restricciones_actividad: "",
  participacion_residente: "",
  participacion_detalle: "",
};

export const CARE_PLAN_REQUIRED_FIELDS = Object.freeze([
  ["objetivos", "Objetivo individual"],
  ["pauta_alimentacion", "Pauta de alimentación"],
  ["pauta_hidratacion", "Pauta de hidratación"],
  ["meta_rehabilitacion", "Mantención o rehabilitación"],
  ["objetivo_biopsicosocial", "Bienestar y participación"],
  ["participacion_residente", "Participación del residente"],
]);

export const INITIAL_CARE_ACTIVITY = {
  categoria: "alimentacion",
  titulo: "",
  descripcion: "",
  instrucciones: "",
  prioridad: "media",
  requiere_observacion: false,
  visible_familiar: false,
  resumen_familiar: "",
  activo: true,
};

export const INITIAL_CARE_SCHEDULE = {
  frecuencia: "diaria",
  dias_semana: [1, 2, 3, 4, 5, 6, 7],
  dias_mes: [1],
  fecha_unica: "",
  hora: "09:00",
  turno: "mañana",
  tolerancia_min: 60,
  activo: true,
};

export const WEEK_DAYS = [
  [1, "L"],
  [2, "Ma"],
  [3, "Mi"],
  [4, "J"],
  [5, "V"],
  [6, "S"],
  [7, "D"],
];

export const TURN_LABELS = {
  "mañana": "Mañana",
  tarde: "Tarde",
  noche: "Noche",
};

const WEEK_DAY_LABEL = Object.fromEntries(WEEK_DAYS);

export function cloneCareSchedule(schedule = {}) {
  return {
    ...INITIAL_CARE_SCHEDULE,
    ...schedule,
    hora: schedule.hora?.slice(0, 5) ?? INITIAL_CARE_SCHEDULE.hora,
    dias_semana: schedule.dias_semana ?? INITIAL_CARE_SCHEDULE.dias_semana,
    dias_mes: schedule.dias_mes ?? INITIAL_CARE_SCHEDULE.dias_mes,
    fecha_unica: schedule.fecha_unica ?? "",
    tolerancia_min: Number(schedule.tolerancia_min ?? INITIAL_CARE_SCHEDULE.tolerancia_min),
    activo: schedule.activo !== false,
  };
}

export function buildDailyShiftSchedules(shifts = ["mañana"], currentSchedules = []) {
  const selected = [...new Set(shifts)].filter((shift) => CARE_TURNOS.includes(shift));
  const safeShifts = selected.length ? selected : ["mañana"];
  return CARE_TURNOS
    .filter((shift) => safeShifts.includes(shift))
    .map((shift) => {
      const existing = currentSchedules.find((item) => item.turno === shift);
      return existing
        ? { ...cloneCareSchedule(existing), turno: shift }
        : { ...INITIAL_CARE_SCHEDULE, turno: shift };
    });
}

// Errores de horario que el guardado silenciaría: "semanal" sin días vuelve a
// ejecutarse todos los días (normalizeSchedule) y "una_vez" sin fecha nunca
// genera tarea.
export function careScheduleError(schedule) {
  if (!schedule?.hora) return "Indica la hora de ejecución.";
  if (schedule.frecuencia === "semanal" && !(schedule.dias_semana?.length)) {
    return "Selecciona al menos un día de la semana.";
  }
  if (schedule.frecuencia === "mensual"
      && (!(schedule.dias_mes?.length) || !schedule.dias_mes.every((day) => Number(day) >= 1 && Number(day) <= 31))) {
    return "Indica un día válido del mes.";
  }
  if (schedule.frecuencia === "una_vez" && !schedule.fecha_unica) {
    return "Indica la fecha de ejecución.";
  }
  return null;
}

export function getActiveCareSchedules(activity) {
  return (activity?.horarios ?? [])
    .filter((schedule) => schedule.activo !== false)
    .sort((a, b) => {
      const turnoA = CARE_TURNOS.indexOf(a.turno);
      const turnoB = CARE_TURNOS.indexOf(b.turno);
      if (turnoA !== turnoB) return turnoA - turnoB;
      return (a.hora ?? "").localeCompare(b.hora ?? "");
    });
}

export function formatCareSchedule(schedule = {}) {
  const turno = TURN_LABELS[schedule.turno] ?? schedule.turno ?? "Turno";
  const time = schedule.hora?.slice(0, 5) ?? "--:--";

  if (schedule.frecuencia === "semanal") {
    const days = (schedule.dias_semana ?? [])
      .map((day) => WEEK_DAY_LABEL[day])
      .filter(Boolean)
      .join(", ");
    return `${turno} · ${time} · semanal${days ? ` (${days})` : ""}`;
  }

  if (schedule.frecuencia === "mensual") {
    return `${turno} · ${time} · mensual día ${schedule.dias_mes?.[0] ?? 1}`;
  }

  if (schedule.frecuencia === "una_vez") {
    return `${turno} · ${time} · ${schedule.fecha_unica || "fecha única"}`;
  }

  return `${turno} · ${time} · diario`;
}

export function carePresetKey(item = {}) {
  return `${item.categoria ?? ""}:${item.titulo ?? ""}`.trim().toLowerCase();
}

export function groupCarePresetsByArea(presets = CARE_ACTIVITY_PRESETS) {
  return presets.reduce((acc, preset) => {
    if (!acc[preset.area]) acc[preset.area] = [];
    acc[preset.area].push(preset);
    return acc;
  }, {});
}

export function sortCareActivities(activities = []) {
  return [...activities]
    .filter((item) => item.activo !== false)
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.prioridad] ?? 2;
      const pb = PRIORITY_ORDER[b.prioridad] ?? 2;
      if (pa !== pb) return pa - pb;
      const firstA = getActiveCareSchedules(a)[0];
      const firstB = getActiveCareSchedules(b)[0];
      const scheduleCompare = `${firstA?.turno ?? ""}${firstA?.hora ?? ""}`.localeCompare(`${firstB?.turno ?? ""}${firstB?.hora ?? ""}`);
      if (scheduleCompare !== 0) return scheduleCompare;
      return (a.titulo || "").localeCompare(b.titulo || "");
    });
}

export function groupCareActivitiesByTurn(activities = []) {
  const groups = Object.fromEntries(CARE_TURNOS.map((turno) => [turno, []]));
  for (const activity of sortCareActivities(activities)) {
    for (const schedule of getActiveCareSchedules(activity)) {
      if (!groups[schedule.turno]) continue;
      groups[schedule.turno].push({ activity, schedule });
    }
  }
  return groups;
}

export function buildCarePlanForm(plan) {
  return plan ? {
    titulo: plan.titulo ?? "Plan de cuidado",
    objetivos: plan.objetivos ?? "",
    pauta_alimentacion: plan.pauta_alimentacion ?? "",
    pauta_hidratacion: plan.pauta_hidratacion ?? "",
    restricciones: plan.restricciones ?? "",
    riesgo_caidas: plan.riesgo_caidas ?? "",
    riesgo_up: plan.riesgo_up ?? "",
    objetivo_biopsicosocial: plan.objetivo_biopsicosocial ?? "",
    valoracion_social: plan.valoracion_social ?? "",
    intereses_actividades: plan.intereses_actividades ?? "",
    necesidades_espirituales: plan.necesidades_espirituales ?? "",
    meta_rehabilitacion: plan.meta_rehabilitacion ?? "",
    restricciones_actividad: plan.restricciones_actividad ?? "",
    participacion_residente: plan.participacion_residente ?? "",
    participacion_detalle: plan.participacion_detalle ?? "",
  } : INITIAL_CARE_PLAN;
}

export function carePlanPendingItems({ plan, activities = [] } = {}) {
  const pending = CARE_PLAN_REQUIRED_FIELDS
    .filter(([field]) => !String(plan?.[field] ?? "").trim())
    .map(([field, label]) => ({ field, label, type: "content" }));

  if (["representante", "ambos", "no_posible"].includes(plan?.participacion_residente)
      && !String(plan?.participacion_detalle ?? "").trim()) {
    pending.push({ field: "participacion_detalle", label: "Detalle de participación", type: "content" });
  }

  if (sortCareActivities(activities).length === 0) {
    pending.push({ field: "activities", label: "Cuidados con acciones y frecuencia", type: "content" });
  }
  if (!plan?.validado_en || !plan?.validado_por_dt) {
    pending.push({ field: "review", label: "Revisión de dirección técnica", type: "review" });
  }
  return pending;
}

export function calculateCarePlanReadiness({ plan, activities = [] } = {}) {
  const active = sortCareActivities(activities);
  const pending = carePlanPendingItems({ plan, activities });
  const contentPending = pending.filter((item) => item.type === "content");

  return {
    active: active.length,
    hasClinicalSummary: contentPending.length === 0,
    contentComplete: contentPending.length === 0,
    reviewed: contentPending.length === 0 && Boolean(plan?.validado_en && plan?.validado_por_dt),
    pending,
  };
}

export function buildQuickCarePlanDefaults(resident = {}) {
  const displayName = [resident?.nombre, resident?.apellido].filter(Boolean).join(" ").trim();
  return {
    ...INITIAL_CARE_PLAN,
    titulo: displayName ? `Plan de cuidado de ${displayName}` : INITIAL_CARE_PLAN.titulo,
  };
}
