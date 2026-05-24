export const MEDICINE_STATUS_LABEL = {
  pendiente: "Pendiente",
  administrado: "Administrado",
  omitido: "Omitido",
  pendiente_validacion: "Por validar",
  validado: "Validado",
  revertido: "Revertido",
  cancelado: "Cancelado",
};

export const MEDICINE_FILTER_LABEL = {
  ahora: "Ahora",
  pendientes: "Pendientes",
  por_validar: "Por validar",
  completadas: "Completadas",
  todas: "Todas",
};

export const MEDICINE_CLOSED_STATES = ["administrado", "validado", "omitido", "cancelado", "revertido"];
export const MEDICINE_OPEN_STATES = ["pendiente", "pendiente_validacion"];
export const MEDICINE_LOT_EXPIRY_WARNING_DAYS = 30;

export const DEFAULT_MEDICATION_INDICATION = {
  medicamento_nombre: "",
  principio_activo: "",
  concentracion: "",
  forma_farmaceutica: "",
  dosis: "",
  unidad_dosis: "unidad",
  via: "oral",
  indicacion: "",
  prescriptor_nombre: "",
  fecha_indicacion: "",
  fecha_inicio: "",
  fecha_fin: "",
  estado: "activo",
  es_controlado: false,
  tipo_controlado: "psicotropico",
  requiere_stock: true,
  visible_familiar: false,
  resumen_familiar: "",
  instrucciones: "",
};

export const DEFAULT_MEDICATION_SCHEDULE = {
  frecuencia: "diaria",
  dias_semana: [1, 2, 3, 4, 5, 6, 7],
  dias_mes: [1],
  fecha_unica: "",
  hora: "09:00",
  turno: "mañana",
  tolerancia_min: 60,
};

export const DEFAULT_STOCK_LOT = {
  medicamento_nombre: "",
  lote: "",
  fecha_vencimiento: "",
  cantidad_actual: 0,
  unidad: "unidad",
  ubicacion: "",
  es_controlado: false,
  tipo_controlado: "psicotropico",
  estado: "activo",
};

const WEEKDAY_LABEL = {
  1: "lun",
  2: "mar",
  3: "mie",
  4: "jue",
  5: "vie",
  6: "sab",
  7: "dom",
};

export function isMedicationClosed(row = {}) {
  return MEDICINE_CLOSED_STATES.includes(row.estado);
}

export function isMedicationOpen(row = {}) {
  return MEDICINE_OPEN_STATES.includes(row.estado);
}

export function buildMedicationMetrics(rows = [], isOverdue = () => false) {
  return rows.reduce((acc, row) => {
    acc.total += 1;
    if (row.estado === "pendiente") acc.pendientes += 1;
    if (row.estado === "pendiente_validacion") acc.porValidar += 1;
    if (isMedicationClosed(row)) acc.completadas += 1;
    if (row.estado === "omitido") acc.omitidas += 1;
    if (row.indicacion?.es_controlado) acc.controlados += 1;
    if (isOverdue(row)) acc.vencidas += 1;
    return acc;
  }, {
    total: 0,
    pendientes: 0,
    porValidar: 0,
    completadas: 0,
    omitidas: 0,
    controlados: 0,
    vencidas: 0,
  });
}

export function matchesMedicationFilter(row = {}, filter = "ahora", isOverdue = () => false) {
  if (filter === "todas") return true;
  if (filter === "pendientes") return row.estado === "pendiente";
  if (filter === "por_validar") return row.estado === "pendiente_validacion";
  if (filter === "completadas") return isMedicationClosed(row);
  if (filter === "ahora") return isMedicationOpen(row) || isOverdue(row);
  return true;
}

function medicationStateRank(row, isOverdue) {
  if (isOverdue(row)) return 0;
  if (row.estado === "pendiente") return 1;
  if (row.estado === "pendiente_validacion") return 2;
  if (row.indicacion?.es_controlado) return 3;
  if (isMedicationClosed(row)) return 4;
  return 5;
}

export function sortMedicationRowsByFocus(rows = [], isOverdue = () => false) {
  return [...rows].sort((a, b) => {
    const stateCompare = medicationStateRank(a, isOverdue) - medicationStateRank(b, isOverdue);
    if (stateCompare !== 0) return stateCompare;
    const controlledCompare = Number(b.indicacion?.es_controlado === true) - Number(a.indicacion?.es_controlado === true);
    if (controlledCompare !== 0) return controlledCompare;
    return `${a.fecha ?? ""}T${a.hora ?? "00:00"}`.localeCompare(`${b.fecha ?? ""}T${b.hora ?? "00:00"}`);
  });
}

export function getMedicationTurnFocus(metrics = {}) {
  if ((metrics.vencidas ?? 0) > 0) {
    return {
      tone: "rose",
      title: `${metrics.vencidas} medicamento${metrics.vencidas === 1 ? "" : "s"} vencido${metrics.vencidas === 1 ? "" : "s"}`,
      detail: "Resuelve primero las dosis atrasadas o fuera de ventana.",
    };
  }
  if ((metrics.pendientes ?? 0) > 0) {
    return {
      tone: "amber",
      title: `${metrics.pendientes} medicamento${metrics.pendientes === 1 ? "" : "s"} pendiente${metrics.pendientes === 1 ? "" : "s"}`,
      detail: "Administra u omite por hora, residente y disponibilidad de stock.",
    };
  }
  if ((metrics.porValidar ?? 0) > 0) {
    return {
      tone: "sky",
      title: `${metrics.porValidar} registro${metrics.porValidar === 1 ? "" : "s"} por validar`,
      detail: "Confirma estos registros con un segundo usuario autorizado.",
    };
  }
  return {
    tone: "emerald",
    title: "Turno al día",
    detail: "No quedan medicamentos pendientes con los filtros actuales.",
  };
}

