import { supabase } from "../../services/supabaseConfig";

export const TRACE_TYPE_LABEL = {
  cuidado: "Cuidado",
  medicamentos: "Medicamentos",
  signos: "Signos",
  observaciones: "Observaciones",
  seguimientos: "Seguimientos",
  visitas: "Visitas",
  cama: "Cama",
  auditoria: "Registro interno",
};

export const TRACE_STATUS_LABEL = {
  pendiente: "Pendiente",
  realizado: "Realizado",
  cumplida: "Cumplida",
  administrado: "Administrado",
  validado: "Validado",
  omitido: "Omitido",
  omitida: "Omitida",
  reprogramado: "Reprogramado",
  reprogramada: "Reprogramada",
  cancelado: "Cancelado",
  cancelada: "Cancelada",
  resuelto: "Resuelto",
  validacion: "Por validar",
  pendiente_validacion: "Por validar",
  alerta: "Alerta",
};

export const TRACE_TYPE_TONE = {
  cuidado: "teal",
  medicamentos: "sky",
  signos: "violet",
  observaciones: "slate",
  seguimientos: "amber",
  visitas: "emerald",
  cama: "indigo",
  auditoria: "rose",
};

export const TRACE_STATUS_TONE = {
  pendiente: "amber",
  pendiente_validacion: "sky",
  validacion: "sky",
  realizado: "emerald",
  cumplida: "emerald",
  administrado: "emerald",
  validado: "emerald",
  resuelto: "emerald",
  omitido: "rose",
  omitida: "rose",
  cancelado: "slate",
  cancelada: "slate",
  reprogramado: "sky",
  reprogramada: "sky",
  alerta: "rose",
};

const DEFAULT_LIMIT = 200;
const PENDING_STATUSES = new Set(["pendiente", "pendiente_validacion", "validacion"]);
const DONE_STATUSES = new Set(["realizado", "cumplida", "administrado", "validado", "resuelto", "completada"]);
const CANCELLED_STATUSES = new Set(["cancelado", "cancelada", "omitido", "omitida", "revertido"]);
const TECHNICAL_ENTITY_LABEL = {
  tareas_cuidado: "Tarea de cuidado",
  medicamentos_administraciones: "Administración de medicamento",
  signos_vitales: "Signos vitales",
  observaciones_diarias: "Observación",
  visitas_familiar: "Visita",
  cama_asignaciones: "Asignación de cama",
  plan_cuidado_audit: "Registro de plan de cuidado",
  medicamentos_audit: "Registro de medicamentos",
  camas_audit: "Registro de cama",
};

export const TRACE_QUICK_RANGES = {
  hoy: { label: "Hoy", days: 0 },
  "7d": { label: "7 días", days: 7 },
  "30d": { label: "30 días", days: 30 },
  todo: { label: "Todo", days: null },
};

export function isoDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toISOString().slice(0, 10);
}

export function getTraceQuickRange(rangeKey = "30d", now = new Date()) {
  const range = TRACE_QUICK_RANGES[rangeKey] ?? TRACE_QUICK_RANGES["30d"];
  const hasta = isoDate(now);
  if (range.days == null) return { desde: "", hasta, rangeKey: "todo" };
  const desdeDate = new Date(now);
  desdeDate.setDate(desdeDate.getDate() - range.days);
  return { desde: isoDate(desdeDate), hasta, rangeKey };
}

export function inferTraceStatusGroup(status = "") {
  if (PENDING_STATUSES.has(status)) return "pendiente";
  if (DONE_STATUSES.has(status)) return "realizado";
  if (CANCELLED_STATUSES.has(status)) return "cerrado";
  if (status === "reprogramado" || status === "reprogramada") return "reprogramado";
  return "otro";
}

