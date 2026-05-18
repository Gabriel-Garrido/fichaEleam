import {
  CARE_CATEGORY_LABEL,
  CARE_OPEN_STATUSES,
  CARE_STATUS_LABEL,
  careTaskDueAt,
  isCareTaskOverdue,
} from "./carePlansService";
import {
  MED_STATUS_LABEL,
  isMedicationOverdue,
  medicationDueAt,
} from "../emar/emarService";

export const FILTER_LABEL = {
  pendientes: "Pendientes",
  vencidas: "Vencidas",
  cerradas: "Cerradas",
  todas: "Todas",
};

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
    statusLabel: MED_STATUS_LABEL[row.estado] ?? row.estado,
    typeLabel: "eMAR",
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
    title: "Seguimiento clínico",
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
    return ["cumplida", "omitida", "cancelada", "administrado", "validado", "omitido", "cancelado"].includes(item.estado);
  }
  return true;
}

export function matchesType(item, type) {
  if (type === "todos") return true;
  if (type === "cuidado") return item.source === "care";
  if (type === "medicamentos") return item.source === "med";
  if (type === "signos") return item.source === "vitals";
  if (type === "seguimientos") return item.source === "seguimiento";
  return true;
}
