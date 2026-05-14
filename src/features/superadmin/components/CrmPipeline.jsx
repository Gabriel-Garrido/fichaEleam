import React, { useMemo } from "react";
import { CRM_STATES } from "../utils/superadminFormatters";
import MetricHelp from "./MetricHelp";

// Descriptions shown in the tooltip for each CRM state
const STATE_HELP = {
  lead:            "Primer contacto registrado, aún sin conversación efectiva. Etapa inicial del funnel.",
  contactado:      "Prospecto con contacto inicial realizado. Prioriza calificación y agendamiento de demo.",
  demo_agendada:   "Demo comprometida en agenda. Prepara el entorno y confirma asistencia 24h antes.",
  demo_realizada:  "La demo ya ocurrió. Califica el interés y envía propuesta o continúa con prueba.",
  prueba:          "Cuenta en evaluación activa. Monitorea uso, resuelve dudas y empuja hacia conversión.",
  pendiente_pago:  "Cliente listo para activar. Coordina método de pago y cierra la suscripción.",
  cliente_activo:  "Cliente operativo con suscripción vigente. Foco en retención y renovación oportuna.",
  cliente_riesgo:  "Cliente con señales de churn. Requiere contacto inmediato y plan de retención.",
  perdido:         "Oportunidad descartada o cliente que canceló. Registra el motivo para análisis.",
};

// Visual groups to show pipeline flow
const PIPELINE_GROUPS = [
  { label: "Prospección",  keys: ["lead", "contactado"],                 color: "bg-slate-100 text-slate-600" },
  { label: "Demo",         keys: ["demo_agendada", "demo_realizada"],     color: "bg-indigo-100 text-indigo-600" },
  { label: "Conversión",   keys: ["prueba", "pendiente_pago"],            color: "bg-amber-100 text-amber-700" },
  { label: "Cliente",      keys: ["cliente_activo", "cliente_riesgo"],    color: "bg-emerald-100 text-emerald-700" },
  { label: "Perdido",      keys: ["perdido"],                             color: "bg-slate-100 text-slate-500" },
];

// Arrow separator between pipeline phases
function PipelineArrow() {
  return (
    <div className="hidden xl:flex items-center justify-center shrink-0 self-stretch">
      <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </div>
  );
}

export default function CrmPipeline({ eleams, onPickState, activeState }) {
  const counts = useMemo(() => {
    const out = {};
    for (const e of eleams) out[e.crm_estado] = (out[e.crm_estado] ?? 0) + 1;
    return out;
  }, [eleams]);

  const total = eleams.length || 1; // avoid division by zero

  // Group subtotals
  const groupCounts = useMemo(() => {
    const out = {};
    for (const g of PIPELINE_GROUPS) {
      out[g.label] = g.keys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
    }
    return out;
  }, [counts]);

  return (
    <div className="space-y-3">
      {/* Group phase headers */}
      <div className="hidden xl:grid xl:grid-cols-[1fr_20px_1fr_20px_1fr_20px_1fr_20px_1fr] gap-0 items-center">
        {PIPELINE_GROUPS.map((g, i) => (
          <React.Fragment key={g.label}>
            <div className="flex items-center justify-center">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${g.color}`}>
                {g.label}
                <span className="ml-1.5 opacity-75 tabular-nums">{groupCounts[g.label]}</span>
              </span>
            </div>
            {i < PIPELINE_GROUPS.length - 1 && <div />}
          </React.Fragment>
        ))}
      </div>

      {/* Stage cards */}
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-[1fr_20px_1fr_20px_1fr_20px_1fr_20px_1fr]">
        {CRM_STATES.map((s, idx) => {
          const n = counts[s.key] ?? 0;
          const pct = Math.round((n / total) * 100);
          const active = activeState === s.key;

          // Arrow between groups (after index 1, 3, 5, 7 in the 9-item list)
          const showArrow = idx === 1 || idx === 3 || idx === 5 || idx === 7;

          return (
            <React.Fragment key={s.key}>
              <article
                role="button"
                tabIndex={0}
                onClick={() => onPickState(active ? null : s.key)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPickState(active ? null : s.key); } }}
                aria-pressed={active}
                aria-label={`Filtrar por estado: ${s.label} (${n} ELEAMs, ${pct}%)`}
                className={`group relative cursor-pointer rounded-xl border p-3.5 shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                  active
                    ? "border-teal-500 bg-teal-50 ring-1 ring-teal-200"
                    : "border-slate-200 bg-white hover:border-teal-300 hover:shadow-md"
                }`}
              >
                {/* Header: dot + label + help */}
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`shrink-0 inline-block h-2 w-2 rounded-full ${s.dot}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 truncate">{s.label}</span>
                  </div>
                  <MetricHelp
                    title={s.label}
                    description={STATE_HELP[s.key]}
                    source={`public.eleams.crm_estado = '${s.key}'.`}
                    action="Haz clic en la tarjeta para filtrar la cartera por esta etapa."
                  />
                </div>

                {/* Count */}
                <p className={`text-3xl font-bold tabular-nums leading-none ${active ? "text-teal-700" : "text-slate-900"}`}>
                  {n}
                </p>

                {/* Progress bar */}
                <div className="mt-2.5 h-1.5 rounded-full bg-slate-100">
                  <div
                    className={`h-1.5 rounded-full transition-all ${active ? "bg-teal-500" : s.dot}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Footer */}
                <p className={`mt-1.5 text-[11px] font-medium ${active ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                  {pct}% · {active ? "Quitar filtro" : "Filtrar"}
                </p>
              </article>

              {/* Arrow — only visible on xl, positioned in the intermediate grid column */}
              {showArrow && <PipelineArrow />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Active filter indicator */}
      {activeState && (
        <div className="flex items-center justify-between rounded-xl bg-teal-50 border border-teal-200 px-4 py-2">
          <p className="text-xs text-teal-700 font-medium">
            Filtrando cartera por: <strong>{CRM_STATES.find((s) => s.key === activeState)?.label}</strong>
          </p>
          <button
            type="button"
            onClick={() => onPickState(null)}
            className="text-xs font-semibold text-teal-700 hover:underline"
          >
            Limpiar filtro
          </button>
        </div>
      )}
    </div>
  );
}
