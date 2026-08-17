import HelpTooltip from "../../../components/HelpTooltip";
import { PLAN_LABEL } from "../utils/superadminFormatters";
import {
  demoRestartInvitationState,
  demoLoginLabel,
  indexPortfolioUsage,
  portfolioUsageState,
  usageDaysSince,
} from "../utils/portfolioUsage";

const STATE_STYLE = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
};

function timeAgo(value) {
  const days = usageDaysSince(value);
  if (days == null) return "Sin actividad";
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  return `Hace ${months} ${months === 1 ? "mes" : "meses"}`;
}

function fallbackUsage(eleam) {
  return {
    eleamId: eleam.id,
    usuariosTotales: 0,
    usuariosActivos: 0,
    registros: 0,
    modulosActivos: 0,
    ultimaActividad: null,
    residentesTotales: 0,
    residentesActivos: 0,
    camasTotales: 0,
    camasOcupadas: 0,
  };
}

function UsageBadge({ usage }) {
  const state = portfolioUsageState(usage);
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${STATE_STYLE[state.tone]}`}>{state.label}</span>;
}

function DemoActions({ eleam, engagement, onInvite, action, compact = false }) {
  const sending = action?.id === eleam.id && action.type === "restart_invitation";
  const busy = Boolean(action);
  const state = demoRestartInvitationState(eleam, engagement);
  if (!state.visible) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "mt-3" : "justify-end"}`}>
      <button
        type="button"
        disabled={busy || state.disabled}
        title={state.reason || "Ver el correo antes de reiniciar el demo"}
        onClick={() => onInvite?.(eleam)}
        className="min-h-10 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
      >
        {sending ? "Enviando…" : state.reason || "Invitar · 30 días gratis"}
      </button>
    </div>
  );
}

export default function EleamTable({
  eleams,
  onOpen,
  portfolioUsage = [],
  usageDays = 30,
  demoEngagement = [],
  onInviteDemoRestart,
  demoAction,
}) {
  const usageByEleam = indexPortfolioUsage(portfolioUsage);
  const engagementByEleam = Object.fromEntries(demoEngagement.map((item) => [item.eleamId, item]));
  const rows = eleams.map((eleam) => ({
    eleam,
    usage: usageByEleam[eleam.id] ?? fallbackUsage(eleam),
    engagement: engagementByEleam[eleam.id] ?? null,
  }));

  if (!rows.length) return <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">No hay ELEAM que coincidan con los filtros.</div>;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-950">
            Cartera de clientes
            <HelpTooltip label="Cómo leer la cartera">Capacidad y actividad se obtienen de registros agregados. En demos, el último ingreso corresponde a la sesión real del administrador.</HelpTooltip>
          </h2>
          <p className="mt-1 text-sm text-slate-500">Abre un cliente para consultar sus datos y gestionar el seguimiento.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{rows.length} ELEAM</span>
      </header>

      <div className="divide-y divide-slate-100 md:hidden">
        {rows.map(({ eleam, usage, engagement }) => (
          <article key={eleam.id} className="p-4">
            <button type="button" onClick={() => onOpen(eleam)} className="w-full text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h3 className="truncate font-bold text-slate-950">{eleam.nombre}</h3><p className="mt-0.5 truncate text-xs text-slate-500">{eleam.email_admin || "Sin correo administrador"}</p></div>
                <UsageBadge usage={usage} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MobileMetric label="Residentes" value={`${usage.residentesActivos}/${usage.residentesTotales}`} />
                <MobileMetric label="Camas ocupadas" value={`${usage.camasOcupadas}/${usage.camasTotales}`} />
                <MobileMetric label={`Registros · ${usageDays}d`} value={usage.registros.toLocaleString("es-CL")} />
                <MobileMetric label={eleam.plan === "demo" ? "Acceso administrador" : "Última actividad"} value={eleam.plan === "demo" ? demoLoginLabel(engagement) : timeAgo(usage.ultimaActividad)} />
              </div>
              <span className="mt-3 inline-flex min-h-10 items-center text-sm font-bold text-teal-700">Ver detalle →</span>
            </button>
            <DemoActions compact eleam={eleam} engagement={engagement} onInvite={onInviteDemoRestart} action={demoAction} />
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">Cliente</th>
              <th className="px-3 py-3 font-bold">Capacidad</th>
              <th className="px-3 py-3 font-bold">Uso</th>
              <th className="px-3 py-3 font-bold">Actividad y acceso</th>
              <th className="px-3 py-3 font-bold">Plan</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ eleam, usage, engagement }) => (
              <tr key={eleam.id} className="group cursor-pointer hover:bg-teal-50/40" onClick={() => onOpen(eleam)}>
                <td className="px-4 py-4"><p className="max-w-56 truncate font-bold text-slate-950">{eleam.nombre}</p><p className="mt-0.5 max-w-56 truncate text-xs text-slate-500">{eleam.email_admin || "Sin correo administrador"}</p></td>
                <td className="px-3 py-4"><p className="font-bold tabular-nums text-slate-800">{usage.residentesActivos}/{usage.residentesTotales} residentes</p><p className="mt-1 text-xs text-slate-500">{usage.camasOcupadas}/{usage.camasTotales} camas ocupadas</p></td>
                <td className="px-3 py-4"><UsageBadge usage={usage} /><p className="mt-1.5 text-xs text-slate-500"><strong className="text-slate-700">{usage.registros.toLocaleString("es-CL")}</strong> registros · {usageDays}d</p></td>
                <td className="px-3 py-4"><p className={`font-semibold ${eleam.plan === "demo" && (engagement?.neverSignedIn || (engagement?.inactiveDays ?? 0) > 10) ? "text-amber-700" : "text-slate-700"}`}>{eleam.plan === "demo" ? demoLoginLabel(engagement) : timeAgo(usage.ultimaActividad)}</p><p className="mt-1 text-xs text-slate-500">{usage.usuariosActivos}/{usage.usuariosTotales} usuarios con actividad</p></td>
                <td className="px-3 py-4"><p className="font-semibold text-slate-700">{PLAN_LABEL[eleam.plan] ?? eleam.plan ?? "Sin plan"}</p><p className={`mt-0.5 text-xs font-semibold ${eleam.pago_activo ? "text-emerald-700" : "text-rose-700"}`}>{eleam.pago_activo ? "Acceso activo" : "Sin acceso"}</p></td>
                <td className="px-4 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                  <DemoActions eleam={eleam} engagement={engagement} onInvite={onInviteDemoRestart} action={demoAction} />
                  <button type="button" onClick={() => onOpen(eleam)} className="mt-2 min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Ver detalle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MobileMetric({ label, value }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-black tabular-nums text-slate-900">{value}</p><p className="mt-0.5 text-[11px] text-slate-500">{label}</p></div>;
}