export function summarizeMedicationSchedule(schedule = {}) {
  const time = schedule.hora?.slice?.(0, 5) || "--:--";
  const turn = schedule.turno || "turno";
  const base = `${turn} · ${time}`;
  if (schedule.frecuencia === "semanal") {
    const days = (schedule.dias_semana?.length ? schedule.dias_semana : DEFAULT_MEDICATION_SCHEDULE.dias_semana)
      .map((day) => WEEKDAY_LABEL[day])
      .filter(Boolean)
      .join(", ");
    return `${base} · semanal${days ? ` (${days})` : ""}`;
  }
  if (schedule.frecuencia === "mensual") {
    const days = schedule.dias_mes?.length ? schedule.dias_mes : DEFAULT_MEDICATION_SCHEDULE.dias_mes;
    return `${base} · mensual dia ${days.join(", ")}`;
  }
  if (schedule.frecuencia === "una_vez") {
    return `${base} · ${schedule.fecha_unica || "fecha pendiente"}`;
  }
  return `${base} · diaria`;
}

export function validateMedicationIndicationDraft(indication = {}, schedules = []) {
  const errors = {};
  if (!indication.medicamento_nombre?.trim()) errors.medicamento_nombre = "Medicamento obligatorio";
  if (!indication.dosis?.trim()) errors.dosis = "Dosis obligatoria";
  if (indication.visible_familiar && !indication.resumen_familiar?.trim()) {
    errors.resumen_familiar = "Agrega un resumen antes de publicar a familia";
  }
  if (indication.fecha_fin && indication.fecha_inicio && indication.fecha_fin < indication.fecha_inicio) {
    errors.fecha_fin = "La fecha de fin no puede ser anterior al inicio";
  }
  if (!Array.isArray(schedules) || schedules.length === 0) {
    errors.schedules = "Agrega al menos un horario";
  } else {
    const invalidSchedule = schedules.find((schedule) => {
      if (!schedule.hora || !schedule.turno) return true;
      if (schedule.frecuencia === "semanal") return !schedule.dias_semana?.length;
      if (schedule.frecuencia === "mensual") return !schedule.dias_mes?.length;
      if (schedule.frecuencia === "una_vez") return !schedule.fecha_unica;
      return false;
    });
    if (invalidSchedule) errors.schedules = "Revisa frecuencia, turno y hora de cada horario";
  }
  return errors;
}

export function hasValidationErrors(errors = {}) {
  return Object.keys(errors).length > 0;
}

function toNoonDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function todayNoon(now = new Date()) {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function daysUntilLotExpiry(lot = {}, now = new Date()) {
  const expiry = toNoonDate(lot.fecha_vencimiento);
  if (!expiry) return null;
  return Math.ceil((expiry.getTime() - todayNoon(now).getTime()) / 86400000);
}

export function getStockLotStatus(lot = {}, now = new Date(), warningDays = MEDICINE_LOT_EXPIRY_WARNING_DAYS) {
  const quantity = Number(lot.cantidad_actual ?? 0);
  const days = daysUntilLotExpiry(lot, now);
  if (quantity <= 0 || lot.estado === "agotado") {
    return {
      key: "sin_stock",
      label: "Sin stock",
      tone: "rose",
      actionable: "Registrar nuevo lote",
      blocked: true,
      days,
    };
  }
  if (lot.estado === "retirado") {
    return {
      key: "retirado",
      label: "Retirado",
      tone: "slate",
      actionable: "Usar otro lote",
      blocked: true,
      days,
    };
  }
  if (days != null && days < 0) {
    return {
      key: "vencido",
      label: "Vencido",
      tone: "rose",
      actionable: "Retirar lote vencido",
      blocked: true,
      days,
    };
  }
  if (days != null && days <= warningDays) {
    return {
      key: "por_vencer",
      label: "Por vencer",
      tone: "amber",
      actionable: "Usar antes o reponer",
      blocked: false,
      days,
    };
  }
  return {
    key: "activo",
    label: "Activo",
    tone: "emerald",
    actionable: "Disponible",
    blocked: false,
    days,
  };
}

export function sortStockLotsByExpiry(lots = [], now = new Date()) {
  const blockedOrder = { sin_stock: 0, retirado: 1, vencido: 2 };
  return [...lots].sort((a, b) => {
    const aStatus = getStockLotStatus(a, now);
    const bStatus = getStockLotStatus(b, now);
    if (aStatus.blocked !== bStatus.blocked) return aStatus.blocked ? 1 : -1;
    if (aStatus.blocked && bStatus.blocked) {
      const blockedCompare = (blockedOrder[aStatus.key] ?? 9) - (blockedOrder[bStatus.key] ?? 9);
      if (blockedCompare !== 0) return blockedCompare;
    }
    const aDays = aStatus.days ?? Number.POSITIVE_INFINITY;
    const bDays = bStatus.days ?? Number.POSITIVE_INFINITY;
    if (aDays !== bDays) return aDays - bDays;
    return String(a.medicamento_nombre ?? "").localeCompare(String(b.medicamento_nombre ?? ""));
  });
}

export function buildStockLotAlerts(lots = [], now = new Date()) {
  return lots.reduce((acc, lot) => {
    const status = getStockLotStatus(lot, now);
    if (status.key === "vencido") acc.vencidos.push({ lot, status });
    if (status.key === "por_vencer") acc.porVencer.push({ lot, status });
    if (status.key === "sin_stock") acc.sinStock.push({ lot, status });
    return acc;
  }, { vencidos: [], porVencer: [], sinStock: [] });
}
