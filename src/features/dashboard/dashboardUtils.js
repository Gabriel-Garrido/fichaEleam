export const TIPO_LABEL = {
  observacion_general: "General", caida: "Caída", incidente: "Incidente",
  curacion: "Curación", visita_medica: "Visita médica",
  administracion_medicamento: "Medicamento", cambio_posicion: "Cambio posición",
  higiene: "Higiene", alimentacion: "Alimentación", eliminacion: "Eliminación",
  actividad: "Actividad", otro: "Otro",
};

export const DEPENDENCIA_TONE = {
  autovalente:     { bg: "bg-sky-500",     text: "text-sky-700",       label: "Autovalente" },
  leve:           { bg: "bg-emerald-500", text: "text-emerald-700",  label: "Leve" },
  moderado:       { bg: "bg-amber-500",   text: "text-amber-700",    label: "Moderado" },
  severo:         { bg: "bg-orange-500",  text: "text-orange-700",   label: "Severo" },
  total:          { bg: "bg-rose-500",    text: "text-rose-700",     label: "Total" },
  sin_clasificar: { bg: "bg-slate-400",    text: "text-slate-600",     label: "Sin clasificar" },
};

export const TURNOS = ["mañana", "tarde", "noche"];

export const KPI_TONE = {
  primary: { bg: "bg-white", accent: "text-teal-700",   chip: "bg-teal-50 text-teal-700" },
  emerald: { bg: "bg-white", accent: "text-emerald-700", chip: "bg-emerald-50 text-emerald-700" },
  amber:   { bg: "bg-white", accent: "text-amber-700",   chip: "bg-amber-50 text-amber-700" },
  rose:    { bg: "bg-white", accent: "text-rose-700",    chip: "bg-rose-50 text-rose-700" },
  slate:   { bg: "bg-white", accent: "text-slate-700",   chip: "bg-slate-100 text-slate-600" },
};

export const ALERT_TONE = {
  rose:  { bg: "bg-white", text: "text-rose-700",  border: "border-rose-200",  dot: "bg-rose-500"  },
  amber: { bg: "bg-white", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  // Chips en cero: neutros para que las alertas activas destaquen.
  slate: { bg: "bg-white", text: "text-slate-500", border: "border-slate-200", dot: "bg-slate-300" },
};

export const FILTER_TONE = {
  slate:   "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
  rose:    "bg-white text-rose-700 border-rose-200 hover:bg-rose-50",
  amber:   "bg-white text-amber-800 border-amber-200 hover:bg-amber-50",
  emerald: "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50",
};

export const CARD_TONE = {
  default: "border-slate-100",
  amber:   "border-amber-100",
  rose:    "border-rose-100",
};

export function currentShift() {
  const h = new Date().getHours();
  if (h >= 7 && h < 15) return "mañana";
  if (h >= 15 && h < 23) return "tarde";
  return "noche";
}

export function initials(nombre = "", apellido = "") {
  return ((nombre[0] || "") + (apellido[0] || "")).toUpperCase() || "?";
}

export function timeAgo(date) {
  if (!date) return null;
  const diffMs = Date.now() - new Date(date).getTime();
  if (diffMs < 0) return "ahora";
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "hace instantes";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d === 1 ? "" : "s"}`;
}

export function todayDateLong() {
  return new Date().toLocaleDateString("es-CL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export function daysUntil(date) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

export function isSameDay(date) {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
}

export function riskTone(tone) {
  return {
    rose:    "bg-rose-50 border-rose-100 text-rose-700",
    amber:   "bg-amber-50 border-amber-100 text-amber-800",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    slate:   "bg-slate-50 border-slate-100 text-slate-600",
  }[tone];
}
