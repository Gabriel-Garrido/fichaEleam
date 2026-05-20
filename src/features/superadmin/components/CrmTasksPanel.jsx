import React, { useState, useMemo } from "react";
import { useToast } from "../../../components/Toast";
import { formatDate, daysUntil } from "../utils/superadminFormatters";
import { friendlyError } from "../../../utils/errorMessages";

const TIPOS = ["general", "llamada", "correo", "reunion", "demo", "seguimiento", "onboarding", "renovacion", "otro"];

const PRIORIDADES = [
  { key: "baja",    label: "Baja",    cls: "bg-slate-100 text-slate-500",   border: "border-l-slate-300" },
  { key: "media",   label: "Media",   cls: "bg-sky-100 text-sky-700",       border: "border-l-sky-400" },
  { key: "alta",    label: "Alta",    cls: "bg-amber-100 text-amber-800",   border: "border-l-amber-500" },
  { key: "urgente", label: "Urgente", cls: "bg-rose-100 text-rose-700",     border: "border-l-rose-500" },
];

// Inline SVG icons for task type
function TypeIcon({ tipo }) {
  const props = { className: "h-3.5 w-3.5 shrink-0", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2, stroke: "currentColor" };
  switch (tipo) {
    case "llamada":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>;
    case "correo":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
    case "reunion":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
    case "demo":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" /></svg>;
    case "seguimiento":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>;
    case "onboarding":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>;
    case "renovacion":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    default:
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>;
  }
}

