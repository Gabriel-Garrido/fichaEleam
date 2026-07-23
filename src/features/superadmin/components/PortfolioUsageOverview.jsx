import HelpTooltip from "../../../components/HelpTooltip";
import { summarizePortfolioUsage } from "../utils/portfolioUsage";

const WINDOWS = [7, 30, 90];

function Kpi({ label, value, detail, tone = "slate" }) {
  const tones = {
    slate: "text-slate-900",
    teal: "text-teal-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <p className={`text-2xl font-bold tabular-nums ${tones[tone] ?? tones.slate}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-700">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
    </div>
  );
}

export default function PortfolioUsageOverview({ eleams, usage, days, loading, error, onDaysChange }) {
  const visibleIds = new Set(eleams.map((eleam) => eleam.id));
  const summary = summarizePortfolioUsage(usage.filter((row) => visibleIds.has(row.eleamId)));

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            Uso general
            <HelpTooltip label="Cómo se mide el uso">
              Se cuentan registros operativos creados en las áreas principales de la app. No se muestran datos clínicos ni aperturas de pantalla.
            </HelpTooltip>
          </h2>
          <p className="mt-1 text-xs text-slate-500">Los indicadores respetan los filtros aplicados al listado.</p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5" aria-label="Período de análisis">
          {WINDOWS.map((windowDays) => (
            <button
              key={windowDays}
              type="button"
              onClick={() => onDaysChange(windowDays)}
              disabled={loading}
              aria-pressed={days === windowDays}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${days === windowDays ? "bg-teal-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"} disabled:opacity-50`}
            >
              {windowDays} días
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : loading ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((key) => <div key={key} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : (
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label={`Registros en ${days} días`} value={summary.registros.toLocaleString("es-CL")} detail={`${summary.clientesConUso} ELEAM con actividad`} tone="teal" />
          <Kpi label="ELEAM usando la app" value={`${summary.clientesConUso}/${summary.clientesHabilitados}`} detail={`${summary.adopcionPct}% de los ELEAM habilitados`} tone={summary.adopcionPct >= 70 ? "emerald" : summary.adopcionPct >= 40 ? "amber" : "rose"} />
          <Kpi label="Usuarios activos" value={`${summary.usuariosActivos}/${summary.usuariosTotales}`} detail={`Con actividad en los últimos ${days} días`} tone="emerald" />
          <Kpi label="Accesos por activar" value={summary.usuariosSinPrimerIngreso} detail={`${summary.clientesSinUso} ELEAM sin actividad en el período`} tone={summary.usuariosSinPrimerIngreso || summary.clientesSinUso ? "amber" : "emerald"} />
        </div>
      )}
    </section>
  );
}
