import HelpTooltip from "../../../components/HelpTooltip";
import {
  canResendDemoAccess,
  portfolioUsageState,
  summarizePortfolioUsage,
  usageDaysSince,
} from "../utils/portfolioUsage";

const WINDOWS = [7, 30, 90];

const STATE_STYLE = {
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

function timeAgo(value) {
  const days = usageDaysSince(value);
  if (days == null) return "Sin actividad registrada";
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Hace ${months} ${months === 1 ? "mes" : "meses"}`;
  const years = Math.floor(days / 365);
  return `Hace ${years} ${years === 1 ? "año" : "años"}`;
}

function Kpi({ label, value, detail, tone = "slate" }) {
  const tones = {
    slate: "text-slate-900",
    teal: "text-teal-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <p className={`text-2xl font-bold tabular-nums ${tones[tone] ?? tones.slate}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-700">{label}</p>
      {detail && <p className="mt-0.5 text-[11px] text-slate-400">{detail}</p>}
    </div>
  );
}

function UsageRow({
  item,
  onOpen,
  maxRecords,
  attention = false,
  onResendDemoAccess,
  resendingDemoId,
}) {
  const state = portfolioUsageState(item);
  const width = item.registros > 0 ? Math.max(4, Math.round((item.registros / maxRecords) * 100)) : 0;
  const canResend = canResendDemoAccess(item.eleam, item);
  const isResending = resendingDemoId === item.eleamId;
  return (
    <div className="flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2.5 last:border-0 hover:bg-slate-50">
      <button type="button" onClick={() => onOpen?.(item.eleam)} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-800">{item.eleam?.nombre ?? "ELEAM"}</span>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATE_STYLE[state.tone]}`}>
            {state.label}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
          <span>{timeAgo(item.ultimaActividad)}</span>
          <span>·</span>
          <span>{item.usuariosActivos}/{item.usuariosTotales} usuarios activos</span>
          {item.usuariosSinPrimerIngreso > 0 && (
            <><span>·</span><span className="text-amber-700">{item.usuariosSinPrimerIngreso} sin activar</span></>
          )}
        </span>
        {!attention && (
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-teal-500" style={{ width: `${width}%` }} />
          </span>
        )}
      </button>
      <span className="text-right">
        <span className="block text-sm font-bold tabular-nums text-slate-800">{item.registros.toLocaleString("es-CL")}</span>
        <span className="block text-[10px] text-slate-400">registros</span>
      </span>
      {canResend && (
        <button
          type="button"
          onClick={() => onResendDemoAccess?.(item.eleam)}
          disabled={Boolean(resendingDemoId)}
          title="Genera un enlace nuevo y reenvía las instrucciones para iniciar el demo"
          className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-50"
        >
          {isResending ? "Enviando…" : "Reenviar instrucciones"}
        </button>
      )}
    </div>
  );
}

export default function PortfolioUsageOverview({
  eleams,
  usage,
  days,
  loading,
  error,
  onDaysChange,
  onOpen,
  onResendDemoAccess,
  resendingDemoId,
}) {
  const eleamById = Object.fromEntries(eleams.map((eleam) => [eleam.id, eleam]));
  const visible = usage
    .filter((row) => eleamById[row.eleamId])
    .map((row) => ({ ...row, eleam: eleamById[row.eleamId] }));
  const summary = summarizePortfolioUsage(visible);
  const enabled = visible.filter((row) => row.usuariosTotales > 0);
  const top = [...enabled].sort((a, b) => b.registros - a.registros).slice(0, 5);
  const attention = enabled
    .filter((row) => {
      const state = portfolioUsageState(row);
      return ["never", "inactive", "low"].includes(state.key) || row.usuariosSinPrimerIngreso > 0;
    })
    .sort((a, b) => {
      if (a.registros !== b.registros) return a.registros - b.registros;
      return b.usuariosSinPrimerIngreso - a.usuariosSinPrimerIngreso;
    })
    .slice(0, 5);
  const maxRecords = Math.max(1, ...top.map((row) => row.registros));

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            Uso general de la app
            <HelpTooltip label="Cómo se mide el uso">
              Agrega actividad operativa de signos vitales, observaciones, visitas, medicamentos, cuidados, turnos, residentes, eventos adversos, camas y acreditación. No usa aperturas de pantalla ni datos clínicos; solo conteos, usuarios y fecha de actividad por ELEAM.
            </HelpTooltip>
          </h2>
          <p className="mt-1 text-xs text-slate-500">Comparación automática de toda la cartera, sin abrir cada ficha.</p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
          {WINDOWS.map((windowDays) => (
            <button
              key={windowDays}
              type="button"
              onClick={() => onDaysChange(windowDays)}
              disabled={loading}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                days === windowDays ? "bg-teal-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              } disabled:opacity-50`}
            >
              {windowDays}d
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
        <>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label={`Registros en ${days} días`}
              value={summary.registros.toLocaleString("es-CL")}
              detail={`${summary.clientesConUso} ELEAM con actividad`}
              tone="teal"
            />
            <Kpi
              label="Adopción de clientes"
              value={`${summary.adopcionPct}%`}
              detail={`${summary.clientesConUso} de ${summary.clientesHabilitados} habilitados`}
              tone={summary.adopcionPct >= 70 ? "emerald" : summary.adopcionPct >= 40 ? "amber" : "rose"}
            />
            <Kpi
              label="Usuarios activos"
              value={`${summary.usuariosActivos}/${summary.usuariosTotales}`}
              detail={`Actividad atribuida en ${days} días`}
              tone="emerald"
            />
            <Kpi
              label="Requieren activación"
              value={summary.usuariosSinPrimerIngreso}
              detail={`${summary.clientesSinUso} ELEAM sin uso en la ventana`}
              tone={summary.usuariosSinPrimerIngreso || summary.clientesSinUso ? "amber" : "emerald"}
            />
          </div>

          <div className="grid border-t border-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-slate-100">
            <div>
              <div className="border-b border-slate-50 px-4 py-3">
                <h3 className="text-xs font-semibold text-slate-700">Mayor uso</h3>
                <p className="text-[11px] text-slate-400">ELEAM con más registros en la ventana seleccionada.</p>
              </div>
              {top.length ? top.map((item) => (
                <UsageRow key={item.eleamId} item={item} onOpen={onOpen} maxRecords={maxRecords} />
              )) : <p className="px-4 py-8 text-center text-sm text-slate-400">Aún no hay clientes habilitados.</p>}
            </div>
            <div>
              <div className="border-b border-slate-50 px-4 py-3">
                <h3 className="text-xs font-semibold text-slate-700">Necesitan atención</h3>
                <p className="text-[11px] text-slate-400">Sin uso reciente, actividad baja o usuarios pendientes de activar.</p>
              </div>
              {attention.length ? attention.map((item) => (
                <UsageRow
                  key={item.eleamId}
                  item={item}
                  onOpen={onOpen}
                  maxRecords={maxRecords}
                  attention
                  onResendDemoAccess={onResendDemoAccess}
                  resendingDemoId={resendingDemoId}
                />
              )) : <p className="px-4 py-8 text-center text-sm text-emerald-600">No hay alertas de uso en esta selección.</p>}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