function NewTaskForm({ defaultEleamId = null, eleams = [], onCreate, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    tipo: "general",
    prioridad: "media",
    fecha_vencimiento: "",
    eleam_id: defaultEleamId ?? "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) { toast("El título es obligatorio.", "error"); return; }
    setBusy(true);
    try {
      await onCreate({ ...form, eleam_id: form.eleam_id || null, fecha_vencimiento: form.fecha_vencimiento || null });
      toast("Tarea creada.", "success");
      onCancel();
    } catch (err) {
      toast(friendlyError(err, "No se pudo crear la tarea. Intenta de nuevo."), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mb-3">
      <input
        type="text"
        required
        placeholder="Título de la tarea *"
        value={form.titulo}
        onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
      />
      <textarea
        rows={2}
        placeholder="Descripción (opcional)"
        value={form.descripcion}
        onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {!defaultEleamId && (
          <select
            value={form.eleam_id}
            onChange={(e) => setForm((p) => ({ ...p, eleam_id: e.target.value }))}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400"
          >
            <option value="">Sin ELEAM (tarea general)</option>
            {eleams.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        )}
        <select
          value={form.tipo}
          onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 capitalize"
        >
          {TIPOS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        <select
          value={form.prioridad}
          onChange={(e) => setForm((p) => ({ ...p, prioridad: e.target.value }))}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400"
        >
          {PRIORIDADES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <input
          type="date"
          value={form.fecha_vencimiento}
          onChange={(e) => setForm((p) => ({ ...p, fecha_vencimiento: e.target.value }))}
          className={`border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 ${defaultEleamId ? "" : "sm:col-span-3"}`}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-sm text-slate-500 hover:underline px-3 py-2">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="bg-teal-700 text-white text-sm px-4 py-2 rounded-xl hover:bg-teal-800 disabled:opacity-50"
        >
          {busy ? "Creando…" : "Crear tarea"}
        </button>
      </div>
    </form>
  );
}

function relativeDate(iso) {
  const d = daysUntil(iso);
  if (d == null) return null;
  if (d < 0)  return { label: `Venció hace ${Math.abs(d)}d`, cls: "text-rose-600 font-semibold" };
  if (d === 0) return { label: "Vence hoy", cls: "text-rose-600 font-semibold" };
  if (d === 1) return { label: "Vence mañana", cls: "text-amber-700 font-semibold" };
  if (d <= 3)  return { label: `Vence en ${d}d`, cls: "text-amber-600" };
  return { label: `${formatDate(iso)}`, cls: "text-slate-400" };
}

function TaskRow({ task, onComplete }) {
  const [completing, setCompleting] = useState(false);
  const dias = daysUntil(task.fecha_vencimiento);
  const isPendiente = task.estado === "pendiente" || task.estado === "en_curso";
  const overdue = isPendiente && dias != null && dias < 0;
  const today = isPendiente && dias === 0;
  const prio = PRIORIDADES.find((p) => p.key === task.prioridad) ?? PRIORIDADES[1];
  const rel = task.fecha_vencimiento ? relativeDate(task.fecha_vencimiento) : null;

  const handleComplete = async () => {
    setCompleting(true);
    try { await onComplete(task.id); }
    finally { setCompleting(false); }
  };

  return (
    <div className={`relative flex items-start gap-3 rounded-xl border-l-4 border border-slate-100 px-3.5 py-3 transition-colors ${
      overdue ? `${prio.border} bg-rose-50/60 border-rose-100` :
      today   ? `${prio.border} bg-amber-50/60 border-amber-100` :
      isPendiente ? `${prio.border} bg-white` :
                  "border-l-emerald-200 bg-emerald-50/40 border-emerald-100"
    }`}>
      {/* Type icon */}
      <div className={`shrink-0 mt-0.5 w-6 h-6 rounded-xl flex items-center justify-center ${
        overdue ? "bg-rose-100 text-rose-600" :
        today   ? "bg-amber-100 text-amber-700" :
        isPendiente ? "bg-slate-100 text-slate-500" :
                  "bg-emerald-100 text-emerald-600"
      }`}>
        <TypeIcon tipo={task.tipo} />
      </div>

      <div className="min-w-0 flex-1">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-xl ${prio.cls}`}>
            {prio.label}
          </span>
          <span className="text-[10px] font-medium text-slate-400 capitalize">{task.tipo}</span>
          {task.eleam?.nombre && (
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-xl truncate max-w-[120px]" title={task.eleam.nombre}>
              {task.eleam.nombre}
            </span>
          )}
          {overdue && (
            <span className="text-[10px] font-bold text-rose-600 uppercase">
              Vencida hace {Math.abs(dias)}d
            </span>
          )}
          {today && (
            <span className="text-[10px] font-bold text-amber-700 uppercase">Vence hoy</span>
          )}
        </div>

        {/* Title */}
        <p className={`text-sm font-semibold leading-snug ${
          task.estado === "completada" ? "text-emerald-700 line-through" : "text-slate-800"
        }`}>
          {task.titulo}
        </p>
        {task.descripcion && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{task.descripcion}</p>
        )}

        {/* Footer */}
        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
          {rel && <span className={rel.cls}>{rel.label}</span>}
          {rel && task.autor?.nombre && <span>·</span>}
          {task.autor?.nombre && <span>por {task.autor.nombre}</span>}
          {task.estado === "completada" && task.cierre?.nombre && (
            <><span>·</span><span className="text-emerald-600">completada por {task.cierre.nombre}</span></>
          )}
        </p>
      </div>

      {isPendiente && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={completing}
          className="shrink-0 inline-flex items-center gap-1 text-xs bg-emerald-600 text-white px-2.5 py-1.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {completing ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
          <span className="hidden sm:inline">{completing ? "…" : "Hecho"}</span>
        </button>
      )}
    </div>
  );
}

// Tab counts for the filter bar
function useTabCounts(tasks, defaultEleamId) {
  return useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let pendientes = 0, vencidas = 0, completadas = 0;
    for (const t of tasks) {
      if (defaultEleamId && t.eleam_id !== defaultEleamId) continue;
      const isPendiente = t.estado === "pendiente" || t.estado === "en_curso";
      if (t.estado === "completada") completadas++;
      else if (isPendiente) {
        pendientes++;
        if (t.fecha_vencimiento && new Date(t.fecha_vencimiento) < today) vencidas++;
      }
    }
    return { pendientes, vencidas, completadas, todas: tasks.length };
  }, [tasks, defaultEleamId]);
}

export default function CrmTasksPanel({
  tasks = [], eleams = [], onCreate, onComplete,
  defaultEleamId = null, title = "Tareas CRM",
  showCreate = true, compact = false,
}) {
  const [filtro, setFiltro] = useState("pendientes");
  const [creating, setCreating] = useState(false);
  const counts = useTabCounts(tasks, defaultEleamId);

  const list = useMemo(() => {
    return tasks.filter((t) => {
      if (defaultEleamId && t.eleam_id !== defaultEleamId) return false;
      if (filtro === "todas") return true;
      if (filtro === "completadas") return t.estado === "completada";
      const isPendiente = t.estado === "pendiente" || t.estado === "en_curso";
      if (filtro === "pendientes") return isPendiente;
      if (filtro === "vencidas") {
        const d = daysUntil(t.fecha_vencimiento);
        return isPendiente && d != null && d < 0;
      }
      return true;
    });
  }, [tasks, filtro, defaultEleamId]);

  const tabs = [
    { key: "pendientes",  label: "Pendientes",  count: counts.pendientes },
    { key: "vencidas",    label: "Vencidas",    count: counts.vencidas,   alertCls: counts.vencidas > 0 ? "bg-rose-500 text-white" : null },
    { key: "completadas", label: "Completadas", count: counts.completadas },
    { key: "todas",       label: "Todas",       count: counts.todas },
  ];

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 ${compact ? "" : "p-4"}`}>
      {/* Header */}
      <div className={`flex items-center justify-between flex-wrap gap-2 ${compact ? "p-3 border-b border-slate-100" : "mb-3"}`}>
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {showCreate && (
          <button
            type="button"
            onClick={() => setCreating((s) => !s)}
            className={`text-xs px-3 py-1.5 rounded-xl transition-colors ${
              creating
                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                : "bg-teal-700 text-white hover:bg-teal-800"
            }`}
          >
            {creating ? "Cancelar" : "+ Nueva tarea"}
          </button>
        )}
      </div>

      <div className={compact ? "p-3" : ""}>
        {creating && (
          <NewTaskForm
            defaultEleamId={defaultEleamId}
            eleams={eleams}
            onCreate={onCreate}
            onCancel={() => setCreating(false)}
          />
        )}

        {/* Filter tabs with counts */}
        <div className="flex gap-1 mb-3 overflow-x-auto pb-0.5">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setFiltro(tab.key)}
              className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
                filtro === tab.key
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filtro === tab.key
                    ? "bg-white/20 text-white"
                    : (tab.alertCls ?? "bg-slate-100 text-slate-600")
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            {filtro === "pendientes" ? "Sin tareas pendientes. ¡Todo al día!" :
             filtro === "vencidas"   ? "Sin tareas vencidas." :
             filtro === "completadas" ? "Sin tareas completadas aún." :
             "No hay tareas."}
          </div>
        ) : (
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
            {list.map((t) => (
              <TaskRow key={t.id} task={t} onComplete={onComplete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
