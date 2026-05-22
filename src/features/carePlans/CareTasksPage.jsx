import { useEffect, useMemo, useState } from "react";
import PageLayout from "../../layout/PageLayout";
import Modal from "../../components/Modal";
import HelpTooltip from "../../components/HelpTooltip";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import {
  CARE_TURNOS,
  OMISSION_REASONS as CARE_OMISSION_REASONS,
  completeCareTask,
  currentTurno,
  listCareTasks,
  nextFollowUpSlot,
  rescheduleCareTask,
  todayIso,
} from "./carePlansService";
import {
  OMISSION_REASONS as MED_OMISSION_REASONS,
  administerMedication,
  listAvailableLots,
  listMedicationAdministrations,
  validateControlledAdministration,
} from "../emar/emarService";
import {
  FILTER_LABEL,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  SEGUIMIENTO_TIPO_LABEL,
  VITALS_TURN_HOUR,
  matchesFilter,
  matchesType,
  normalizeCareTask,
  normalizeMedication,
  normalizeSeguimiento,
  normalizeVitalTask,
} from "./careTasksBoardUtils";
import {
  getPendingVitalSignsResidents,
  createVitalSigns,
} from "../vitalSigns/vitalSignsService";
import {
  getPendingSeguimientos,
  resolverSeguimiento,
  continuarSeguimiento,
} from "../observations/observationsService";
import {
  STATUS as VITAL_STATUS,
  systolicStatus,
  diastolicStatus,
  heartRateStatus,
  respiratoryRateStatus,
  temperatureStatus,
  oxygenStatus,
  glucoseStatus,
  painStatus,
  recordOverallLabel,
} from "../vitalSigns/vitalRanges";

const STATUS_TONE = {
  pendiente: "bg-amber-50 text-amber-800 border-amber-200",
  cumplida: "bg-emerald-50 text-emerald-700 border-emerald-200",
  administrado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  validado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  omitida: "bg-rose-50 text-rose-700 border-rose-200",
  omitido: "bg-rose-50 text-rose-700 border-rose-200",
  reprogramada: "bg-sky-50 text-sky-700 border-sky-200",
  pendiente_validacion: "bg-sky-50 text-sky-700 border-sky-200",
  cancelada: "bg-slate-50 text-slate-600 border-slate-200",
  cancelado: "bg-slate-50 text-slate-600 border-slate-200",
};

function residentName(residente) {
  return [residente?.apellido, residente?.nombre].filter(Boolean).join(", ") || "Residente";
}

