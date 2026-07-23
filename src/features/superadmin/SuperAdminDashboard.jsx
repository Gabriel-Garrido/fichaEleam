import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "../../components/Loading";
import SuperAdminMetrics from "./components/SuperAdminMetrics";
import CrmPipeline from "./components/CrmPipeline";
import { getAllEleams, getCrmTasks, getMetrics } from "./superadminService";
import { daysUntil, formatDate } from "./utils/superadminFormatters";

// Icons
function IconWarning() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconRefresh({ spinning }) {
  return (
    <svg className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
// Alert strip: items that require immediate attention
function AlertItem({ icon, count, label, sub, color, onClick }) {
  const colorMap = {
    rose:    "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    amber:   "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    sky:     "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors ${colorMap[color]}`}
    >
      {icon}
      <span className="text-base font-bold tabular-nums leading-none">{count}</span>
      <span className="leading-tight">
        {label}
        {sub && <span className="ml-1 opacity-60 font-normal">{sub}</span>}
      </span>
      <IconArrowRight />
    </button>
  );
}

// Overdue task row for the bottom grid
function OverdueTaskRow({ task }) {
  const d = daysUntil(task.fecha_vencimiento);
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-slate-50 last:border-0">
      <div className="shrink-0 mt-0.5 w-5 h-5 rounded-xl bg-rose-100 flex items-center justify-center">
        <IconWarning />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 truncate">{task.titulo}</p>
        <p className="text-xs text-rose-600 font-medium">
          Venció hace {d != null ? Math.abs(d) : "?"} día{Math.abs(d ?? 0) !== 1 ? "s" : ""}
          {task.eleam?.nombre && <span className="text-slate-400 font-normal"> · {task.eleam.nombre}</span>}
        </p>
      </div>
    </div>
  );
}

// Renewal row for the bottom grid
function RenewalRow({ eleam }) {
  const d = daysUntil(eleam.fecha_vencimiento_suscripcion);
  const urgent = d != null && d <= 7;
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-slate-50 last:border-0">
      <div className={`shrink-0 mt-0.5 w-5 h-5 rounded-xl flex items-center justify-center ${urgent ? "bg-rose-100" : "bg-amber-100"}`}>
        <IconClock />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 truncate">{eleam.nombre}</p>
        <p className={`text-xs font-medium ${urgent ? "text-rose-600" : "text-amber-700"}`}>
          Vence {d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`}
          <span className="text-slate-400 font-normal"> · {formatDate(eleam.fecha_vencimiento_suscripcion)}</span>
        </p>
      </div>
    </div>
  );
}

function ActionCard({ title, count, color, items, renderRow, emptyText, onAction, actionLabel }) {
  const colorHeader = {
    rose:  "text-rose-700",
    amber: "text-amber-700",
    sky:   "text-sky-700",
  };
  const colorBadge = {
    rose:  "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-800",
    sky:   "bg-sky-100 text-sky-700",
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {count > 0 && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${colorBadge[color]}`}>{count}</span>
          )}
        </div>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className={`text-xs font-semibold hover:underline ${colorHeader[color] ?? "text-teal-700"}`}
          >
            {actionLabel ?? "Ver todos"}
          </button>
        )}
      </div>
      <div className="px-4 py-1">
        {items.length === 0 ? (
          <p className="py-5 text-center text-xs text-slate-400">{emptyText}</p>
        ) : (
          <div>{items.slice(0, 5).map(renderRow)}</div>
        )}
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [eleams, setEleams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [m, e, t] = await Promise.all([
        getMetrics(),
        getAllEleams(),
        getCrmTasks({ soloPendientes: true, limit: 80 }),
      ]);
      setMetrics(m);
      setEleams(e);
      setTasks(t);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar el resumen. Intenta de nuevo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const renewals = useMemo(() => eleams.filter((e) => {
    if (!e.pago_activo) return false;
    const days = daysUntil(e.fecha_vencimiento_suscripcion);
    return days != null && days >= 0 && days <= 14;
  }).sort((a, b) => daysUntil(a.fecha_vencimiento_suscripcion) - daysUntil(b.fecha_vencimiento_suscripcion)), [eleams]);

  const overdueTasks = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return tasks.filter((task) =>
      task.fecha_vencimiento &&
      task.estado !== "completada" &&
      task.estado !== "cancelada" &&
      task.fecha_vencimiento < todayStr
    ).sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
  }, [tasks]);

  const alertItems = useMemo(() => {
    const items = [];
    if (overdueTasks.length > 0)
      items.push({ key: "tasks", icon: <IconWarning />, count: overdueTasks.length, label: "Tareas vencidas", color: "amber", onClick: () => navigate("/superadmin/tareas") });
    if (renewals.length > 0)
      items.push({ key: "renewals", icon: <IconClock />, count: renewals.length, label: "Renuevan en 14 días", sub: renewals[0] ? `próximo: ${renewals[0].nombre}` : null, color: "sky", onClick: () => navigate("/superadmin/clientes") });
    return items;
  }, [overdueTasks, renewals, navigate]);

  if (loading) return <Loading message="Cargando resumen superadmin..." />;

  const updatedLabel = lastUpdated
    ? `Actualizado ${lastUpdated.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">

      {/* Page header — compact */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Superadmin</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">Resumen general</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Revisa rápidamente qué ELEAM están usando la app y cuáles necesitan apoyo.</p>
          {updatedLabel && <p className="mt-0.5 text-xs text-slate-400">{updatedLabel}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {updatedLabel && (
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="tap-highlight-none inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
            >
              <IconRefresh spinning={refreshing} />
              Refrescar
            </button>
          )}
          <button type="button" onClick={() => navigate("/superadmin/clientes")} className="tap-highlight-none min-h-11 sm:min-h-9 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100">
            Uso por ELEAM
          </button>
          <button type="button" onClick={() => navigate("/superadmin/tareas")} className="tap-highlight-none min-h-11 sm:min-h-9 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100">
            Tareas
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      {/* Urgency alert strip */}
      {alertItems.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Requiere atención</p>
          <div className="flex flex-wrap gap-2">
            {alertItems.map((item) => (
              <AlertItem key={item.key} {...item} />
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      <SuperAdminMetrics
        metrics={metrics}
        onFilterRisk={() => navigate("/superadmin/clientes")}
        onFilterLeads={() => navigate("/superadmin/leads")}
        onOpenClient={(client) => navigate(`/superadmin/clientes?search=${encodeURIComponent(client.nombre ?? "")}`)}
      />

      {/* Pipeline */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Pipeline comercial</h2>
            <p className="text-xs text-slate-500">Selecciona una etapa para ir directo a esa vista en Cartera.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/superadmin/clientes")}
            className="shrink-0 text-xs font-semibold text-teal-700 hover:underline"
          >
            Ver cartera →
          </button>
        </div>
        <CrmPipeline eleams={eleams} activeState={null} onPickState={(key) => navigate(`/superadmin/clientes?estado=${key ?? ""}`)} />
      </section>

      {/* Bottom action grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActionCard
          title="Tareas vencidas"
          count={overdueTasks.length}
          color="rose"
          items={overdueTasks}
          renderRow={(t) => <OverdueTaskRow key={t.id} task={t} />}
          emptyText="Sin tareas vencidas"
          onAction={() => navigate("/superadmin/tareas")}
          actionLabel="Ver todas"
        />
        <ActionCard
          title="Renovaciones próximas"
          count={renewals.length}
          color="amber"
          items={renewals}
          renderRow={(e) => <RenewalRow key={e.id} eleam={e} />}
          emptyText="Sin renovaciones en 14 días"
          onAction={() => navigate("/superadmin/clientes")}
          actionLabel="Ver cartera"
        />
      </div>
    </div>
  );
}
