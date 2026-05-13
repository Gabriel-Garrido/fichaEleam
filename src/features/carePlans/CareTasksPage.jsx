import { useEffect, useMemo, useState } from "react";
import PageLayout from "../../layout/PageLayout";
import Modal from "../../components/Modal";
import HelpTooltip from "../../components/HelpTooltip";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import {
  CARE_CATEGORY_LABEL,
  CARE_STATUS_LABEL,
  CARE_TURNOS,
  OMISSION_REASONS,
  completeCareTask,
  currentTurno,
  listCareTasks,
  todayIso,
} from "./carePlansService";

const STATUS_TONE = {
  pendiente: "bg-amber-50 text-amber-800 border-amber-200",
  cumplida: "bg-emerald-50 text-emerald-700 border-emerald-200",
  omitida: "bg-rose-50 text-rose-700 border-rose-200",
  reprogramada: "bg-sky-50 text-sky-700 border-sky-200",
  cancelada: "bg-slate-50 text-slate-600 border-slate-200",
};

const PRIORITY_TONE = {
  baja: "bg-slate-100 text-slate-600",
  media: "bg-sky-50 text-sky-700",
  alta: "bg-amber-50 text-amber-800",
  urgente: "bg-rose-50 text-rose-700",
};

function residentName(row) {
  const r = row.residentes;
  return [r?.apellido, r?.nombre].filter(Boolean).join(", ") || "Residente";
}

function isOverdue(task) {
  if (task._arrastre) return true;
  if (task.estado !== "pendiente" || task.fecha !== todayIso() || !task.hora) return false;
  const due = new Date(`${task.fecha}T${task.hora}`);
  return !Number.isNaN(due.valueOf()) && due < new Date();
}

export default function CareTasksPage() {
  const toast = useToast();
  const { can } = useAuth();
  const [fecha, setFecha] = useState(todayIso());
  const [turno, setTurno] = useState(currentTurno());
  const [estado, setEstado] = useState("pendiente");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const canComplete = can("completar_tareas_cuidado");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listCareTasks({
        fecha,
        turno,
        estado: estado === "todas" ? null : estado,
      });
      setTasks(data);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar las tareas de cuidado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, turno, estado]);

  const metrics = useMemo(() => {
    return tasks.reduce((acc, task) => {
      acc.total += 1;
      acc[task.estado] = (acc[task.estado] ?? 0) + 1;
      if (isOverdue(task)) acc.vencidas += 1;
      return acc;
    }, { total: 0, pendiente: 0, cumplida: 0, omitida: 0, vencidas: 0 });
  }, [tasks]);

  const handleClose = async ({ action, notas, motivo, seguimiento }) => {
    if (!modal) return;
    setSaving(true);
    try {
      await completeCareTask({
        id: modal.task.id,
        estado: action,
        notas,
        motivoOmision: motivo,
        requiereSeguimiento: seguimiento,
      });
      toast(action === "cumplida" ? "Tarea marcada como cumplida." : "Omisión registrada.", "success");
      setModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast("No se pudo cerrar la tarea.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Tareas diarias"
      eyebrow="Plan de cuidado"
      description="Cumplimiento de actividades no farmacológicas por residente y turno."
      actions={
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          Actualizar
        </button>
      }
      className="space-y-5"
    >
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_160px_160px_160px]">
        <div className="rounded-xl bg-teal-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700">
            Foco del turno
            <HelpTooltip label="Ayuda: tareas diarias">
              Se generan desde el plan de cuidado activo de cada residente. Reintentar la generación no duplica tareas.
            </HelpTooltip>
          </div>
          <div className="mt-1 text-sm font-semibold text-teal-950">
            {metrics.vencidas
              ? `${metrics.vencidas} tarea${metrics.vencidas === 1 ? "" : "s"} vencida${metrics.vencidas === 1 ? "" : "s"}`
              : `${metrics.pendiente} pendiente${metrics.pendiente === 1 ? "" : "s"}`}
          </div>
        </div>
        <label className="text-sm font-medium text-slate-700">
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Turno
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            {CARE_TURNOS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Estado
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            <option value="pendiente">Pendientes</option>
            <option value="cumplida">Cumplidas</option>
            <option value="omitida">Omitidas</option>
            <option value="todas">Todas</option>
          </select>
        </label>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total" value={metrics.total} />
        <Metric label="Pendientes" value={metrics.pendiente} tone="amber" />
        <Metric label="Cumplidas" value={metrics.cumplida} tone="emerald" />
        <Metric label="Omitidas" value={metrics.omitida} tone="rose" />
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-teal-50 text-teal-700">
              ✓
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-950">Sin tareas para este filtro</h2>
            <p className="mt-1 text-sm text-slate-500">
              Si el residente no tiene actividades, configúralas desde su ficha en la pestaña Plan de cuidado.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <li key={task.id} className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[task.estado]}`}>
                        {CARE_STATUS_LABEL[task.estado] ?? task.estado}
                      </span>
                      {isOverdue(task) && (
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                          {task._arrastre ? "Arrastre" : "Vencida"}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_TONE[task.actividad?.prioridad] ?? PRIORITY_TONE.media}`}>
                        {task.actividad?.prioridad ?? "media"}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{task.hora?.slice(0, 5)}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-950">
                      {task.actividad?.titulo ?? "Actividad de cuidado"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {residentName(task)} · {CARE_CATEGORY_LABEL[task.actividad?.categoria] ?? task.actividad?.categoria}
                    </p>
                    {task.actividad?.instrucciones && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.actividad.instrucciones}</p>
                    )}
                    {task.notas && <p className="mt-1 text-xs text-slate-400">Notas: {task.notas}</p>}
                  </div>
                  {task.estado === "pendiente" && canComplete && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setModal({ action: "cumplida", task })}
                        className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                      >
                        Cumplir
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal({ action: "omitida", task })}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Omitir
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CareTaskModal
        modal={modal}
        saving={saving}
        onClose={() => !saving && setModal(null)}
        onSubmit={handleClose}
      />
    </PageLayout>
  );
}

function Metric({ label, value, tone = "slate" }) {
  const cls = {
    slate: "bg-white text-slate-900 border-slate-200",
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-200",
    rose: "bg-rose-50 text-rose-900 border-rose-200",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs font-medium opacity-70">{label}</div>
    </div>
  );
}

function CareTaskModal({ modal, saving, onClose, onSubmit }) {
  const [notas, setNotas] = useState("");
  const [motivo, setMotivo] = useState("rechazo");
  const [seguimiento, setSeguimiento] = useState(false);

  useEffect(() => {
    setNotas("");
    setMotivo("rechazo");
    setSeguimiento(false);
  }, [modal]);

  if (!modal) return null;

  const isOmission = modal.action === "omitida";

  return (
    <Modal isOpen={!!modal} onClose={onClose} title={isOmission ? "Registrar omisión" : "Cerrar tarea"}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ action: modal.action, notas, motivo: isOmission ? motivo : null, seguimiento });
        }}
      >
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-950">
            {modal.task.actividad?.titulo}
          </div>
          <div className="text-xs text-slate-500">{residentName(modal.task)}</div>
        </div>

        {isOmission && (
          <label className="block text-sm font-medium text-slate-700">
            Motivo
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {OMISSION_REASONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Notas
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={4}
            placeholder="Detalle breve para continuidad de cuidado..."
            className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={seguimiento}
            onChange={(e) => setSeguimiento(e.target.checked)}
            className="h-4 w-4 accent-teal-700"
          />
          Crear observación con seguimiento
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
