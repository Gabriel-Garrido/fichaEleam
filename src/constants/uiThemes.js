// Design tokens centralizados — Tailwind clases estáticas (incluidas en el bundle).
// No usar interpolación dinámica para colores: Tailwind necesita las clases literales.

export const TONE = {
  primary: {
    chip: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
    chipActive: "bg-teal-700 text-white ring-1 ring-teal-700",
    card: "border-teal-100 bg-teal-50/40",
    text: "text-teal-700",
    bg: "bg-teal-50",
    bgStrong: "bg-teal-700 text-white",
    border: "border-teal-200",
    dot: "bg-teal-500",
  },
  emerald: {
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    chipActive: "bg-emerald-600 text-white ring-1 ring-emerald-600",
    card: "border-emerald-100 bg-emerald-50/40",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    bgStrong: "bg-emerald-600 text-white",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  amber: {
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    chipActive: "bg-amber-500 text-white ring-1 ring-amber-500",
    card: "border-amber-100 bg-amber-50/40",
    text: "text-amber-700",
    bg: "bg-amber-50",
    bgStrong: "bg-amber-500 text-white",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  rose: {
    chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    chipActive: "bg-rose-600 text-white ring-1 ring-rose-600",
    card: "border-rose-100 bg-rose-50/40",
    text: "text-rose-700",
    bg: "bg-rose-50",
    bgStrong: "bg-rose-600 text-white",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  sky: {
    chip: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    chipActive: "bg-sky-600 text-white ring-1 ring-sky-600",
    card: "border-sky-100 bg-sky-50/40",
    text: "text-sky-700",
    bg: "bg-sky-50",
    bgStrong: "bg-sky-600 text-white",
    border: "border-sky-200",
    dot: "bg-sky-500",
  },
  slate: {
    chip: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    chipActive: "bg-slate-800 text-white ring-1 ring-slate-800",
    card: "border-slate-100 bg-slate-50/40",
    text: "text-slate-700",
    bg: "bg-slate-100",
    bgStrong: "bg-slate-800 text-white",
    border: "border-slate-200",
    dot: "bg-slate-500",
  },
};

export const STATUS_TONE = {
  pendiente: "amber",
  programado: "sky",
  administrado: "emerald",
  completado: "emerald",
  cumplido: "emerald",
  omitido: "slate",
  vencido: "rose",
  cancelado: "slate",
  observado: "amber",
  en_proceso: "sky",
  abierta: "amber",
  cerrada: "emerald",
  activo: "emerald",
  hospitalizado: "amber",
  egresado: "slate",
  fallecido: "slate",
  operativa: "emerald",
  mantenimiento: "amber",
  inactiva: "slate",
  ocupada: "emerald",
  reservada_hospitalizacion: "amber",
};

export const FOCUS_TONE = {
  clinica: "rose",
  funcional: "sky",
  psicosocial: "emerald",
  familiar: "amber",
  administrativo: "slate",
};

export const KPI_TONE = TONE;
export const CARD_TONE = TONE;

export function toneFromStatus(status) {
  return STATUS_TONE[status] ?? "slate";
}

export function tone(name) {
  return TONE[name] ?? TONE.slate;
}
