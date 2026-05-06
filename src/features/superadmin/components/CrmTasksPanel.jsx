import React, { useState, useMemo } from "react";
import { useToast } from "../../../components/Toast";
import { formatDate, daysUntil } from "../utils/superadminFormatters";

const TIPOS = ["general", "llamada", "correo", "reunion", "demo", "seguimiento", "onboarding", "renovacion", "otro"];
const PRIORIDADES = [
  { key: "baja",    label: "Baja",     cls: "bg-slate-100 text-slate-600" },
  { key: "media",   label: "Media",    cls: "bg-sky-100 text-sky-700" },
  { key: "alta",    label: "Alta",     cls: "bg-amber-100 text-amber-800" },
  { key: "urgente", label: "Urgente",  cls: "bg-rose-100 text-rose-700" },
];

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
    if (!form.titulo.trim()) {
      toast("El título es obligatorio.", "error");
      return;
    }
    setBusy(true);
    try {
      await onCreate({
        ...form,
        eleam_id: form.eleam_id || null,
        fecha_vencimiento: form.fecha_vencimiento || null,
      });
      toast("Tarea creada.", "success");
      onCancel();
    } catch (err) {
      toast(err.message || "Error", "error");
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
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
      />
      <textarea
        rows={2}
        placeholder="Descripción (opcional)"
        value={form.descripcion}
        onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {!defaultEleamId && (
          <select
            value={form.eleam_id}
            onChange={(e) => setForm((p) => ({ ...p, eleam_id: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Sin ELEAM (tarea general)</option>
            {eleams.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        )}
        <select
          value={form.tipo}
          onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={form.prioridad}
          onChange={(e) => setForm((p) => ({ ...p, prioridad: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {PRIORIDADES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <input
          type="date"
          value={form.fecha_vencimiento}
          onChange={(e) => setForm((p) => ({ ...p, fecha_vencimiento: e.target.value }))}
          className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${defaultEleamId ? "" : "sm:col-span-3"}`}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:underline">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="bg-slate-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "Creando…" : "Crear tarea"}
        </button>
      </div>
    </form>
  );
}

function TaskRow({ task, onComplete }) {
  const dias = daysUntil(task.fecha_vencimiento);
  const isPendiente = task.estado === "pendiente" || task.estado === "en_curso";
  const overdue = isPendiente && dias != null && dias < 0;
  const prio = PRIORIDADES.find((p) => p.key === task.prioridad) ?? PRIORIDADES[1];

  return (
    <div className={`border rounded-xl p-3 flex items-start justify-between gap-3 ${
      overdue ? "border-rose-200 bg-rose-50" :
      isPendiente ? "border-gray-200 bg-white" :
                    "border-emerald-200 bg-emerald-50/40"
    }`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${prio.cls}`}>
            {prio.label}
          </span>
          <span className="text-[10px] uppercase font-semibold text-gray-400">{task.tipo}</span>
          {task.eleam?.nombre && (
            <span className="text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {task.eleam.nombre}
            </span>
          )}
          {overdue && (
            <span className="text-[10px] uppercase font-bold text-rose-700">
              Vencida hace {Math.abs(dias)}d
            </span>
          )}
        </div>
        <p className={`text-sm font-semibold ${task.estado === "completada" ? "text-emerald-700 line-through" : "text-gray-800"}`}>
          {task.titulo}
        </p>
        {task.descripcion && (
          <p className="text-xs text-gray-500 mt-0.5">{task.descripcion}</p>
        )}
        <p className="text-[11px] text-gray-400 mt-1">
          {task.fecha_vencimiento ? <>Vence {formatDate(task.fecha_vencimiento)}</> : "Sin vencimiento"}
          {task.autor?.nombre ? <> · creada por {task.autor.nombre}</> : null}
          {task.estado === "completada" && task.cierre?.nombre
            ? <> · completada por {task.cierre.nombre}</>
            : null}
        </p>
      </div>
      {isPendiente && (
        <button
          onClick={() => onComplete(task.id)}
          className="shrink-0 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700"
        >
          Completar
        </button>
      )}
    </div>
  );
}

export default function CrmTasksPanel({
  tasks = [], eleams = [], onCreate, onComplete,
  defaultEleamId = null, title = "Tareas CRM",
  showCreate = true, compact = false,
}) {
  const [filtro, setFiltro] = useState("pendientes"); // pendientes | vencidas | completadas | todas
  const [creating, setCreating] = useState(false);

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

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${compact ? "" : "p-4"}`}>
      <div className={`flex items-center justify-between flex-wrap gap-2 ${compact ? "p-3 border-b border-gray-100" : "mb-3"}`}>
        <h2 className="font-semibold text-gray-700">{title}</h2>
        {showCreate && (
          <button
            onClick={() => setCreating((s) => !s)}
            className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800"
          >
            {creating ? "Cerrar" : "+ Nueva tarea"}
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

        <div className="flex gap-1 mb-3 overflow-x-auto">
          {[
            { key: "pendientes",   label: "Pendientes" },
            { key: "vencidas",     label: "Vencidas" },
            { key: "completadas",  label: "Completadas" },
            { key: "todas",        label: "Todas" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`text-[11px] px-3 py-1 rounded-full border whitespace-nowrap ${
                filtro === f.key
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No hay tareas con ese filtro.
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {list.map((t) => (
              <TaskRow key={t.id} task={t} onComplete={onComplete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
