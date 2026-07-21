import {
  CARE_CATEGORY_LABEL,
  CARE_OPEN_STATUSES,
  CARE_STATUS_LABEL,
  careTaskDueAt,
  isCareTaskOverdue,
} from "./carePlansService";
import {
  isMedicationOverdue,
  medicationDueAt,
} from "../emar/emarService";
import { MEDICINE_STATUS_LABEL } from "../emar/emarUi";

export const PRIORITY_LABEL = { baja: "Baja", media: "Media", alta: "Alta", urgente: "Urgente" };
export const PRIORITY_TONE = {
  baja: "bg-slate-100 text-slate-600",
  media: "bg-sky-50 text-sky-700",
  alta: "bg-amber-50 text-amber-800",
  urgente: "bg-rose-50 text-rose-700",
};
export const PRIORITY_BORDER = {
  baja: "border-l-slate-300",
  media: "border-l-sky-300",
  alta: "border-l-amber-400",
  urgente: "border-l-rose-500",
};
export const PRIORITY_ORDER = { urgente: 0, alta: 1, media: 2, baja: 3 };

const CLOSED_STATES = ["cumplida", "omitida", "cancelada", "administrado", "validado", "omitido", "cancelado"];
const SOURCE_ORDER = { seguimiento: 0, med: 1, care: 2, vitals: 3 };

