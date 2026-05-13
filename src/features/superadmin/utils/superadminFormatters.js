export { formatDate, formatDateTime } from "../../../utils/dateUtils";

export function formatCLP(n) {
  if (n == null || Number.isNaN(Number(n))) return "$0";
  try {
    return Number(n).toLocaleString("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    });
  } catch {
    return `$${Number(n).toLocaleString("es-CL")}`;
  }
}

export function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return null;
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
}

export const CRM_STATES = [
  { key: "lead",            label: "Lead",            color: "bg-slate-100 text-slate-700",   dot: "bg-slate-400" },
  { key: "contactado",      label: "Contactado",      color: "bg-sky-100 text-sky-700",       dot: "bg-sky-500" },
  { key: "demo_agendada",   label: "Demo agendada",   color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  { key: "demo_realizada",  label: "Demo realizada",  color: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  { key: "prueba",          label: "En prueba",       color: "bg-amber-100 text-amber-800",   dot: "bg-amber-500" },
  { key: "pendiente_pago",  label: "Pago pendiente",  color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  { key: "cliente_activo",  label: "Cliente activo",  color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  { key: "cliente_riesgo",  label: "Cliente en riesgo", color: "bg-rose-100 text-rose-700",   dot: "bg-rose-500" },
  { key: "perdido",         label: "Perdido",         color: "bg-gray-200 text-gray-600",     dot: "bg-gray-500" },
];

export const CRM_STATE_MAP = Object.fromEntries(CRM_STATES.map((s) => [s.key, s]));

export const RIESGO_CHURN = [
  { key: "bajo",        label: "Bajo",        color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "medio",       label: "Medio",       color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "alto",        label: "Alto",        color: "bg-rose-50 text-rose-700 border-rose-200" },
  { key: "desconocido", label: "Desconocido", color: "bg-slate-50 text-slate-500 border-slate-200" },
];

export const RIESGO_MAP = Object.fromEntries(RIESGO_CHURN.map((r) => [r.key, r]));

export const PLAN_LABEL = { demo: "Demo", mensual: "Mensual", anual: "Anual", inactivo: "Inactivo" };
export const PLAN_BADGE = {
  demo:     "bg-gray-100 text-gray-600",
  mensual:  "bg-blue-100 text-blue-700",
  anual:    "bg-purple-100 text-purple-700",
  inactivo: "bg-red-100 text-red-600",
};