export function sanitizeTraceDetail(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^[[{]/.test(text)) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.entries(parsed)
          .slice(0, 4)
          .map(([key, val]) => `${humanizeTraceKey(key)}: ${formatTraceValue(val)}`)
          .join(" · ");
      }
    } catch {
      return "Detalle técnico disponible";
    }
  }
  return text.replace(/[_{}"]/g, " ").replace(/\s+/g, " ").trim();
}

function humanizeTraceKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTraceValue(value) {
  if (value == null || value === "") return "sin dato";
  if (typeof value === "object") return "detalle";
  return String(value);
}

export function normalizeTraceEvent(event = {}) {
  const type = event.tipo ?? event.type ?? "auditoria";
  const status = event.estado ?? event.status ?? "realizado";
  const entityLabel = TECHNICAL_ENTITY_LABEL[event.entidad] ?? null;
  const detail = sanitizeTraceDetail(event.detalle_texto ?? event.descripcion);
  const title = sanitizeTraceDetail(event.titulo) ?? entityLabel ?? "Evento";
  return {
    id: event.id,
    key: `${type}:${event.id}`,
    type,
    typeLabel: TRACE_TYPE_LABEL[type] ?? type,
    typeTone: TRACE_TYPE_TONE[type] ?? "slate",
    status,
    statusLabel: TRACE_STATUS_LABEL[status] ?? status,
    statusTone: TRACE_STATUS_TONE[status] ?? "slate",
    statusGroup: inferTraceStatusGroup(status),
    occurredAt: event.fecha_hora ?? event.occurred_at ?? event.realizado_en,
    title,
    detail,
    actorName: event.responsable_nombre ?? event.usuario_nombre ?? null,
    entity: event.entidad ?? null,
    entityLabel,
    entityId: event.entidad_id ?? null,
    priority: Number.isFinite(Number(event.prioridad_visual))
      ? Number(event.prioridad_visual)
      : PENDING_STATUSES.has(status) ? 0 : 1,
    raw: event,
  };
}

export function eventMatchesTraceQuery(event, query = "") {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [
    event.title,
    event.detail,
    event.typeLabel,
    event.statusLabel,
    event.actorName,
    event.entity,
  ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
}

export function groupTraceEventsByDate(events = []) {
  return events.reduce((groups, event) => {
    const key = event.occurredAt?.slice?.(0, 10) || "sin_fecha";
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
    return groups;
  }, {});
}

export function sortTraceEvents(events = []) {
  return [...events].sort((a, b) => {
    const priorityCompare = (a.priority ?? 1) - (b.priority ?? 1);
    if (priorityCompare !== 0) return priorityCompare;
    return String(b.occurredAt ?? "").localeCompare(String(a.occurredAt ?? ""));
  });
}

export function buildTraceSummary(events = []) {
  const sorted = sortTraceEvents(events);
  const latest = [...events].sort((a, b) => String(b.occurredAt ?? "").localeCompare(String(a.occurredAt ?? "")))[0] ?? null;
  return events.reduce((acc, event) => {
    acc.total += 1;
    if (event.statusGroup === "pendiente") acc.pending += 1;
    if (event.status === "pendiente_validacion" || event.status === "validacion") acc.validation += 1;
    acc.byType[event.type] = (acc.byType[event.type] ?? 0) + 1;
    return acc;
  }, {
    total: 0,
    pending: 0,
    validation: 0,
    latest,
    ordered: sorted,
    byType: {},
  });
}

export function filterTraceEvents(events = [], { query = "", type = "todos", status = "" } = {}) {
  return sortTraceEvents(events)
    .filter((event) => type === "todos" || event.type === type)
    .filter((event) => !status || event.status === status || event.statusGroup === status)
    .filter((event) => eventMatchesTraceQuery(event, query));
}

export async function listResidentTraceability({
  residenteId,
  desde = null,
  hasta = null,
  tipos = [],
  estado = null,
  limit = DEFAULT_LIMIT,
} = {}) {
  if (!residenteId) return [];

  const { data, error } = await supabase.rpc("listar_trazabilidad_residente", {
    p_residente_id: residenteId,
    p_desde: desde || null,
    p_hasta: hasta || null,
    p_tipos: tipos?.length ? tipos : null,
    p_estado: estado || null,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).map(normalizeTraceEvent);
}
