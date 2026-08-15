import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PageLayout from "../../layout/PageLayout";
import { friendlyError } from "../../utils/errorMessages";
import {
  TURNOS,
  buildTurnoSummary,
  currentTurno,
  saveTurnoEntrega,
  todayIso,
  turnoLabel,
} from "./turnosService";
import PersonnelNav from "../personnel/PersonnelNav";
import {
  PENDING_ACTIONS,
  PENDING_REASON_OPTIONS,
  buildPendingDecisions,
  nextTurnSlot,
  pendingDecisionIsComplete,
} from "./turnPendingUtils";

export default function TurnoBuilder() {
  const [fecha, setFecha] = useState(todayIso());
  const [turno, setTurno] = useState(currentTurno());
  const [summary, setSummary] = useState(null);
  const [pendientes, setPendientes] = useState("");
  const [taskDecisions, setTaskDecisions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { can } = useAuth();
  const canManagePending = can("completar_tareas_cuidado");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setTaskDecisions({});
    buildTurnoSummary({ fecha, turno })
      .then((data) => {
        if (alive) setSummary(data);
      })
      .catch((err) => {
        console.error(err);
        if (alive) setError("No pudimos preparar el resumen automático. Intenta nuevamente.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [fecha, turno]);

  const pendingTasks = summary?.tareas_cuidado?.pendientes ?? [];
  const pendingMedications = [
    ...(summary?.emar?.por_validar ?? []),
    ...(summary?.emar?.pendientes ?? []),
  ];
  const careLoadFailed = summary?.tareas_cuidado?.error === true;
  const unresolvedCount = pendingTasks.filter((task) => !pendingDecisionIsComplete(taskDecisions[task.id])).length;
  const nextSlot = nextTurnSlot(fecha, turno);
  const saveBlocked = careLoadFailed || (pendingTasks.length > 0 && (!canManagePending || unresolvedCount > 0));

  const updateTaskDecision = (taskId, field, value) => {
    setTaskDecisions((current) => ({
      ...current,
      [taskId]: { ...current[taskId], [field]: value },
    }));
  };

  const nextText = useMemo(() => {
    if (!summary) return "";
    const emarValidation = summary.emar?.resumen?.pendiente_validacion ?? 0;
    const emarOverdue = summary.emar?.resumen?.vencidas ?? 0;
    const careOverdue = summary.tareas_cuidado?.resumen?.vencidas ?? 0;
    const carePending = summary.tareas_cuidado?.resumen?.pendientes_operativos
      ?? ((summary.tareas_cuidado?.resumen?.pendiente ?? 0) + (summary.tareas_cuidado?.resumen?.reprogramada ?? 0));
    const urgent = summary.signos_atencion?.filter((item) => item.status === "critical").length ?? 0;
    const sinSignos = summary.sin_signos_hoy?.length ?? 0;
    const seguimientos = summary.seguimientos?.length ?? 0;
    if (emarOverdue) return `Administrar ${emarOverdue} medicamento${emarOverdue > 1 ? "s" : ""} vencido${emarOverdue > 1 ? "s" : ""}.`;
    if (emarValidation) return `Validar ${emarValidation} registro${emarValidation > 1 ? "s" : ""} de medicamentos antes de cerrar turno.`;
    if (careOverdue) return `Cerrar ${careOverdue} tarea${careOverdue > 1 ? "s" : ""} de cuidado vencida${careOverdue > 1 ? "s" : ""}.`;
    if (carePending) return `Decidir qué ocurrirá con ${carePending} cuidado${carePending > 1 ? "s" : ""} pendiente${carePending > 1 ? "s" : ""}.`;
    if (urgent) return `Priorizar ${urgent} residente${urgent > 1 ? "s" : ""} con signos críticos.`;
    if (sinSignos) return `Completar controles de ${sinSignos} residente${sinSignos > 1 ? "s" : ""}.`;
    if (seguimientos) return `Revisar ${seguimientos} seguimiento${seguimientos > 1 ? "s" : ""} pendiente${seguimientos > 1 ? "s" : ""}.`;
    return "Turno sin alertas urgentes. Mantén el registro actualizado.";
  }, [summary]);

  const handleSave = async () => {
    if (saveBlocked) {
      setError(careLoadFailed
        ? "No se pudieron verificar los cuidados pendientes. Recarga la página antes de guardar la entrega."
        : !canManagePending
        ? "No tienes permiso para resolver los cuidados pendientes. Solicita a un administrador que complete la entrega."
        : `Debes decidir qué ocurrirá con ${unresolvedCount} tarea${unresolvedCount === 1 ? "" : "s"} pendiente${unresolvedCount === 1 ? "" : "s"}.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const decisiones = buildPendingDecisions(pendingTasks, taskDecisions);
      const saved = await saveTurnoEntrega({ fecha, turno, resumen: summary, pendientes, decisiones });
      navigate(`/operacion/turnos/${saved.id}`);
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, "No pudimos guardar la entrega. Revisa permisos o conexión."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      coachFeatureId="turnos-nuevo"
      title="Registrar entrega de turno"
      eyebrow="Entrega de turno"
      description="Revisa los pendientes automáticos y deja sólo la información que necesita el equipo siguiente."
      actions={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading || !summary || saveBlocked}
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando..." : unresolvedCount > 0 ? `Resolver ${unresolvedCount} pendiente${unresolvedCount === 1 ? "" : "s"}` : "Guardar entrega"}
        </button>
      }
    >
      <PersonnelNav />
      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_160px_160px]">
        <div className="rounded-2xl bg-teal-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Siguiente foco</div>
          <div className="mt-1 text-sm font-semibold text-teal-950">{loading ? "Preparando resumen..." : nextText}</div>
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
            {TURNOS.map((t) => <option key={t} value={t}>{turnoLabel(t)}</option>)}
          </select>
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}
      {careLoadFailed && !error && (
        <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          No se pudieron verificar los cuidados pendientes. Recarga la página antes de guardar la entrega.
        </div>
      )}

      {loading ? (
        <LoadingSummary />
      ) : summary && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-4">
            <PendingCareSection
              tasks={pendingTasks}
              decisions={taskDecisions}
              canManage={canManagePending}
              nextSlot={nextSlot}
              unresolvedCount={unresolvedCount}
              onChange={updateTaskDecision}
            />

            <SummarySection title="Medicamentos por resolver">
              {pendingMedications.length ? [
                <div key="medication-guidance" className="rounded-xl bg-sky-50 p-3 text-sm leading-5 text-sky-800">
                  Resuélvelos desde Medicamentos para conservar dosis, lote y firmas. No se traspasan como cuidados generales.
                  <button type="button" onClick={() => navigate(`/operacion/cuidados?fecha=${fecha}&turno=${turno}&type=med`)} className="ml-1 font-semibold underline decoration-sky-300 underline-offset-2 hover:text-sky-950">Abrir medicamentos</button>
                </div>,
                ...(summary.emar?.por_validar ?? []).map((item) => <MedicationRow key={`validar-${item.id}`} item={item} tone="sky" status="Por validar" />),
                ...(summary.emar?.pendientes ?? []).map((item) => <MedicationRow key={`pendiente-${item.id}`} item={item} status="Pendiente" />),
              ] : []}
            </SummarySection>

            <SummarySection title="Prioridades clínicas">
              {[
                ...(summary.signos_atencion ?? []).map((item) => <AlertRow key={`alerta-${item.id}`} item={item} />),
                ...(summary.seguimientos ?? []).map((item) => <TextRow key={`seguimiento-${item.id}`} item={item} />),
              ]}
            </SummarySection>

            <SummarySection title="Controles pendientes">
              {summary.sin_signos_hoy?.map((residente) => (
                <ResidentRow key={residente.id} residente={residente} />
              ))}
            </SummarySection>

            <SummarySection title="Incidentes recientes">
              {summary.incidentes_recientes?.map((item) => (
                <TextRow key={item.id} item={item} />
              ))}
            </SummarySection>

          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Información para el siguiente turno</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Escribe indicaciones concretas que no aparezcan en los pendientes automáticos. Evita repetir los listados de esta pantalla.</p>
              <textarea
                value={pendientes}
                onChange={(e) => setPendientes(e.target.value)}
                rows={10}
                maxLength={3000}
                placeholder="Ej.: controlar presión de Ana a las 20:00 y confirmar nueva indicación con enfermería."
                className="mt-3 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              <p className="mt-1 text-right text-xs text-slate-400">{pendientes.length}/3000</p>
            </div>
          </aside>
        </div>
      )}
    </PageLayout>
  );
}

function LoadingSummary() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

function SummarySection({ title, children }) {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  if (!hasContent) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-2">
        {children}
      </div>
    </div>
  );
}

function PendingCareSection({ tasks, decisions, canManage, nextSlot, unresolvedCount, onChange }) {
  if (!tasks.length) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <h2 className="text-base font-semibold text-emerald-950">Cuidados del turno resueltos</h2>
        <p className="mt-1 text-sm text-emerald-800">No quedan tareas de cuidado abiertas para traspasar o justificar.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
      <div className="border-b border-amber-100 bg-amber-50 p-4 sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-base font-semibold text-amber-950">Resolver cuidados pendientes</h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-amber-900/80">
            Decide si cada tarea pasa al próximo turno o queda registrada como no realizada. La decisión, el motivo y el responsable quedarán en la trazabilidad.
          </p>
        </div>
        <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold sm:mt-0 ${unresolvedCount ? "bg-white text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
          {unresolvedCount ? `${unresolvedCount} por decidir` : "Todas resueltas"}
        </span>
      </div>
      {!canManage && (
        <div role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Necesitas el permiso “Completar tareas de cuidado” para cerrar estos pendientes.
        </div>
      )}
      <div className="divide-y divide-slate-100">
        {tasks.map((task) => (
          <PendingCareRow
            key={task.id}
            item={task}
            decision={decisions[task.id]}
            disabled={!canManage}
            nextSlot={nextSlot}
            onChange={(field, value) => onChange(task.id, field, value)}
          />
        ))}
      </div>
    </section>
  );
}

function PendingCareRow({ item, decision = {}, disabled, nextSlot, onChange }) {
  const selected = decision.accion ?? "";
  return (
    <div className={`p-4 transition-colors sm:p-5 ${selected ? "bg-white" : "bg-amber-50/30"}`}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">{item.titulo}</h3>
            {item.vencida && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Pendiente anterior</span>}
          </div>
          <p className="mt-1 text-sm text-slate-600">{item.residente?.nombre ?? "Residente"}</p>
          <p className="mt-1 text-xs text-slate-500">{item.hora?.slice(0, 5) ?? "Sin hora"} · Prioridad {item.prioridad}</p>
          {item.instrucciones && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.instrucciones}</p>}
        </div>

        <div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PENDING_ACTIONS.map(([value, label]) => {
              const active = selected === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  onClick={() => onChange("accion", value)}
                  className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active ? (value === "traspasar" ? "border-sky-600 bg-sky-600 text-white" : "border-slate-800 bg-slate-800 text-white") : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {selected && (
            <label className="mt-3 block text-xs font-semibold text-slate-700">
              Motivo
              <select
                value={decision.motivo ?? ""}
                disabled={disabled}
                onChange={(event) => onChange("motivo", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Selecciona un motivo</option>
                {PENDING_REASON_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          )}
          {selected === "traspasar" && nextSlot && (
            <p className="mt-2 text-xs font-medium text-sky-700">Quedará disponible en el turno de {turnoLabel(nextSlot.turno).toLowerCase()}.</p>
          )}
          {selected === "no_realizada" && (
            <p className="mt-2 text-xs text-slate-500">La tarea se cerrará sin ejecución y conservará este motivo.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertRow({ item }) {
  const tone = item.status === "critical" ? "rose" : "amber";
  return (
    <div className={`rounded-2xl border p-3 ${tone === "rose" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-slate-950">{item.residente.nombre}</div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone === "rose" ? "bg-white text-rose-700" : "bg-white text-amber-800"}`}>
          {item.label}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {item.detalles?.map((detail) => (
          <span key={detail.key} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700">
            {detail.label}: {detail.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResidentRow({ residente }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3">
      <div>
        <div className="text-sm font-semibold text-slate-950">{residente.nombre}</div>
        <div className="text-xs text-slate-500">
          {residente.ubicacion_label || "Sin ubicación"}
        </div>
      </div>
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Sin signos hoy</span>
    </div>
  );
}

function TextRow({ item }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-950">{item.residente?.nombre ?? "Residente"}</div>
        {item.seguimiento_turno && (
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-amber-800">
            Pendiente · {item.seguimiento_turno}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm leading-6 text-slate-600">{item.descripcion}</p>
      {item.acciones_tomadas && (
        <p className="mt-1 text-xs leading-5 text-slate-500">Acciones: {item.acciones_tomadas}</p>
      )}
    </div>
  );
}

function MedicationRow({ item, tone = "amber", status }) {
  const classes = tone === "sky" ? "border-sky-200 bg-sky-50" : item.vencida ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50";
  return (
    <div className={`rounded-2xl border p-3 ${classes}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-950">{item.medicamento}</div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
          {status} · {item.hora?.slice(0, 5) ?? "--:--"}{item.controlado ? " · controlado" : ""}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {item.residente?.nombre ?? "Residente"}{item.dosis ? ` · ${item.dosis}` : ""}{item.via ? ` · vía ${item.via}` : ""}
      </p>
    </div>
  );
}
