import HelpTooltip from "../../../components/HelpTooltip";
import { PLAN_LABEL } from "../utils/superadminFormatters";
import {
  canResendDemoAccess,
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

function lastActivityLabel(value) {
  const days = usageDaysSince(value);
  if (days == null) return "Sin actividad";
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  return `Hace ${months} ${months === 1 ? "mes" : "meses"}`;
}

function usageForEleam(eleam, usageByEleam) {
  return usageByEleam[eleam.id] ?? {
    eleamId: eleam.id,
    usuariosTotales: 0,
    usuariosActivos: 0,
    usuariosSinPrimerIngreso: 0,
    registros: 0,
    modulosActivos: 0,
    ultimaActividad: null,
  };
}

function UsageBadge({ usage }) {
  const state = portfolioUsageState(usage);
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${STATE_STYLE[state.tone]}`}>{state.label}</span>;
}

function UsageProgress({ active, total }) {
  const percentage = total > 0 ? Math.round((active / total) * 100) : 0;
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Usuarios activos" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage}>
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-[11px] text-slate-500">{percentage}%</span>
    </div>
  );
}

export default function EleamTable({
  eleams,
  onOpen,
  portfolioUsage = [],
  usageDays = 30,
  onResendDemoAccess,
  resendingDemoId,
}) {
  const usageByEleam = indexPortfolioUsage(portfolioUsage);
  const rows = eleams.map((eleam) => ({ eleam, usage: usageForEleam(eleam, usageByEleam) }));

  if (rows.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">No hay ELEAM que coincidan con los filtros.</div>;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-950">
            Uso por ELEAM
            <HelpTooltip label="Cómo leer el listado">Compara actividad operativa de los últimos {usageDays} días. Los registros incluyen cuidados, medicamentos, signos, observaciones, turnos, residentes, camas, eventos y documentos; no corresponden a aperturas de pantalla.</HelpTooltip>
          </h2>
          <p className="mt-1 text-sm text-slate-500">Selecciona una fila para revisar usuarios y actividad en detalle.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{rows.length} ELEAM</span>
      </header>

      <div className="divide-y divide-slate-100 md:hidden">
        {rows.map(({ eleam, usage }) => {
          const canResend = canResendDemoAccess(eleam, usage);
          return (
            <article key={eleam.id} className="p-4">
              <button type="button" onClick={() => onOpen(eleam)} className="w-full text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="truncate font-bold text-slate-950">{eleam.nombre}</h3><p className="mt-0.5 truncate text-xs text-slate-500">{eleam.email_admin || "Sin correo administrador"}</p></div>
                  <UsageBadge usage={usage} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MobileMetric label="Usuarios activos" value={`${usage.usuariosActivos}/${usage.usuariosTotales}`} />
                  <MobileMetric label={`Registros ${usageDays}d`} value={usage.registros.toLocaleString("es-CL")} />
                  <MobileMetric label="Áreas usadas" value={`${usage.modulosActivos}/9`} />
                  <MobileMetric label="Última actividad" value={lastActivityLabel(usage.ultimaActividad)} />
                </div>
                {usage.usuariosSinPrimerIngreso > 0 && <p className="mt-3 text-xs font-semibold text-amber-700">{usage.usuariosSinPrimerIngreso} usuario{usage.usuariosSinPrimerIngreso === 1 ? "" : "s"} sin activar</p>}
                <span className="mt-4 inline-flex min-h-10 items-center text-sm font-bold text-teal-700">Ver detalle →</span>
              </button>
              {canResend && <ResendButton eleam={eleam} onResend={onResendDemoAccess} disabled={Boolean(resendingDemoId)} loading={resendingDemoId === eleam.id} />}
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3 font-bold">ELEAM</th><th className="px-3 py-3 font-bold">Nivel de uso</th><th className="px-3 py-3 font-bold">Usuarios</th><th className="px-3 py-3 text-right font-bold">Registros</th><th className="px-3 py-3 text-center font-bold">Áreas</th><th className="px-3 py-3 font-bold">Última actividad</th><th className="px-3 py-3 font-bold">Plan y acceso</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ eleam, usage }) => {
              const canResend = canResendDemoAccess(eleam, usage);
              return (
                <tr key={eleam.id} className="group cursor-pointer hover:bg-teal-50/40" onClick={() => onOpen(eleam)}>
                  <td className="px-4 py-4"><p className="max-w-56 truncate font-bold text-slate-950">{eleam.nombre}</p><p className="mt-0.5 max-w-56 truncate text-xs text-slate-500">{eleam.email_admin || "Sin correo administrador"}</p></td>
                  <td className="px-3 py-4"><UsageBadge usage={usage} />{usage.usuariosSinPrimerIngreso > 0 && <p className="mt-1.5 text-[11px] font-semibold text-amber-700">{usage.usuariosSinPrimerIngreso} sin activar</p>}</td>
                  <td className="px-3 py-4"><p className="font-bold tabular-nums text-slate-800">{usage.usuariosActivos}/{usage.usuariosTotales}</p><UsageProgress active={usage.usuariosActivos} total={usage.usuariosTotales} /></td>
                  <td className="px-3 py-4 text-right"><p className="text-base font-black tabular-nums text-slate-900">{usage.registros.toLocaleString("es-CL")}</p><p className="text-[11px] text-slate-400">últimos {usageDays} días</p></td>
                  <td className="px-3 py-4 text-center"><p className="font-bold tabular-nums text-slate-800">{usage.modulosActivos}/9</p><p className="text-[11px] text-slate-400">con actividad</p></td>
                  <td className="px-3 py-4"><p className="font-semibold text-slate-700">{lastActivityLabel(usage.ultimaActividad)}</p></td>
                  <td className="px-3 py-4"><p className="font-semibold text-slate-700">{PLAN_LABEL[eleam.plan] ?? eleam.plan ?? "Sin plan"}</p><p className={`mt-0.5 text-xs font-semibold ${eleam.pago_activo ? "text-emerald-700" : eleam.plan === "demo" ? "text-amber-700" : "text-rose-700"}`}>{eleam.pago_activo ? "Acceso activo" : eleam.plan === "demo" ? "Demo sin acceso" : "Sin acceso"}</p></td>
                  <td className="px-4 py-4 text-right" onClick={(event) => event.stopPropagation()}>{canResend && <ResendButton eleam={eleam} onResend={onResendDemoAccess} disabled={Boolean(resendingDemoId)} loading={resendingDemoId === eleam.id} compact />}<button type="button" onClick={() => onOpen(eleam)} className="ml-2 min-h-10 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50">Ver detalle</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MobileMetric({ label, value }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-black tabular-nums text-slate-900">{value}</p><p className="mt-0.5 text-[11px] text-slate-500">{label}</p></div>;
}

function ResendButton({ eleam, onResend, disabled, loading, compact = false }) {
  return <button type="button" onClick={() => onResend?.(eleam)} disabled={disabled} className={`${compact ? "min-h-10 px-2.5" : "min-h-10 px-3"} rounded-xl border border-amber-200 bg-amber-50 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50`}>{loading ? "Enviando…" : compact ? "Reenviar" : "Reenviar acceso demo"}</button>;
}
