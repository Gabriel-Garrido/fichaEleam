import { useEffect, useState } from "react";
import { getEleamUsage } from "../superadminService";
import { formatDateTime } from "../utils/superadminFormatters";
import HelpTooltip from "../../../components/HelpTooltip";

const WINDOWS = [7, 30, 90];

const ROLE_BADGE = {
  admin_eleam: { label: "Admin", cls: "bg-teal-100 text-teal-700" },
  funcionario: { label: "Funcionario", cls: "bg-sky-100 text-sky-700" },
  familiar:    { label: "Familiar", cls: "bg-violet-100 text-violet-700" },
};

function daysSince(iso) {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function timeAgo(iso) {
  if (!iso) return "Sin actividad";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return "Recién";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? "día" : "días"}`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `hace ${mo} ${mo === 1 ? "mes" : "meses"}`;
  const y = Math.floor(d / 365);
  return `hace ${y} ${y === 1 ? "año" : "años"}`;
}

function statusTone(iso) {
  const d = daysSince(iso);
  if (d <= 7) return "bg-emerald-500";
  if (d <= 30) return "bg-amber-500";
  return "bg-slate-300";
}

function Kpi({ value, label, tone = "slate" }) {
  const tones = {
    slate:   "text-slate-800",
    emerald: "text-emerald-700",
    teal:    "text-teal-700",
    amber:   "text-amber-700",
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <p className={`text-xl font-bold tabular-nums ${tones[tone] ?? tones.slate}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-500">{label}</p>
    </div>
  );
}

export default function EleamUsagePanel({ eleamId }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !eleamId) return undefined;
    let active = true;
    setLoading(true);
    setError("");
    getEleamUsage(eleamId, { days })
      .then((res) => { if (active) setData(res); })
      .catch((err) => {
        console.error(err);
        if (active) setError("No pudimos cargar la actividad de uso.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, days, eleamId]);

  const summary = data?.summary;
  const users = data?.users ?? [];
  const maxReg = Math.max(1, ...users.map((u) => u.registros || 0));

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 border-b border-slate-100 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Uso de la app
        <HelpTooltip label="Uso de la app">
          Actividad estimada por los registros operativos que crea cada persona (signos, observaciones, medicamentos, turnos, residentes, visitas, camas y documentos), no por inicio de sesión. Sin tocar el backend no hay dato de último login; &quot;Sin primer ingreso&quot; indica cuentas creadas que aún no configuran su clave.
        </HelpTooltip>
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 transition hover:border-teal-300 hover:bg-teal-50/40"
        >
          <span>
            <span className="font-semibold text-slate-800">Ver actividad de usuarios</span>
            <span className="block text-xs text-slate-400">Quién usa la app en este ELEAM y cuándo fue su última actividad.</span>
          </span>
          <span className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white">Cargar</span>
        </button>
      ) : (
        <div className="space-y-4">
          {/* Selector de ventana + refrescar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
              {WINDOWS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    days === d ? "bg-teal-600 text-white" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400">Ventana: últimos {days} días</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Kpi value={summary?.usuariosTotales ?? 0} label="Usuarios" />
                <Kpi value={summary?.usuariosActivos ?? 0} label={`Activos (${days}d)`} tone="emerald" />
                <Kpi value={summary?.totalRegistros ?? 0} label={`Registros (${days}d)`} tone="teal" />
                <Kpi
                  value={timeAgo(summary?.ultimaActividadEleam)}
                  label="Última actividad"
                  tone={daysSince(summary?.ultimaActividadEleam) <= 7 ? "emerald" : daysSince(summary?.ultimaActividadEleam) <= 30 ? "amber" : "slate"}
                />
              </div>

              {summary?.sinPrimerIngreso > 0 && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {summary.sinPrimerIngreso} {summary.sinPrimerIngreso === 1 ? "usuario creado aún no configura su acceso" : "usuarios creados aún no configuran su acceso"} (nunca ingresaron).
                </p>
              )}

              {summary?.registrosSinActor > 0 && (
                <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  {summary.registrosSinActor} {summary.registrosSinActor === 1 ? "registro de actividad no tiene" : "registros de actividad no tienen"} un usuario asociado (importación o datos de prueba). Cuentan en el total del ELEAM, pero no se pueden atribuir a una persona.
                </p>
              )}

              {/* Tabla de usuarios */}
              {users.length === 0 ? (
                <p className="rounded-xl border border-slate-100 bg-white px-3 py-4 text-center text-sm text-slate-400">
                  Este ELEAM aún no tiene usuarios.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Usuario</th>
                        <th className="px-3 py-2 font-semibold">Rol</th>
                        <th className="px-3 py-2 font-semibold">Registros</th>
                        <th className="px-3 py-2 font-semibold">Última actividad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => {
                        const badge = ROLE_BADGE[u.rol] ?? { label: u.rol, cls: "bg-slate-100 text-slate-600" };
                        const inactivo = !u.ultimaActividad;
                        return (
                          <tr key={u.id} className={inactivo ? "bg-slate-50/40" : ""}>
                            <td className="px-3 py-2.5">
                              <div className="flex min-w-0 flex-col">
                                <span className="flex items-center gap-2 font-medium text-slate-800">
                                  <span className="truncate">{u.nombre ?? "—"}</span>
                                  {u.must_reset_password && (
                                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                                      Sin primer ingreso
                                    </span>
                                  )}
                                </span>
                                {u.email && <span className="truncate text-xs text-slate-400">{u.email}</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>{badge.label}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-6 tabular-nums font-semibold text-slate-700">{u.registros}</span>
                                <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 sm:block">
                                  <span
                                    className={`block h-full rounded-full ${u.registros > 0 ? "bg-teal-500" : "bg-transparent"}`}
                                    style={{ width: `${Math.round((u.registros / maxReg) * 100)}%` }}
                                  />
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="flex items-center gap-2" title={u.ultimaActividad ? formatDateTime(u.ultimaActividad) : "Sin actividad registrada"}>
                                <span className={`h-2 w-2 shrink-0 rounded-full ${statusTone(u.ultimaActividad)}`} />
                                <span className={inactivo ? "text-slate-400" : "text-slate-600"}>{timeAgo(u.ultimaActividad)}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {summary?.fuentesConError > 0 && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                  {summary.fuentesConError} {summary.fuentesConError === 1 ? "fuente de actividad no se pudo leer" : "fuentes de actividad no se pudieron leer"} (revisa permisos o la consola).
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
