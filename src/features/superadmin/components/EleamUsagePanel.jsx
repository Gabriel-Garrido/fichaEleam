import { useEffect, useState } from "react";
import HelpTooltip from "../../../components/HelpTooltip";
import { getEleamUsage } from "../superadminService";

const WINDOWS = [7, 30, 90];
const ROLE_BADGE = {
  admin_eleam: { label: "Administrador", cls: "bg-teal-100 text-teal-700" },
  funcionario: { label: "Funcionario", cls: "bg-sky-100 text-sky-700" },
};

function daysSince(value) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
}

function timeAgo(value) {
  const days = daysSince(value);
  if (days == null) return "Sin actividad";
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  return `Hace ${months} ${months === 1 ? "mes" : "meses"}`;
}

function Kpi({ value, label, tone = "slate" }) {
  const tones = { slate: "text-slate-800", emerald: "text-emerald-700", teal: "text-teal-700", amber: "text-amber-700" };
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <p className={`text-xl font-bold tabular-nums ${tones[tone] ?? tones.slate}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-500">{label}</p>
    </div>
  );
}

export default function EleamUsagePanel({ eleamId, initialDays = 30 }) {
  const [days, setDays] = useState(initialDays);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => setDays(initialDays), [eleamId, initialDays]);

  useEffect(() => {
    if (!eleamId) return undefined;
    let active = true;
    setLoading(true);
    setError("");
    getEleamUsage(eleamId, { days })
      .then((result) => { if (active) setData(result); })
      .catch((err) => {
        console.error(err);
        if (active) setError("No pudimos cargar el uso de este ELEAM.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days, eleamId, reloadKey]);

  const summary = data?.summary;
  const users = data?.users ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            Uso de la app
            <HelpTooltip label="Cómo se mide">
              Se considera activo a quien creó registros operativos durante el período. Una cuenta pendiente aún no completa su primer acceso.
            </HelpTooltip>
          </h3>
          <p className="mt-1 text-xs text-slate-500">Actividad general y participación de cada usuario.</p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5" aria-label="Período del detalle">
          {WINDOWS.map((windowDays) => (
            <button key={windowDays} type="button" onClick={() => setDays(windowDays)} aria-pressed={days === windowDays} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${days === windowDays ? "bg-teal-700 text-white" : "text-slate-500 hover:text-slate-800"}`}>
              {windowDays}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[0, 1, 2, 3].map((key) => <div key={key} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p>{error}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-2 font-semibold underline">Reintentar</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi value={summary?.usuariosTotales ?? 0} label="Usuarios con acceso" />
            <Kpi value={summary?.usuariosActivos ?? 0} label={`Usuarios activos · ${days}d`} tone="emerald" />
            <Kpi value={(summary?.totalRegistros ?? 0).toLocaleString("es-CL")} label={`Registros creados · ${days}d`} tone="teal" />
            <Kpi value={timeAgo(summary?.ultimaActividadEleam)} label="Última actividad" tone={(daysSince(summary?.ultimaActividadEleam) ?? 999) <= 7 ? "emerald" : "amber"} />
          </div>

          {summary?.sinPrimerIngreso > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {summary.sinPrimerIngreso} {summary.sinPrimerIngreso === 1 ? "persona aún no activa su cuenta" : "personas aún no activan su cuenta"}.
            </p>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-slate-700">Uso por usuario</h4>
              <span className="text-[11px] text-slate-500">{users.length} {users.length === 1 ? "persona" : "personas"}</span>
            </div>
            {users.length === 0 ? (
              <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">Este ELEAM aún no tiene usuarios con acceso.</p>
            ) : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-white">
                {users.map((user) => {
                  const badge = ROLE_BADGE[user.rol] ?? { label: user.rol ?? "Usuario", cls: "bg-slate-100 text-slate-600" };
                  return (
                    <li key={user.id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">{user.nombre || "Sin nombre"}</p>
                          {user.must_reset_password && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Acceso pendiente</span>}
                        </div>
                        <p className="truncate text-xs text-slate-500">{user.email || "Sin correo"}</p>
                      </div>
                      <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>{badge.label}</span>
                      <div className="flex items-center justify-between gap-4 sm:min-w-36 sm:justify-end sm:text-right">
                        <span><strong className="block text-sm tabular-nums text-slate-800">{user.registros ?? 0}</strong><span className="text-[10px] text-slate-500">registros</span></span>
                        <span><strong className="block text-xs font-semibold text-slate-700">{timeAgo(user.ultimaActividad)}</strong><span className="text-[10px] text-slate-500">última actividad</span></span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
