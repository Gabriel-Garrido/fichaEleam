import { formatCLP } from "../utils/superadminFormatters";
import MetricHelp from "./MetricHelp";

const toneClasses = {
  slate: "text-slate-900",
  emerald: "text-emerald-700",
  teal: "text-teal-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
  sky: "text-sky-700",
};

function Metric({ label, value, detail, tone = "slate", help, onClick }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-slate-500">{label}</p>{help && <MetricHelp title={label} {...help} />}</div>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${toneClasses[tone] ?? toneClasses.slate}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
    </>
  );
  return onClick ? <button type="button" onClick={onClick} className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-teal-300 hover:bg-teal-50/30">{content}</button> : <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">{content}</article>;
}

function PriorityClients({ clients, onOpenClient }) {
  if (!clients?.length) return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><strong>Sin clientes prioritarios.</strong> No hay señales críticas que requieran seguimiento inmediato.</div>;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Clientes que requieren atención</h2><p className="mt-0.5 text-xs text-slate-500">Ordenados por adopción, actividad, tareas, documentos y riesgo.</p></header>
      <ul className="divide-y divide-slate-100">
        {clients.map((client) => (
          <li key={client.eleamId}>
            <button type="button" onClick={() => onOpenClient?.(client)} className="grid w-full gap-2 px-4 py-3 text-left hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_70px_minmax(220px,1fr)_auto] sm:items-center">
              <span className="truncate text-sm font-semibold text-slate-900">{client.nombre}</span>
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${client.tone === "rose" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>{client.score}/100</span>
              <span className="truncate text-xs text-slate-500">{client.reasons.slice(0, 2).join(" · ")}</span>
              <span className="text-xs font-bold text-teal-700">Revisar →</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SuperAdminMetrics({ metrics, onFilterRisk, onFilterDemos, onFilterLeads, onOpenClient }) {
  if (!metrics) return null;
  const essential = [
    { label: "Clientes activos", value: metrics.activeSubscriptions, detail: `${metrics.totalEleams} ELEAM registrados`, tone: "emerald" },
    { label: "Demos", value: metrics.demoEleams, detail: `${metrics.demosSinUso ?? 0} sin uso`, tone: "amber", onClick: onFilterDemos },
    { label: "Ingresos del mes", value: formatCLP(metrics.mrrCLP), detail: "Pagos completados", tone: "sky" },
    { label: "Uso reciente", value: metrics.activeLast7d ?? 0, detail: "ELEAM con actividad en 7 días", tone: "teal" },
    { label: "En riesgo", value: metrics.enRiesgo, detail: "Requieren seguimiento", tone: metrics.enRiesgo ? "rose" : "emerald", onClick: onFilterRisk },
    { label: "Tareas vencidas", value: metrics.overdueCrmTasks ?? 0, detail: "Seguimientos pendientes", tone: metrics.overdueCrmTasks ? "rose" : "emerald" },
  ];
  const secondary = [
    ["Residentes", metrics.totalResidents, `${metrics.activeResidents} activos`],
    ["DS 20 iniciado", metrics.ds20Started ?? 0, "Con evidencia cargada"],
    ["Accesos pendientes", metrics.pendingAccessUsers ?? 0, "Sin completar primer ingreso"],
    ["Documentos críticos", metrics.criticalDocuments ?? 0, "Vencidos o próximos"],
    ["Solicitudes demo · 7d", metrics.newLeadsLast7d ?? 0, "Desde la web"],
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{essential.map((item) => <Metric key={item.label} {...item} />)}</div>
      <PriorityClients clients={metrics.priorityClients ?? []} onOpenClient={onOpenClient} />
      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">Ver indicadores complementarios</summary>
        <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-5">
          {secondary.map(([label, value, detail]) => <Metric key={label} label={label} value={value} detail={detail} />)}
        </div>
        <button type="button" onClick={onFilterLeads} className="mx-3 mb-3 text-xs font-semibold text-teal-700 hover:underline">Abrir gestión de leads →</button>
      </details>
    </div>
  );
}
