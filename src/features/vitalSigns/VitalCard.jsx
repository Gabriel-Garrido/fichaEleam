import { STATUS } from "./vitalRanges";

// Tarjeta visual de un parámetro vital. Consume el "status" calculado
// por vitalRanges.js y se pinta con verde/ámbar/rojo. Muestra el rango
// de referencia para que el personal sepa cuándo el valor es anormal.
export default function VitalCard({ icon, label, value, unit, status, normal, sub }) {
  const s = STATUS[status] || STATUS.unknown;
  const isUnknown = status === "unknown";
  return (
    <div
      className={`relative rounded-xl border ${s.badge.split(" ").find((c) => c.startsWith("border-"))} bg-white p-3 sm:p-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span aria-hidden>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${s.badge}`}
          title={s.label}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className={`text-2xl font-bold tabular-nums ${isUnknown ? "text-slate-300" : s.text}`}>
          {value ?? "—"}
        </span>
        {unit && !isUnknown && value !== "—" && (
          <span className="text-xs text-slate-400">{unit}</span>
        )}
      </div>

      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
      {normal && (
        <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
          Normal: <span className="text-slate-500 normal-case">{normal}</span>
        </div>
      )}
    </div>
  );
}
