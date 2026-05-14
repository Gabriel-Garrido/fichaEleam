import React from "react";
import { formatCLP } from "../utils/superadminFormatters";
import MetricHelp from "./MetricHelp";

const toneClasses = {
  slate: "text-slate-800 border-slate-200",
  emerald: "text-emerald-700 border-emerald-200",
  teal: "text-teal-700 border-teal-200",
  sky: "text-sky-700 border-sky-200",
  violet: "text-violet-700 border-violet-200",
  amber: "text-amber-700 border-amber-200",
  rose: "text-rose-700 border-rose-200",
};

function MetricCard({
  label,
  value,
  sub,
  tone = "slate",
  help,
  onClick,
  actionLabel = "Filtrar",
}) {
  const toneClass = toneClasses[tone] ?? toneClasses.slate;

  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {help && <MetricHelp title={label} {...help} />}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-1 min-h-[18px] text-xs text-slate-500">{sub}</p>}
      {onClick && (
        <button
          type="button"
          onClick={onClick}
          className="mt-3 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          {actionLabel}
        </button>
      )}
    </article>
  );
}

export default function SuperAdminMetrics({ metrics, onFilterRisk, onFilterLeads, leadsNuevos = 0, activeInDemoCount = 0 }) {
  if (!metrics) return null;

  const activeRatio = metrics.totalEleams
    ? Math.round((metrics.activeSubscriptions / metrics.totalEleams) * 100)
    : 0;
  const demoRatio = metrics.totalEleams
    ? Math.round((metrics.demoEleams / metrics.totalEleams) * 100)
    : 0;

  const groups = [
    {
      title: "Negocio",
      description: "Estado comercial general de la cartera y los ingresos del mes.",
      items: [
        {
          label: "ELEAMs",
          value: metrics.totalEleams,
          sub: `+${metrics.newEleamsThisMonth} este mes`,
          tone: "slate",
          help: {
            description: "Cantidad total de ELEAMs registrados en la plataforma.",
            source: "public.eleams: conteo total y creado_en desde el inicio del mes.",
            action: "Mide crecimiento de cartera y volumen administrativo.",
          },
        },
        {
          label: "Activos",
          value: metrics.activeSubscriptions,
          sub: `${activeRatio}% de la cartera`,
          tone: "emerald",
          help: {
            description: "ELEAMs con pago activo o suscripcion vigente en la app.",
            source: "public.eleams.pago_activo = true.",
            action: "Ayuda a distinguir clientes operativos de cuentas en venta o prueba.",
          },
        },
        {
          label: "Ingresos mes",
          value: formatCLP(metrics.mrrCLP),
          sub: "Pagos completados",
          tone: "sky",
          help: {
            description: "Suma de pagos completados durante el mes calendario actual.",
            source: "public.pagos.monto con estado = completado y fecha_pago dentro del mes.",
            action: "Permite revisar caja mensual y detectar diferencias contra la cartera activa.",
          },
        },
      ],
    },
    {
      title: "Pipeline",
      description: "Cuentas que requieren accion comercial o seguimiento de conversion.",
      items: [
        {
          label: "Leads CRM",
          value: metrics.leads,
          sub: "Estados comerciales iniciales",
          tone: "teal",
          onClick: onFilterLeads,
          actionLabel: "Ver leads",
          help: {
            description: "ELEAMs que siguen en etapas previas al pago o activacion formal.",
            source: "public.eleams.crm_estado en lead, contactado, demo_agendada, demo_realizada o prueba.",
            action: "Filtra la tabla para priorizar seguimiento comercial.",
          },
        },
        {
          label: "En demo",
          value: metrics.demoEleams,
          sub: `${demoRatio}% de la cartera`,
          tone: "amber",
          help: {
            description: "ELEAMs con plan demo activo. Son clientes en período de prueba que aún no tienen suscripción paga.",
            source: "public.eleams.plan = 'demo'.",
            action: "Priorizar seguimiento comercial para convertir demos en suscripciones pagadas.",
          },
        },
        {
          label: "En riesgo",
          value: metrics.enRiesgo,
          sub: "Riesgo alto o cliente_riesgo",
          tone: "rose",
          onClick: onFilterRisk,
          actionLabel: "Ver riesgo",
          help: {
            description: "Clientes marcados con mayor probabilidad de churn o estado comercial critico.",
            source: "public.eleams.riesgo_churn = alto o crm_estado = cliente_riesgo.",
            action: "Filtra la cartera para revisar retencion, tareas vencidas y renovaciones.",
          },
        },
      ],
    },
    {
      title: "Operacion y demo",
      description: "Uso operativo del producto y actividad reciente de la landing.",
      items: [
        {
          label: "Residentes",
          value: metrics.totalResidents,
          sub: `${metrics.activeResidents} activos`,
          tone: "slate",
          help: {
            description: "Volumen de residentes registrados por todos los ELEAMs.",
            source: "public.residentes: conteo total y estado = activo.",
            action: "Aporta contexto sobre tamano real de uso y carga operativa.",
          },
        },
        {
          label: "Leads nuevos 7d",
          value: leadsNuevos,
          sub: "Landing page",
          tone: "amber",
          help: {
            description: "Leads captados por la landing durante los ultimos siete dias.",
            source: "public.demo_leads.creado_en, calculado en esta vista.",
            action: "Indica si las campanas recientes estan generando demanda.",
          },
        },
        {
          label: "En demo ahora",
          value: activeInDemoCount,
          sub: activeInDemoCount > 0 ? "Sesiones activas" : "Sin sesiones activas",
          tone: activeInDemoCount > 0 ? "teal" : "slate",
          help: {
            description: "Leads con acceso demo y actividad reciente detectada por ping.",
            source: "public.demo_leads.estado = demo_activo y demo_ultimo_ping reciente.",
            action: "Permite contactar al prospecto mientras esta probando el producto.",
          },
        },
      ],
    },
  ];

  return (
    <div className="mb-6 space-y-5">
      {groups.map((group) => (
        <section key={group.title} className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{group.title}</h2>
            <p className="text-xs text-slate-500">{group.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <MetricCard key={item.label} {...item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