export default function CareTasksPage() {
  const toast = useToast();
  const { can, profile } = useAuth();
  const [fecha, setFecha] = useState(todayIso());
  const [turno, setTurno] = useState(currentTurno());
  const [filter, setFilter] = useState("pendientes");
  const [type, setType] = useState("todos");
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastLoaded, setLastLoaded] = useState(null);
  const [careModal, setCareModal] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [medModal, setMedModal] = useState(null);
  const [vitalsModal, setVitalsModal] = useState(null);
  const [seguimientoModal, setSeguimientoModal] = useState(null);

  const canComplete = can("completar_tareas_cuidado");
  const canAdminister = can("administrar_medicamentos");
  const canValidate = can("validar_medicamentos_controlados");
  const canCreateVitals = can("crear_signos_vitales");
  const canResolveSeguimiento = can("crear_observaciones");
  const currentUserId = profile?.id ?? null;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [careRows, medRows, pendingVitals, seguimientos] = await Promise.all([
        listCareTasks({ fecha, turno, estado: null, limit: 500 }),
        listMedicationAdministrations({ fecha, turno, estado: null, limit: 500 }),
        getPendingVitalSignsResidents(fecha, turno).catch(() => []),
        getPendingSeguimientos(fecha, turno).catch(() => []),
      ]);
      const normalized = [
        ...seguimientos.map(normalizeSeguimiento),
        ...pendingVitals.map((r) => normalizeVitalTask(r, fecha, turno)),
        ...careRows.map(normalizeCareTask),
        ...medRows.map(normalizeMedication),
      ].sort((a, b) => `${a.fecha}T${a.hora ?? "00:00"}`.localeCompare(`${b.fecha}T${b.hora ?? "00:00"}`));
      setAllItems(normalized);
      setLastLoaded(new Date());
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar las tareas del turno.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, turno]);

  const items = useMemo(() => {
    return allItems
      .filter((item) => matchesType(item, type))
      .filter((item) => matchesFilter(item, filter));
  }, [allItems, filter, type]);

  const metrics = useMemo(() => {
    return allItems.reduce((acc, item) => {
      acc.total += 1;
      if (item.source === "care") acc.cuidado += 1;
      if (item.source === "med") acc.medicamentos += 1;
      if (item.source === "vitals") acc.signos += 1;
      if (item.source === "seguimiento") acc.seguimientos += 1;
      if (item.open) acc.pendientes += 1;
      if (item.source === "care" && item.estado === "reprogramada") acc.reprogramadas += 1;
      if (item.estado === "pendiente_validacion") acc.porValidar += 1;
      if (item.overdue) acc.vencidas += 1;
      return acc;
    }, { total: 0, pendientes: 0, vencidas: 0, cuidado: 0, medicamentos: 0, porValidar: 0, reprogramadas: 0, signos: 0, seguimientos: 0 });
  }, [allItems]);

  const handleCareClose = async ({ action, notas, motivo, seguimiento, seguimientoFecha, seguimientoTurno }) => {
    if (!careModal) return;
    setSaving(true);
    try {
      await completeCareTask({
        id: careModal.row.id,
        estado: action,
        notas,
        motivoOmision: motivo,
        requiereSeguimiento: seguimiento,
        seguimientoFecha,
        seguimientoTurno,
      });
      toast(action === "cumplida" ? "Tarea marcada como cumplida." : "Omisión registrada.", "success");
      setCareModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo cerrar la tarea.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCareReschedule = async ({ fecha: nextFecha, turno: nextTurno, hora, notas, seguimiento, seguimientoFecha, seguimientoTurno }) => {
    if (!rescheduleModal) return;
    setSaving(true);
    try {
      await rescheduleCareTask({
        id: rescheduleModal.row.id,
        fecha: nextFecha,
        turno: nextTurno,
        hora,
        notas,
        requiereSeguimiento: seguimiento,
        seguimientoFecha,
        seguimientoTurno,
      });
      toast("Tarea reprogramada.", "success");
      setRescheduleModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo reprogramar la tarea.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleMedicationSubmit = async (payload) => {
    setSaving(true);
    try {
      if (payload.action === "validar") {
        await validateControlledAdministration({ id: payload.row.id, notas: payload.notas });
        toast("Administración controlada validada.", "success");
      } else {
        await administerMedication({
          id: payload.row.id,
          estado: payload.action,
          loteId: payload.loteId,
          dosis: payload.dosis,
          notas: payload.notas,
          motivoOmision: payload.motivo,
          requiereSeguimiento: payload.seguimiento,
          seguimientoFecha: payload.seguimientoFecha,
          seguimientoTurno: payload.seguimientoTurno,
        });
        toast(payload.action === "administrado" ? "Administración registrada." : "Omisión registrada.", "success");
      }
      setMedModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo guardar el registro eMAR.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSeguimientoSubmit = async ({ id, notas, continuar, nuevaFecha, nuevoTurno }) => {
    setSaving(true);
    try {
      if (continuar) {
        await continuarSeguimiento(id, { notas, nuevaFecha, nuevoTurno });
        toast("Seguimiento registrado. Nuevo pendiente creado para el turno indicado.", "success");
      } else {
        await resolverSeguimiento(id, { notas });
        toast("Seguimiento finalizado correctamente.", "success");
      }
      setSeguimientoModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo resolver el seguimiento.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleVitalsSubmit = async ({ row, form, seguimiento, seguimientoFecha, seguimientoTurno }) => {
    setSaving(true);
    try {
      const toNum = (v) => (v !== "" ? parseFloat(v) : null);
      const toInt = (v) => (v !== "" ? parseInt(v, 10) : null);
      const hora = VITALS_TURN_HOUR[row.turno] ?? "08:00";
      await createVitalSigns({
        residente_id: row.residente_id,
        fecha_hora: new Date(`${row.fecha}T${hora}`).toISOString(),
        turno: row.turno,
        presion_sistolica: toInt(form.presion_sistolica),
        presion_diastolica: toInt(form.presion_diastolica),
        frecuencia_cardiaca: toInt(form.frecuencia_cardiaca),
        frecuencia_respiratoria: toInt(form.frecuencia_respiratoria),
        temperatura: toNum(form.temperatura),
        saturacion_oxigeno: toInt(form.saturacion_oxigeno),
        glucosa: toInt(form.glucosa),
        peso: toNum(form.peso),
        dolor_escala: toInt(form.dolor_escala),
        estado_conciencia: form.estado_conciencia || null,
        observaciones: form.observaciones || null,
        requiere_seguimiento: seguimiento,
        seguimiento_fecha: seguimiento ? seguimientoFecha : null,
        seguimiento_turno: seguimiento ? seguimientoTurno : null,
      });
      toast(seguimiento ? "Signos vitales registrados con seguimiento pendiente." : "Signos vitales registrados.", "success");
      setVitalsModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo registrar los signos vitales.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Tareas diarias"
      eyebrow="Turno operativo"
      description="Plan de cuidado y medicamentos programados, generados automáticamente por recurrencia."
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {lastLoaded && (
            <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 tabular-nums">
              {lastLoaded.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            <svg className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Actualizar
          </button>
        </div>
      }
      className="space-y-5"
    >
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_150px_150px_160px_150px]">
        <div className="rounded-xl bg-teal-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700">
            Foco del turno
            <HelpTooltip label="Ayuda: tareas diarias">
              Al abrir esta vista se generan las tareas de cuidado y administraciones eMAR del turno. Reintentar no duplica registros.
            </HelpTooltip>
          </div>
          <div className="mt-1 text-sm font-semibold text-teal-950">
            {metrics.porValidar
              ? `${metrics.porValidar} eMAR por validar`
              : metrics.vencidas
                ? `${metrics.vencidas} pendiente${metrics.vencidas === 1 ? "" : "s"} vencido${metrics.vencidas === 1 ? "" : "s"}`
                : `${metrics.pendientes} pendiente${metrics.pendientes === 1 ? "" : "s"}`}
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
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            {Object.entries(FILTER_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Tipo
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            <option value="todos">Todo</option>
            <option value="cuidado">Cuidado</option>
            <option value="medicamentos">eMAR</option>
            <option value="signos">Signos vitales</option>
            <option value="seguimientos">Seguimientos</option>
          </select>
        </label>
      </section>

      <TurnWorkflowGuide />

      <section className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        <Metric label="Total" value={metrics.total} />
        <Metric label="Pendientes" value={metrics.pendientes} tone="amber" />
        <Metric label="Vencidas" value={metrics.vencidas} tone="rose" />
        <Metric label="Reprogramadas" value={metrics.reprogramadas} tone="sky" />
        <Metric label="Cuidado" value={metrics.cuidado} tone="teal" />
        <Metric label="eMAR" value={metrics.medicamentos} tone="sky" />
        <Metric label="Signos" value={metrics.signos} tone="teal" />
        <Metric label="Seguimiento" value={metrics.seguimientos} tone="amber" />
        <Metric label="Por validar" value={metrics.porValidar} tone="sky" />
      </section>

      <TurnProgressStrip metrics={metrics} />

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
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-teal-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-950">
              {filter === "pendientes" && metrics.total > 0 ? "Todo el turno al día" : "Sin tareas aquí"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filter === "pendientes" && metrics.total > 0
                ? "No quedan pendientes ni vencidas para este turno."
                : "Configura actividades en Plan de cuidado o indicaciones en eMAR desde la ficha del residente."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <WorkItemRow
                key={item.key}
                item={item}
                canComplete={canComplete}
                canAdminister={canAdminister}
                canValidate={canValidate}
                canCreateVitals={canCreateVitals}
                canResolveSeguimiento={canResolveSeguimiento}
                currentUserId={currentUserId}
                onCareAction={(action) => setCareModal({ action, row: item.row })}
                onCareReschedule={() => setRescheduleModal({ row: item.row })}
                onMedicationAction={(action) => setMedModal({ action, row: item.row })}
                onVitalsAction={() => setVitalsModal({ row: item.row })}
                onSeguimientoAction={() => setSeguimientoModal({ obs: item.row })}
              />
            ))}
          </ul>
        )}
      </section>

      <CareTaskModal
        modal={careModal}
        saving={saving}
        onClose={() => !saving && setCareModal(null)}
        onSubmit={handleCareClose}
      />
      <RescheduleCareTaskModal
        modal={rescheduleModal}
        saving={saving}
        onClose={() => !saving && setRescheduleModal(null)}
        onSubmit={handleCareReschedule}
      />
      <MedicationTaskModal
        modal={medModal}
        saving={saving}
        onClose={() => !saving && setMedModal(null)}
        onSubmit={handleMedicationSubmit}
      />
      <VitalSignsTaskModal
        modal={vitalsModal}
        saving={saving}
        onClose={() => !saving && setVitalsModal(null)}
        onSubmit={handleVitalsSubmit}
      />
      <SeguimientoModal
        modal={seguimientoModal}
        saving={saving}
        onClose={() => !saving && setSeguimientoModal(null)}
        onSubmit={handleSeguimientoSubmit}
      />
    </PageLayout>
  );
}

function TurnProgressStrip({ metrics }) {
  if (metrics.total === 0) return null;
  const completed = Math.max(0, metrics.total - metrics.pendientes - metrics.reprogramadas);
  const pct = Math.round(completed / metrics.total * 100);
  const tone =
    pct >= 80 ? { bar: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700" } :
    pct >= 40 ? { bar: "bg-amber-400",   pill: "bg-amber-100 text-amber-800"    } :
                { bar: "bg-rose-400",    pill: "bg-rose-100 text-rose-700"      };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Progreso del turno</span>
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${tone.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full tabular-nums ${tone.pill}`}>
        {completed}/{metrics.total} ({pct}%)
      </span>
    </div>
  );
}

export function WorkItemRow({ item, canComplete, canAdminister, canValidate, canCreateVitals, canResolveSeguimiento, currentUserId, onCareAction, onCareReschedule, onMedicationAction, onVitalsAction, onSeguimientoAction }) {
  const isCare = item.source === "care";
  const isMed = item.source === "med";
  const isVitals = item.source === "vitals";
  const isSeguimiento = item.source === "seguimiento";
  const canValidateThis = canValidate && item.row.administrado_por !== currentUserId;

  const typeBadgeClass = isCare
    ? "border-teal-200 bg-teal-50 text-teal-700"
    : isVitals
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : isSeguimiento
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-sky-200 bg-sky-50 text-sky-700";

  return (
    <li className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${typeBadgeClass}`}>
              {item.typeLabel}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[item.estado] ?? STATUS_TONE.pendiente}`}>
              {item.statusLabel}
            </span>
            {item.overdue && (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                {item.carry ? "Arrastre" : "Vencida"}
              </span>
            )}
            {item.controlled && (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                Controlado
              </span>
            )}
            {isCare && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_TONE[item.priority] ?? PRIORITY_TONE.media}`}>
                {PRIORITY_LABEL[item.priority] ?? "Media"}
              </span>
            )}
            <span className="text-xs font-medium text-slate-500">{item.hora?.slice(0, 5)}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-950">{item.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {residentName(item.resident)}{item.meta ? ` · ${item.meta}` : ""}
          </p>
          {item.detail && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.detail}</p>}
          {isCare && item.dueWindow && item.open && (
            <p className="mt-1 text-xs text-slate-500">Ventana hasta {item.dueWindow}</p>
          )}
          {isCare && item.requiresFollowUp && (
            <p className="mt-1 text-xs text-amber-700">Requiere seguimiento clínico al cierre.</p>
          )}
          {isCare && item.estado === "reprogramada" && item.row.reprogramada_para && (
            <p className="mt-1 text-xs text-sky-700">
              Reprogramada para {new Date(item.row.reprogramada_para).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}
          {isMed && item.dueWindow && item.estado === "pendiente" && (
            <p className="mt-1 text-xs text-slate-500">Ventana hasta {item.dueWindow}</p>
          )}
          {isMed && item.estado === "pendiente_validacion" && (
            <p className="mt-1 text-xs text-sky-700">Requiere validación de un segundo usuario autorizado.</p>
          )}
          {item.row.notas && <p className="mt-1 text-xs text-slate-400">Notas: {item.row.notas}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {isVitals && item.open && canCreateVitals && (
            <button type="button" onClick={onVitalsAction} className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800">
              Registrar
            </button>
          )}
          {isVitals && item.open && !canCreateVitals && (
            <span className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">
              Sin permiso
            </span>
          )}
          {isCare && item.open && canComplete && (
            <>
              <button type="button" onClick={() => onCareAction("cumplida")} className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                Cumplir
              </button>
              <button type="button" onClick={onCareReschedule} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50">
                Reprogramar
              </button>
              <button type="button" onClick={() => onCareAction("omitida")} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                Omitir
              </button>
            </>
          )}
          {isMed && item.estado === "pendiente" && canAdminister && (
            <>
              <button type="button" onClick={() => onMedicationAction("administrado")} className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                Administrar
              </button>
              <button type="button" onClick={() => onMedicationAction("omitido")} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                Omitir
              </button>
            </>
          )}
          {isMed && item.estado === "pendiente_validacion" && canValidateThis && (
            <button type="button" onClick={() => onMedicationAction("validar")} className="rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800">
              Validar
            </button>
          )}
          {isMed && item.estado === "pendiente_validacion" && canValidate && !canValidateThis && (
            <span className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
              Requiere otro validador
            </span>
          )}
          {isSeguimiento && item.open && canResolveSeguimiento && (
            <button type="button" onClick={onSeguimientoAction} className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700">
              Resolver
            </button>
          )}
          {isSeguimiento && item.open && !canResolveSeguimiento && (
            <span className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              Sin permiso
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export function TurnWorkflowGuide() {
  const { profile } = useAuth();
  const key = `fichaeleam_tGuide_${profile?.id ?? "anon"}`;
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(`fichaeleam_tGuide_${profile?.id ?? "anon"}`) === "1"; } catch { return false; }
  });
  const steps = [
    ["Cargar", "La vista genera las tareas recurrentes del turno sin duplicarlas."],
    ["Ejecutar", "Cumple cuidado o administra eMAR dentro de la ventana indicada."],
    ["Reprogramar / omitir", "Si no corresponde ejecutar, deja motivo, nueva hora o trazabilidad."],
    ["Seguimiento", "Marca seguimiento cuando el equipo debe revisar después."],
  ];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setCollapsed((p) => {
          const next = !p;
          try { localStorage.setItem(key, next ? "1" : "0"); } catch { /* storage unavailable */ }
          return next;
        })}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-semibold text-slate-800">Flujo del turno operativo</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${collapsed ? "" : "rotate-90"}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
      {!collapsed && (
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {steps.map(([title, text], index) => (
            <div key={title} className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-50 text-sm font-semibold text-teal-800 ring-1 ring-teal-200">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function Metric({ label, value, tone = "slate" }) {
  const cls = {
    slate: "bg-white text-slate-900 border-slate-200",
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-200",
    rose: "bg-rose-50 text-rose-900 border-rose-200",
    sky: "bg-sky-50 text-sky-900 border-sky-200",
    teal: "bg-teal-50 text-teal-900 border-teal-200",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs font-medium opacity-70">{label}</div>
    </div>
  );
}

function FollowUpFields({
  enabled,
  fecha,
  turno,
  onToggle,
  onFechaChange,
  onTurnoChange,
  locked = false,
  copy = "El seguimiento quedará pendiente para el turno definido y aparecerá en la entrega correspondiente.",
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <label className="flex items-start gap-2 text-sm text-amber-950">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={locked}
          className="mt-0.5 h-4 w-4 accent-amber-600"
        />
        <span>
          Crear seguimiento pendiente
          <span className="block text-xs text-amber-800">
            {locked
              ? "Esta actividad exige seguimiento clínico al cierre."
              : "Úsalo si el equipo debe revisar la evolución después de guardar."}
          </span>
        </span>
      </label>
      {enabled && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-amber-950">
            Fecha del seguimiento *
            <input
              type="date"
              value={fecha}
              onChange={(e) => onFechaChange(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </label>
          <label className="block text-sm font-medium text-amber-950">
            Turno del seguimiento *
            <select
              value={turno}
              onChange={(e) => onTurnoChange(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            >
              {CARE_TURNOS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <p className="sm:col-span-2 text-xs text-amber-800">{copy}</p>
        </div>
      )}
    </div>
  );
}

export function CareTaskModal({ modal, saving, onClose, onSubmit }) {
  const [notas, setNotas] = useState("");
  const [motivo, setMotivo] = useState("rechazo");
  const [seguimiento, setSeguimiento] = useState(false);
  const [seguimientoFecha, setSeguimientoFecha] = useState(todayIso());
  const [seguimientoTurno, setSeguimientoTurno] = useState(currentTurno());

  useEffect(() => {
    setNotas("");
    setMotivo("rechazo");
    setSeguimiento(modal?.row?.actividad?.requiere_observacion === true);
    if (modal?.row) {
      const next = nextFollowUpSlot(modal.row.fecha, modal.row.turno);
      setSeguimientoFecha(next.fecha);
      setSeguimientoTurno(next.turno);
    }
  }, [modal]);

  if (!modal) return null;

  const isOmission = modal.action === "omitida";
  const actionCopy = isOmission
    ? "La tarea quedará omitida, con motivo obligatorio y sin marcarse como realizada. Usa seguimiento si requiere control posterior."
    : "La tarea quedará cumplida. Si activas seguimiento se creará una observación para continuidad del equipo.";

  return (
    <Modal isOpen={!!modal} onClose={onClose} title={isOmission ? "Registrar omisión" : "Cerrar tarea"}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            action: modal.action,
            notas,
            motivo: isOmission ? motivo : null,
            seguimiento,
            seguimientoFecha,
            seguimientoTurno,
          });
        }}
      >
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-950">
            {modal.row.actividad?.titulo}
          </div>
          <div className="text-xs text-slate-500">{residentName(modal.row.residentes)}</div>
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
          <div className="font-semibold">Qué pasará al guardar</div>
          <p className="mt-1 text-xs leading-relaxed">{actionCopy}</p>
        </div>

        {isOmission && (
          <label className="block text-sm font-medium text-slate-700">
            Motivo
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {CARE_OMISSION_REASONS.map(([value, label]) => (
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

        <FollowUpFields
          enabled={seguimiento}
          fecha={seguimientoFecha}
          turno={seguimientoTurno}
          onToggle={(checked) => {
            setSeguimiento(checked);
            if (checked) {
              const next = nextFollowUpSlot(modal.row.fecha, modal.row.turno);
              setSeguimientoFecha(next.fecha);
              setSeguimientoTurno(next.turno);
            }
          }}
          onFechaChange={setSeguimientoFecha}
          onTurnoChange={setSeguimientoTurno}
          locked={modal.row.actividad?.requiere_observacion === true}
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function RescheduleCareTaskModal({ modal, saving, onClose, onSubmit }) {
  const [fecha, setFecha] = useState(todayIso());
  const [turno, setTurno] = useState(currentTurno());
  const [hora, setHora] = useState("09:00");
  const [notas, setNotas] = useState("");
  const [seguimiento, setSeguimiento] = useState(false);
  const [seguimientoFecha, setSeguimientoFecha] = useState(todayIso());
  const [seguimientoTurno, setSeguimientoTurno] = useState(currentTurno());

  useEffect(() => {
    if (!modal) return;
    setFecha(modal.row.fecha || todayIso());
    setTurno(modal.row.turno || currentTurno());
    setHora(modal.row.hora?.slice(0, 5) || "09:00");
    setNotas("");
    setSeguimiento(modal.row.requiere_seguimiento === true);
    const next = nextFollowUpSlot(modal.row.fecha, modal.row.turno);
    setSeguimientoFecha(next.fecha);
    setSeguimientoTurno(next.turno);
  }, [modal]);

  if (!modal) return null;

  return (
    <Modal isOpen={!!modal} onClose={onClose} title="Reprogramar tarea">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ fecha, turno, hora, notas, seguimiento, seguimientoFecha, seguimientoTurno });
        }}
      >
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-950">{modal.row.actividad?.titulo}</div>
          <div className="text-xs text-slate-500">
            {residentName(modal.row.residentes)} · original {modal.row.fecha} {modal.row.hora?.slice(0, 5)}
          </div>
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
          <div className="font-semibold">Qué pasará al guardar</div>
          <p className="mt-1 text-xs leading-relaxed">
            Se moverá esta misma tarea al nuevo día, turno y hora. No se creará una segunda tarea, y la auditoría conservará el cambio.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => {
                const value = e.target.value;
                setFecha(value);
                if (seguimiento) {
                  const next = nextFollowUpSlot(value, turno);
                  setSeguimientoFecha(next.fecha);
                  setSeguimientoTurno(next.turno);
                }
              }}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Turno
            <select
              value={turno}
              onChange={(e) => {
                const value = e.target.value;
                setTurno(value);
                if (seguimiento) {
                  const next = nextFollowUpSlot(fecha, value);
                  setSeguimientoFecha(next.fecha);
                  setSeguimientoTurno(next.turno);
                }
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {CARE_TURNOS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Hora
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Notas de reprogramación
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={4}
            placeholder="Motivo breve y condiciones para ejecutar después..."
            className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        <FollowUpFields
          enabled={seguimiento}
          fecha={seguimientoFecha}
          turno={seguimientoTurno}
          onToggle={(checked) => {
            setSeguimiento(checked);
            if (checked) {
              const next = nextFollowUpSlot(fecha, turno);
              setSeguimientoFecha(next.fecha);
              setSeguimientoTurno(next.turno);
            }
          }}
          onFechaChange={setSeguimientoFecha}
          onTurnoChange={setSeguimientoTurno}
          locked={modal.row.requiere_seguimiento === true}
          copy="El seguimiento quedará pendiente para confirmar que la reprogramación se ejecutó o que el residente evolucionó según lo esperado."
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60">
            {saving ? "Guardando..." : "Reprogramar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function MedicationTaskModal({ modal, saving, onClose, onSubmit }) {
  const [notas, setNotas] = useState("");
  const [motivo, setMotivo] = useState("rechazo");
  const [seguimiento, setSeguimiento] = useState(false);
  const [seguimientoFecha, setSeguimientoFecha] = useState(todayIso());
  const [seguimientoTurno, setSeguimientoTurno] = useState(currentTurno());
  const [dosis, setDosis] = useState("1");
  const [loteId, setLoteId] = useState("");
  const [lots, setLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(false);

  useEffect(() => {
    setNotas("");
    setMotivo("rechazo");
    setSeguimiento(false);
    if (modal?.row) {
      const next = nextFollowUpSlot(modal.row.fecha, modal.row.turno);
      setSeguimientoFecha(next.fecha);
      setSeguimientoTurno(next.turno);
    }
    setDosis("1");
    setLoteId("");
    setLots([]);
    if (!modal || modal.action !== "administrado") return;
    const needsLot = modal.row.indicacion?.es_controlado || modal.row.indicacion?.requiere_stock;
    if (!needsLot) return;
    setLoadingLots(true);
    listAvailableLots({
      residenteId: modal.row.residente_id,
      indicacionId: modal.row.indicacion_id,
      controlado: modal.row.indicacion?.es_controlado === true,
    })
      .then((rows) => {
        setLots(rows);
        setLoteId(rows[0]?.id ?? "");
      })
      .finally(() => setLoadingLots(false));
  }, [modal]);

  if (!modal) return null;

  const isOmission = modal.action === "omitido";
  const isValidation = modal.action === "validar";
  const needsLot = modal.action === "administrado" && (modal.row.indicacion?.es_controlado || modal.row.indicacion?.requiere_stock);
  const unitLabel = modal.row.indicacion?.unidad_dosis || "unidad";
  const actionCopy = isValidation
    ? "Confirma la administración controlada como segundo usuario. Esta acción firma la validación y cierra el pendiente."
    : isOmission
      ? "Registra que la dosis no se administró. No descuenta stock y exige un motivo para la continuidad clínica."
      : modal.row.indicacion?.es_controlado || modal.row.indicacion?.requiere_doble_validacion
        ? "Descuenta stock del lote seleccionado y deja la administración pendiente de validación por otro usuario."
        : needsLot
          ? "Descuenta stock del lote seleccionado y marca la administración como realizada."
          : "Marca la administración como realizada. No hay descuento de stock configurado para esta indicación.";

  return (
    <Modal
      isOpen={!!modal}
      onClose={onClose}
      title={isValidation ? "Validar controlado" : isOmission ? "Registrar omisión eMAR" : "Administrar medicamento"}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            action: modal.action,
            row: modal.row,
            notas,
            motivo: isOmission ? motivo : null,
            seguimiento,
            seguimientoFecha,
            seguimientoTurno,
            dosis,
            loteId: needsLot ? loteId : null,
          });
        }}
      >
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-950">{modal.row.indicacion?.medicamento_nombre}</div>
          <div className="text-xs text-slate-500">
            {residentName(modal.row.residentes)} · {modal.row.indicacion?.dosis} · {modal.row.hora?.slice(0, 5)}
          </div>
          {modal.row.indicacion?.instrucciones && (
            <p className="mt-2 text-xs text-slate-600">{modal.row.indicacion.instrucciones}</p>
          )}
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
          <div className="font-semibold">Qué pasará al guardar</div>
          <p className="mt-1 text-xs leading-relaxed">{actionCopy}</p>
        </div>

        {needsLot && (
          <label className="block text-sm font-medium text-slate-700">
            Lote / stock
            <select
              value={loteId}
              onChange={(e) => setLoteId(e.target.value)}
              disabled={loadingLots || saving}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {loadingLots && <option value="">Cargando stock...</option>}
              {!loadingLots && lots.length === 0 && <option value="">Sin stock disponible</option>}
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.medicamento_nombre} · lote {lot.lote || "s/l"} · {lot.cantidad_actual} {lot.unidad}
                  {lot.fecha_vencimiento ? ` · vence ${lot.fecha_vencimiento}` : ""}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              eMAR descuenta esta cantidad del lote al guardar. Para controlados, el movimiento queda pendiente de validación.
            </span>
          </label>
        )}
        {needsLot && !loadingLots && lots.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {modal.row.indicacion?.es_controlado
              ? "Sin lote controlado disponible para esta indicación. Registra o marca un lote controlado desde la ficha del residente, pestaña eMAR."
              : "Sin stock disponible para este medicamento. Registra un lote con inventario desde la ficha del residente, pestaña eMAR."}
          </div>
        )}

        {modal.action === "administrado" && (
          <label className="block text-sm font-medium text-slate-700">
            Cantidad administrada ({unitLabel})
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={dosis}
              onChange={(e) => setDosis(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Usa la cantidad real entregada; debe coincidir con la unidad del lote para mantener stock confiable.
            </span>
          </label>
        )}

        {isOmission && (
          <label className="block text-sm font-medium text-slate-700">
            Motivo
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {MED_OMISSION_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Notas
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={4}
            placeholder={isValidation ? "Validación de segundo usuario..." : "Detalle breve para continuidad clínica..."}
            className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        {!isValidation && (
          <FollowUpFields
            enabled={seguimiento}
            fecha={seguimientoFecha}
            turno={seguimientoTurno}
            onToggle={(checked) => {
              setSeguimiento(checked);
              if (checked) {
                const next = nextFollowUpSlot(modal.row.fecha, modal.row.turno);
                setSeguimientoFecha(next.fecha);
                setSeguimientoTurno(next.turno);
              }
            }}
            onFechaChange={setSeguimientoFecha}
            onTurnoChange={setSeguimientoTurno}
            copy="El seguimiento quedará pendiente para revisar respuesta, efectos adversos, omisión o continuidad farmacológica."
          />
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={saving || (needsLot && (!loteId || lots.length === 0))} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── VitalsNumField ──────────────────────────────────────────── */

function VitalsNumField({ label, unit, normal, name, value, onChange, placeholder, step, min, max, status }) {
  const s = status ? VITAL_STATUS[status] : null;
  const showStatus = status && status !== "unknown";
  const ringClass = !showStatus
    ? "border-slate-300 focus:ring-teal-100"
    : status === "critical"
      ? "border-rose-300 focus:ring-rose-100"
      : status === "warning"
        ? "border-amber-300 focus:ring-amber-100"
        : "border-emerald-300 focus:ring-emerald-100";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-slate-600">
          {label}{unit && <span className="text-slate-400 font-normal ml-1">({unit})</span>}
        </label>
        {showStatus && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${s.badge}`}>
            <span className={`h-1 w-1 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        )}
      </div>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        className={`w-full border rounded-xl px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${ringClass}`}
      />
      {normal && <div className="mt-0.5 text-[10px] text-slate-400">Normal: {normal}</div>}
    </div>
  );
}

/* ─── VitalSignsTaskModal ─────────────────────────────────────── */

const VITALS_FORM_INITIAL = {
  presion_sistolica: "",
  presion_diastolica: "",
  frecuencia_cardiaca: "",
  frecuencia_respiratoria: "",
  temperatura: "",
  saturacion_oxigeno: "",
  glucosa: "",
  peso: "",
  dolor_escala: "0",
  estado_conciencia: "alerta",
  observaciones: "",
};

export function VitalSignsTaskModal({ modal, saving, onClose, onSubmit }) {
  const [form, setForm] = useState(VITALS_FORM_INITIAL);
  const [seguimiento, setSeguimiento] = useState(false);
  const [seguimientoFecha, setSeguimientoFecha] = useState(todayIso());
  const [seguimientoTurno, setSeguimientoTurno] = useState(currentTurno());

  const liveOverall = useMemo(() => recordOverallLabel({
    presion_sistolica: form.presion_sistolica,
    presion_diastolica: form.presion_diastolica,
    frecuencia_cardiaca: form.frecuencia_cardiaca,
    frecuencia_respiratoria: form.frecuencia_respiratoria,
    temperatura: form.temperatura,
    saturacion_oxigeno: form.saturacion_oxigeno,
    glucosa: form.glucosa,
    dolor_escala: form.dolor_escala,
  }), [form]);

  useEffect(() => {
    if (!modal) return;
    setForm(VITALS_FORM_INITIAL);
    setSeguimiento(false);
    const next = nextFollowUpSlot(modal.row.fecha, modal.row.turno);
    setSeguimientoFecha(next.fecha);
    setSeguimientoTurno(next.turno);
  }, [modal]);

  if (!modal) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const liveBadge = VITAL_STATUS[liveOverall.status];
  const resident = modal.row.residentes;
  const resName = [resident?.apellido, resident?.nombre].filter(Boolean).join(", ") || "Residente";

  return (
    <Modal isOpen={!!modal} onClose={onClose} title="Registrar signos vitales">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ row: modal.row, form, seguimiento, seguimientoFecha, seguimientoTurno });
        }}
      >
        <div className="rounded-xl bg-slate-50 p-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">{resName}</div>
            <div className="text-xs text-slate-500 capitalize">{modal.row.turno} · {modal.row.fecha}</div>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${liveBadge.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${liveBadge.dot}`} />
            {liveOverall.label}
          </span>
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-sky-800">
          Registra los parámetros disponibles. Los campos vacíos quedan como "sin dato". El estado general se actualiza en tiempo real.
        </div>

        {liveOverall.status !== "normal" && liveOverall.status !== "unknown" && (
          <div className={`rounded-xl border p-3 text-xs ${liveOverall.status === "critical" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            Hay valores fuera de rango. Si el equipo debe reevaluar al residente, activa seguimiento y define fecha/turno.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <VitalsNumField label="P/A Sistólica" unit="mmHg" normal="100–139" name="presion_sistolica" value={form.presion_sistolica} onChange={handleChange} placeholder="120" status={systolicStatus(form.presion_sistolica)} />
          <VitalsNumField label="P/A Diastólica" unit="mmHg" normal="60–89" name="presion_diastolica" value={form.presion_diastolica} onChange={handleChange} placeholder="80" status={diastolicStatus(form.presion_diastolica)} />
          <VitalsNumField label="Frec. cardiaca" unit="lpm" normal="60–100" name="frecuencia_cardiaca" value={form.frecuencia_cardiaca} onChange={handleChange} placeholder="70" status={heartRateStatus(form.frecuencia_cardiaca)} />
          <VitalsNumField label="Frec. respiratoria" unit="rpm" normal="12–20" name="frecuencia_respiratoria" value={form.frecuencia_respiratoria} onChange={handleChange} placeholder="16" status={respiratoryRateStatus(form.frecuencia_respiratoria)} />
          <VitalsNumField label="Temperatura" unit="°C" normal="36.0–37.7" name="temperatura" value={form.temperatura} onChange={handleChange} step="0.1" placeholder="36.5" status={temperatureStatus(form.temperatura)} />
          <VitalsNumField label="SatO₂" unit="%" normal="≥ 95" name="saturacion_oxigeno" value={form.saturacion_oxigeno} onChange={handleChange} min="0" max="100" placeholder="98" status={oxygenStatus(form.saturacion_oxigeno)} />
          <VitalsNumField label="Glucosa" unit="mg/dL" normal="70–179" name="glucosa" value={form.glucosa} onChange={handleChange} placeholder="100" status={glucoseStatus(form.glucosa)} />
          <VitalsNumField label="Peso" unit="kg" name="peso" value={form.peso} onChange={handleChange} step="0.1" placeholder="65.0" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-600">Dolor (0–10)</label>
            <span className={`text-xs font-medium ${painStatus(form.dolor_escala) === "critical" ? "text-rose-600" : painStatus(form.dolor_escala) === "warning" ? "text-amber-600" : "text-slate-500"}`}>
              {form.dolor_escala || 0}/10
            </span>
          </div>
          <input
            type="range"
            name="dolor_escala"
            value={form.dolor_escala || 0}
            onChange={handleChange}
            min="0"
            max="10"
            className="w-full accent-teal-700"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0 Sin dolor</span>
            <span className="text-amber-500">4–6 Moderado</span>
            <span className="text-rose-500">7–10 Severo</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado conciencia</label>
            <select
              name="estado_conciencia"
              value={form.estado_conciencia}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              <option value="alerta">Alerta</option>
              <option value="somnoliento">Somnoliento/a</option>
              <option value="estuporoso">Estuporoso/a</option>
              <option value="coma">Coma</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
            <input
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              placeholder="Notas adicionales..."
              className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>
        </div>

        <FollowUpFields
          enabled={seguimiento}
          fecha={seguimientoFecha}
          turno={seguimientoTurno}
          onToggle={(checked) => {
            setSeguimiento(checked);
            if (checked) {
              const next = nextFollowUpSlot(modal.row.fecha, modal.row.turno);
              setSeguimientoFecha(next.fecha);
              setSeguimientoTurno(next.turno);
            }
          }}
          onFechaChange={setSeguimientoFecha}
          onTurnoChange={setSeguimientoTurno}
          copy="El seguimiento quedará pendiente para reevaluar signos, dolor, conciencia o respuesta clínica en el turno definido."
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60">
            {saving ? "Guardando..." : "Registrar signos"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── SeguimientoModal ────────────────────────────────────────── */

export function SeguimientoModal({ modal, saving, onClose, onSubmit }) {
  const [notas, setNotas] = useState("");
  const [continuar, setContinuar] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(todayIso());
  const [nuevoTurno, setNuevoTurno] = useState(currentTurno());

  useEffect(() => {
    if (!modal) return;
    setNotas("");
    setContinuar(false);
    const next = nextFollowUpSlot(modal.obs.seguimiento_fecha, modal.obs.seguimiento_turno);
    setNuevaFecha(next.fecha);
    setNuevoTurno(next.turno);
  }, [modal]);

  if (!modal) return null;

  const obs = modal.obs;
  const resName = [obs.residentes?.apellido, obs.residentes?.nombre].filter(Boolean).join(", ") || "Residente";
  const tipoLabel = SEGUIMIENTO_TIPO_LABEL[obs.tipo] ?? obs.tipo ?? "Observación";

  return (
    <Modal isOpen={!!modal} onClose={onClose} title="Resolver seguimiento clínico">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ id: obs.id, notas, continuar, nuevaFecha, nuevoTurno });
        }}
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              {tipoLabel}
            </span>
            <span className="text-xs capitalize text-amber-700">
              {obs.seguimiento_turno} · {obs.seguimiento_fecha}
            </span>
          </div>
          <div className="text-sm font-semibold text-amber-950">{resName}</div>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">{obs.descripcion}</p>
          {obs.acciones_tomadas && (
            <p className="mt-1 text-xs text-amber-700">
              <span className="font-medium">Acciones previas: </span>
              {obs.acciones_tomadas}
            </p>
          )}
        </div>

        <div className={`rounded-xl border p-3 text-sm ${continuar ? "border-sky-100 bg-sky-50 text-sky-900" : "border-emerald-100 bg-emerald-50 text-emerald-900"}`}>
          <div className="font-semibold">Qué pasará al guardar</div>
          <p className="mt-1 text-xs leading-relaxed">
            {continuar
              ? "Este seguimiento quedará resuelto y se creará un nuevo pendiente para el turno indicado. La evolución quedará en las acciones tomadas."
              : "El seguimiento quedará marcado como resuelto y cerrado. La evolución quedará en las acciones tomadas de la observación original."}
          </p>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Evolución / acciones tomadas
          <span className="ml-1 text-xs font-normal text-slate-500">(opcional)</span>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={4}
            placeholder="Describe el estado actual, acciones realizadas, respuesta observada..."
            className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <label className="flex items-start gap-2 text-sm text-amber-950">
            <input
              type="checkbox"
              checked={continuar}
              onChange={(e) => {
                setContinuar(e.target.checked);
                if (e.target.checked) {
                  const next = nextFollowUpSlot(obs.seguimiento_fecha, obs.seguimiento_turno);
                  setNuevaFecha(next.fecha);
                  setNuevoTurno(next.turno);
                }
              }}
              className="mt-0.5 h-4 w-4 accent-amber-600"
            />
            <span>
              Continuar seguimiento
              <span className="block text-xs text-amber-800">
                Resuelve este seguimiento y crea uno nuevo para el turno que definas.
              </span>
            </span>
          </label>
          {continuar && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-amber-950">
                Nueva fecha *
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="block text-sm font-medium text-amber-950">
                Nuevo turno *
                <select
                  value={nuevoTurno}
                  onChange={(e) => setNuevoTurno(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                >
                  {CARE_TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${continuar ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-700 hover:bg-emerald-800"}`}
          >
            {saving ? "Guardando..." : continuar ? "Guardar y continuar" : "Finalizar seguimiento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
