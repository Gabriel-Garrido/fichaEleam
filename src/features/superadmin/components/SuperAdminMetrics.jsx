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
          className="mt-3 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          {actionLabel}
        </button>
      )}
    </article>
  );
}

function PriorityClients({ clients = [], onOpenClient }) {
  if (!clients.length) {
    return (
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">Sin clientes prioritarios</p>
        <p className="mt-1 text-xs text-emerald-700">No hay señales críticas de adopción, documentos, tareas vencidas o churn.</p>
      </section>
    );
  }

  const toneClass = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Clientes prioritarios</h2>
        <p className="text-xs text-slate-500">Score 0-100 calculado con adopción, actividad, evidencia DS20, pagos, tareas y riesgo churn.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        {clients.map((client) => (
          <article key={client.eleamId} className={`rounded-xl border p-4 shadow-sm ${toneClass[client.tone] ?? toneClass.amber}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{client.nombre}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{client.score}</p>
              </div>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold">
                Score
              </span>
            </div>
            <ul className="mt-3 space-y-1 text-xs leading-relaxed">
              {client.reasons.slice(0, 3).map((reason) => (
                <li key={reason} className="line-clamp-1">{reason}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onOpenClient?.(client)}
              className="mt-3 w-full rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
            >
              Revisar cliente
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function SuperAdminMetrics({ metrics, onFilterRisk, onFilterLeads, onOpenClient }) {
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
          label: "Score cartera",
          value: `${metrics.portfolioScore ?? 0}/100`,
          sub: "Adopción + riesgo",
          tone: (metrics.portfolioScore ?? 0) >= 75 ? "emerald" : (metrics.portfolioScore ?? 0) >= 50 ? "amber" : "rose",
          help: {
            description: "Promedio del score calculado por cliente con señales de adopción, actividad reciente, evidencia DS20, pagos, tareas vencidas y riesgo churn.",
            source: "public.eleams, residentes, profiles, acred_documentos y crm_tasks.",
            action: "Usa clientes prioritarios para decidir a quién contactar primero.",
          },
        },
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
      title: "Adopción",
      description: "Señales de activación real y uso inicial dentro de los ELEAM.",
      items: [
        {
          label: "Activación básica",
          value: metrics.basicActivated ?? 0,
          sub: "Con residente y funcionario",
          tone: "emerald",
          help: {
            description: "ELEAMs que ya tienen al menos un residente activo y un funcionario registrado.",
            source: "public.residentes.estado = activo y public.profiles.rol = funcionario por eleam_id.",
            action: "Si es bajo, prioriza onboarding guiado antes de venta cruzada.",
          },
        },
        {
          label: "Uso últimos 7d",
          value: metrics.activeLast7d ?? 0,
          sub: "Actividad registrada",
          tone: "teal",
          help: {
            description: "ELEAMs con actividad operativa real durante los últimos siete días.",
            source: "Agregación de signos, observaciones, visitas, medicamentos, cuidados, turnos, residentes, eventos, camas y acreditación.",
            action: "Detecta clientes vivos versus cuentas creadas sin avance.",
          },
        },
        {
          label: "DS20 iniciado",
          value: metrics.ds20Started ?? 0,
          sub: "Con evidencia cargada",
          tone: "sky",
          help: {
            description: "ELEAMs que ya cargaron al menos un documento de acreditación DS20.",
            source: "public.acred_documentos por eleam_id.",
            action: "Buen indicador de avance hacia una carpeta fiscalizable.",
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
          sub: `${demoRatio}% de la cartera · ${metrics.demosSinUso ?? 0} sin uso`,
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
      title: "Operacion y captacion",
      description: "Uso operativo del producto y solicitudes recientes desde la landing.",
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
          label: "Solicitudes demo 7d",
          value: metrics.newLeadsLast7d ?? 0,
          sub: "Landing page",
          tone: "amber",
          onClick: onFilterLeads,
          actionLabel: "Ver leads",
          help: {
            description: "Solicitudes de demo recibidas desde la landing en los ultimos siete dias.",
            source: "public.demo_leads.creado_en mayor o igual a hace 7 dias.",
            action: "Revisa y aprueba las solicitudes pendientes dentro de las 24 horas.",
          },
        },
        {
          label: "Inactivos 30d",
          value: metrics.inactive30d ?? 0,
          sub: "Sin actividad reciente",
          tone: (metrics.inactive30d ?? 0) > 0 ? "rose" : "emerald",
          onClick: onFilterRisk,
          actionLabel: "Ver cartera",
          help: {
            description: "ELEAMs sin actividad registrada o con última actividad mayor a 30 días.",
            source: "Última actividad agregada de signos, observaciones, visitas, medicamentos, cuidados, turnos, residentes, eventos, camas y acreditación.",
            action: "Prioriza contacto de recuperación o limpieza comercial.",
          },
        },
        {
          label: "Docs críticos",
          value: metrics.criticalDocuments ?? 0,
          sub: "Vencidos o ≤30 días",
          tone: (metrics.criticalDocuments ?? 0) > 0 ? "amber" : "emerald",
          help: {
            description: "Documentos vigentes con vencimiento vencido o dentro de los próximos 30 días.",
            source: "public.acred_documentos.fecha_vencimiento y vigente = true.",
            action: "Útil para soporte proactivo antes de fiscalización.",
          },
        },
        {
          label: "Accesos pendientes",
          value: metrics.pendingAccessUsers ?? 0,
          sub: "Usuarios sin activar clave",
          tone: (metrics.pendingAccessUsers ?? 0) > 0 ? "amber" : "emerald",
          help: {
            description: "Usuarios que aún deben definir contraseña o completar primer ingreso.",
            source: "public.profiles.must_reset_password = true.",
            action: "Si sube, revisar entrega de invitaciones y onboarding.",
          },
        },
        {
          label: "Tareas vencidas",
          value: metrics.overdueCrmTasks ?? 0,
          sub: "CRM pendientes",
          tone: (metrics.overdueCrmTasks ?? 0) > 0 ? "rose" : "emerald",
          help: {
            description: "Tareas CRM pendientes o en curso con fecha vencida.",
            source: "public.crm_tasks.fecha_vencimiento con estado pendiente/en_curso.",
            action: "Cerrar o reprogramar para que el pipeline no quede sin seguimiento.",
          },
        },
      ],
    },
  ];

  return (
    <div className="mb-6 space-y-5">
      <PriorityClients clients={metrics.priorityClients ?? []} onOpenClient={onOpenClient} />
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
