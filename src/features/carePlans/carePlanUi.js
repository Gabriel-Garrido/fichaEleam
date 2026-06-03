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
};

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

export function buildCarePlanForm(plan) {
  return plan ? {
    titulo: plan.titulo ?? "Plan de cuidado",
    objetivos: plan.objetivos ?? "",
    pauta_alimentacion: plan.pauta_alimentacion ?? "",
    pauta_hidratacion: plan.pauta_hidratacion ?? "",
    restricciones: plan.restricciones ?? "",
    riesgo_caidas: plan.riesgo_caidas ?? "",
    riesgo_up: plan.riesgo_up ?? "",
  } : INITIAL_CARE_PLAN;
}

export function calculateCarePlanReadiness({ plan, activities = [] } = {}) {
  const active = sortCareActivities(activities);
  const familyVisible = active.filter((item) => item.visible_familiar).length;
  const hasClinicalSummary = Boolean(
    plan?.objetivos?.trim()
    || plan?.pauta_alimentacion?.trim()
    || plan?.pauta_hidratacion?.trim()
    || plan?.restricciones?.trim()
    || plan?.riesgo_caidas
    || plan?.riesgo_up
  );

  return {
    active: active.length,
    familyVisible,
    hasClinicalSummary,
  };
}

export function buildQuickCarePlanDefaults(resident = {}) {
  const displayName = [resident?.nombre, resident?.apellido].filter(Boolean).join(" ").trim();
  return {
    ...INITIAL_CARE_PLAN,
    titulo: displayName ? `Plan de cuidado de ${displayName}` : INITIAL_CARE_PLAN.titulo,
    riesgo_caidas: "medio",
    riesgo_up: "medio",
    objetivos: "Mantener seguridad, confort, hidratación, alimentación asistida y movilidad funcional según tolerancia diaria.",
    pauta_alimentacion: "Verificar dieta indicada y tolerancia en cada comida. Avisar rechazo, tos, dificultad para tragar o baja ingesta.",
    pauta_hidratacion: "Ofrecer líquidos según pauta y registrar rechazos o restricciones clínicas.",
  };
}
