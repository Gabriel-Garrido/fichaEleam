const TONE_CLASSES = {
  slate: "border-slate-200 bg-white text-slate-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  sky: "border-sky-200 bg-sky-50 text-sky-900",
  teal: "border-teal-200 bg-teal-50 text-teal-900",
  violet: "border-violet-200 bg-violet-50 text-violet-900",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
};

const SIZE_CLASSES = {
  sm: { wrap: "p-3", value: "text-lg", label: "text-[11px]" },
  md: { wrap: "p-4", value: "text-2xl", label: "text-xs" },
};

export default function MetricCard({
  label,
  value,
  tone = "slate",
  size = "md",
  tooltip,
  className = "",
  compact = false,
}) {
  const toneCls = TONE_CLASSES[tone] ?? TONE_CLASSES.slate;
  const sizeCls = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  return (
    <div className={`rounded-2xl border ${sizeCls.wrap} ${toneCls} ${className}`} title={tooltip}>
      <div className={`${compact ? "text-sm leading-5 break-words" : `${sizeCls.value} font-semibold tabular-nums`}`}>{value}</div>
      <div className={`${sizeCls.label} font-medium opacity-70`}>{label}</div>
    </div>
  );
}