function formatMedicationDueWindow(row) {
  const dueAt = medicationDueAt(row);
  if (!dueAt) return null;
  return dueAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function formatCareDueWindow(row) {
  const dueAt = careTaskDueAt(row);
  if (!dueAt) return null;
  return dueAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export function normalizeCareTask(row) {
  return {
    key: `care:${row.id}`,
    source: "care",
    row,
    fecha: row.fecha,
    hora: row.hora,
    estado: row.estado,
    title: row.actividad?.titulo ?? "Actividad de cuidado",
    resident: row.residentes,
    statusLabel: CARE_STATUS_LABEL[row.estado] ?? row.estado,
    typeLabel: "Cuidado",
    meta: CARE_CATEGORY_LABEL[row.actividad?.categoria] ?? row.actividad?.categoria ?? "Plan de cuidado",
    detail: row.actividad?.instrucciones,
    priority: row.actividad?.prioridad ?? "media",
    overdue: isCareTaskOverdue(row),
    carry: row._arrastre === true,
    open: CARE_OPEN_STATUSES.includes(row.estado),
    dueWindow: formatCareDueWindow(row),
    requiresFollowUp: row.requiere_seguimiento === true,
  };
}

export function normalizeMedication(row) {
  return {
    key: `med:${row.id}`,
    source: "med",
    row,
    fecha: row.fecha,
    hora: row.hora,
    estado: row.estado,
    title: row.indicacion?.medicamento_nombre ?? "Medicamento",
    resident: row.residentes,
    statusLabel: MEDICINE_STATUS_LABEL[row.estado] ?? row.estado,
    typeLabel: "Medicamento",
    meta: [row.indicacion?.dosis, row.indicacion?.via ? `vía ${row.indicacion.via}` : null].filter(Boolean).join(" · "),
    detail: row.lote
      ? `Lote ${row.lote.lote || "s/l"} · stock ${row.lote.cantidad_actual} ${row.lote.unidad}`
      : row.indicacion?.requiere_stock ? "Requiere stock al administrar" : null,
    priority: row.indicacion?.es_controlado ? "urgente" : "alta",
    overdue: isMedicationOverdue(row),
    carry: row._arrastre === true,
    controlled: row.indicacion?.es_controlado === true,
    dueWindow: formatMedicationDueWindow(row),
    open: row.estado === "pendiente" || row.estado === "pendiente_validacion",
  };
}

export const VITALS_TURN_HOUR = { "mañana": "08:00", tarde: "14:00", noche: "22:00" };

export function normalizeVitalTask(resident, fecha, turno) {
  const hora = VITALS_TURN_HOUR[turno] ?? "08:00";
  return {
    key: `vitals:${resident.id}`,
    source: "vitals",
    row: { residente_id: resident.id, fecha, turno, residentes: resident },
    fecha,
    hora,
    estado: "pendiente",
    title: "Signos vitales",
    resident,
    statusLabel: "Pendiente",
    typeLabel: "Signos",
    meta: "P/A · FC · FR · Temp · SatO2",
    detail: "Control de signos vitales del turno. Registra los parámetros disponibles.",
    priority: "alta",
    overdue: false,
    carry: false,
    open: true,
    dueWindow: null,
    requiresFollowUp: false,
    controlled: false,
  };
}

export const SEGUIMIENTO_TIPO_LABEL = {
  observacion_general: "Obs. general",
  caida: "Caída",
  incidente: "Incidente",
  curacion: "Curación",
  visita_medica: "Visita médica",
  administracion_medicamento: "Medicamento",
  cambio_posicion: "Cambio posición",
  higiene: "Higiene",
  alimentacion: "Alimentación",
  eliminacion: "Eliminación",
  actividad: "Actividad",
  otro: "Otro",
};

const SEGUIMIENTO_HORA = { "mañana": "09:00", tarde: "15:00", noche: "22:00" };

export function normalizeSeguimiento(obs) {
  const hora = SEGUIMIENTO_HORA[obs.seguimiento_turno] ?? "09:00";
  return {
    key: `seg:${obs.id}`,
    source: "seguimiento",
    row: obs,
    fecha: obs.seguimiento_fecha,
    hora,
    estado: "pendiente",
    title: "Control de seguimiento",
    resident: obs.residentes,
    statusLabel: "Pendiente",
    typeLabel: "Seguimiento",
    meta: SEGUIMIENTO_TIPO_LABEL[obs.tipo] ?? obs.tipo ?? "",
    detail: obs.descripcion,
    priority: "alta",
    overdue: false,
    carry: false,
    open: true,
    dueWindow: null,
    requiresFollowUp: false,
    controlled: false,
  };
}

export function matchesFilter(item, filter) {
  if (filter === "todas") return true;
  if (filter === "vencidas") return item.overdue;
  if (filter === "pendientes") return item.open === true;
  if (filter === "cerradas") {
    return CLOSED_STATES.includes(item.estado);
  }
  return true;
}

export function normalizeTaskView(value) {
  if (value === "cerradas" || value === "todas") return value;
  return "pendientes";
}

export function getTaskProgress(metrics = {}) {
  const total = Math.max(0, Number(metrics.total) || 0);
  const pending = Math.min(total, Math.max(0, Number(metrics.pendientes) || 0));
  const completed = total - pending;
  return { total, completed, pct: total ? Math.round((completed / total) * 100) : 0 };
}

export function buildTaskMetrics(items = []) {
  return items.reduce((acc, item) => {
    acc.total += 1;
    if (item.source === "care") acc.cuidado += 1;
    if (item.source === "med") acc.medicamentos += 1;
    if (item.source === "vitals") acc.signos += 1;
    if (item.source === "seguimiento") acc.seguimientos += 1;
    if (item.open) acc.pendientes += 1;
    if (item.source === "care" && item.estado === "reprogramada") acc.reprogramadas += 1;
    if (item.estado === "pendiente_validacion") acc.porValidar += 1;
    if (item.overdue) acc.vencidas += 1;
    return acc;
  }, {
    total: 0,
    pendientes: 0,
    vencidas: 0,
    cuidado: 0,
    medicamentos: 0,
    porValidar: 0,
    reprogramadas: 0,
    signos: 0,
    seguimientos: 0,
  });
}

export function sortWorkItemsByUrgency(items = []) {
  return [...items].sort((a, b) => {
    if (a.open !== b.open) return a.open ? -1 : 1;
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    const priorityCompare = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
    if (priorityCompare !== 0) return priorityCompare;
    const sourceCompare = (SOURCE_ORDER[a.source] ?? 9) - (SOURCE_ORDER[b.source] ?? 9);
    if (sourceCompare !== 0) return sourceCompare;
    return `${a.fecha}T${a.hora ?? "00:00"}`.localeCompare(`${b.fecha}T${b.hora ?? "00:00"}`);
  });
}

export function getTurnFocus(metrics = {}) {
  if ((metrics.porValidar ?? 0) > 0) {
    return {
      tone: "sky",
      title: `${metrics.porValidar} medicamento${metrics.porValidar === 1 ? "" : "s"} por validar`,
      detail: "Prioriza registros que requieren un segundo usuario para cerrar el circuito de medicamentos.",
    };
  }
  if ((metrics.vencidas ?? 0) > 0) {
    return {
      tone: "rose",
      title: `${metrics.vencidas} pendiente${metrics.vencidas === 1 ? "" : "s"} vencido${metrics.vencidas === 1 ? "" : "s"}`,
      detail: "Resuelve primero las tareas atrasadas o fuera de ventana.",
    };
  }
  if ((metrics.pendientes ?? 0) > 0) {
    return {
      tone: "teal",
      title: `${metrics.pendientes} pendiente${metrics.pendientes === 1 ? "" : "s"}`,
      detail: "Ejecuta por hora y prioridad. Cada cierre deja trazabilidad.",
    };
  }
  return {
    tone: "emerald",
    title: "Turno al día",
    detail: "No quedan pendientes operativos con los filtros actuales.",
  };
}
