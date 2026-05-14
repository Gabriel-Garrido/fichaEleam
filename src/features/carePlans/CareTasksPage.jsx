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
  OMISSION_REASONS as CARE_OMISSION_REASONS,
  completeCareTask,
  currentTurno,
  listCareTasks,
  todayIso,
} from "./carePlansService";
import {
  MED_STATUS_LABEL,
  OMISSION_REASONS as MED_OMISSION_REASONS,
  administerMedication,
  listAvailableLots,
  listMedicationAdministrations,
  validateControlledAdministration,
} from "../emar/emarService";

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

const PRIORITY_LABEL = { baja: "Baja", media: "Media", alta: "Alta", urgente: "Urgente" };
const PRIORITY_TONE = {
  baja: "bg-slate-100 text-slate-600",
  media: "bg-sky-50 text-sky-700",
  alta: "bg-amber-50 text-amber-800",
  urgente: "bg-rose-50 text-rose-700",
};

const FILTER_LABEL = {
  pendientes: "Pendientes",
  vencidas: "Vencidas",
  cerradas: "Cerradas",
  todas: "Todas",
};

function residentName(residente) {
  return [residente?.apellido, residente?.nombre].filter(Boolean).join(", ") || "Residente";
}

function isRowOverdue(row, pendingStatus = "pendiente") {
  if (row._arrastre) return true;
  if (row.estado !== pendingStatus || row.fecha !== todayIso() || !row.hora) return false;
  const due = new Date(`${row.fecha}T${row.hora}`);
  return !Number.isNaN(due.valueOf()) && due < new Date();
}

function normalizeCareTask(row) {
  return {
    key: `care:${row.id}`,
    source: "care",
    row,
    fecha: row.fecha,
    hora: row.hora,
    estado: row.estado,
    title: row.actividad?.titulo ?? "Actividad de cuidado",
    resident: row.residentes,
    statusLabel: CARE_STATUS_LABEL[row.estado] ?? row.estado,
    typeLabel: "Cuidado",
    meta: CARE_CATEGORY_LABEL[row.actividad?.categoria] ?? row.actividad?.categoria ?? "Plan de cuidado",
    detail: row.actividad?.instrucciones,
    priority: row.actividad?.prioridad ?? "media",
    overdue: isRowOverdue(row),
    carry: row._arrastre === true,
  };
}

function normalizeMedication(row) {
  return {
    key: `med:${row.id}`,
    source: "med",
    row,
    fecha: row.fecha,
    hora: row.hora,
    estado: row.estado,
    title: row.indicacion?.medicamento_nombre ?? "Medicamento",
    resident: row.residentes,
    statusLabel: MED_STATUS_LABEL[row.estado] ?? row.estado,
    typeLabel: "eMAR",
    meta: [row.indicacion?.dosis, row.indicacion?.via ? `vía ${row.indicacion.via}` : null].filter(Boolean).join(" · "),
    detail: row.lote
      ? `Lote ${row.lote.lote || "s/l"} · stock ${row.lote.cantidad_actual} ${row.lote.unidad}`
      : row.indicacion?.requiere_stock ? "Requiere stock al administrar" : null,
    priority: row.indicacion?.es_controlado ? "urgente" : "alta",
    overdue: isRowOverdue(row),
    carry: row._arrastre === true,
    controlled: row.indicacion?.es_controlado === true,
  };
}

function matchesFilter(item, filter) {
  if (filter === "todas") return true;
  if (filter === "vencidas") return item.overdue;
  if (filter === "pendientes") {
    return item.estado === "pendiente" || item.estado === "pendiente_validacion";
  }
  if (filter === "cerradas") {
    return ["cumplida", "omitida", "cancelada", "administrado", "validado", "omitido", "cancelado"].includes(item.estado);
  }
  return true;
}

function matchesType(item, type) {
  if (type === "todos") return true;
  if (type === "cuidado") return item.source === "care";
  return item.source === "med";
}

export default function CareTasksPage() {
  const toast = useToast();
  const { can } = useAuth();
  const [fecha, setFecha] = useState(todayIso());
  const [turno, setTurno] = useState(currentTurno());
  const [filter, setFilter] = useState("pendientes");
  const [type, setType] = useState("todos");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [careModal, setCareModal] = useState(null);
  const [medModal, setMedModal] = useState(null);

  const canComplete = can("completar_tareas_cuidado");
  const canAdminister = can("administrar_medicamentos");
  const canValidate = can("validar_medicamentos_controlados");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [careRows, medRows] = await Promise.all([
        listCareTasks({ fecha, turno, estado: null, limit: 500 }),
        listMedicationAdministrations({ fecha, turno, estado: null, limit: 500 }),
      ]);
      const normalized = [
        ...careRows.map(normalizeCareTask),
        ...medRows.map(normalizeMedication),
      ]
        .filter((item) => matchesType(item, type))
        .filter((item) => matchesFilter(item, filter))
        .sort((a, b) => `${a.fecha}T${a.hora ?? "00:00"}`.localeCompare(`${b.fecha}T${b.hora ?? "00:00"}`));
      setItems(normalized);
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
  }, [fecha, turno, filter, type]);

  const metrics = useMemo(() => {
    return items.reduce((acc, item) => {
      acc.total += 1;
      if (item.source === "care") acc.cuidado += 1;
      if (item.source === "med") acc.medicamentos += 1;
      if (item.estado === "pendiente" || item.estado === "pendiente_validacion") acc.pendientes += 1;
      if (item.estado === "pendiente_validacion") acc.porValidar += 1;
      if (item.overdue) acc.vencidas += 1;
      return acc;
    }, { total: 0, pendientes: 0, vencidas: 0, cuidado: 0, medicamentos: 0, porValidar: 0 });
  }, [items]);

  const handleCareClose = async ({ action, notas, motivo, seguimiento }) => {
    if (!careModal) return;
    setSaving(true);
    try {
      await completeCareTask({
        id: careModal.row.id,
        estado: action,
        notas,
        motivoOmision: motivo,
        requiereSeguimiento: seguimiento,
      });
      toast(action === "cumplida" ? "Tarea marcada como cumplida." : "Omisión registrada.", "success");
      setCareModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast("No se pudo cerrar la tarea.", "error");
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

  return (
    <PageLayout
      title="Tareas diarias"
      eyebrow="Turno operativo"
      description="Plan de cuidado y medicamentos programados, generados automáticamente por recurrencia."
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
          </select>
        </label>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric label="Total" value={metrics.total} />
        <Metric label="Pendientes" value={metrics.pendientes} tone="amber" />
        <Metric label="Vencidas" value={metrics.vencidas} tone="rose" />
        <Metric label="Cuidado" value={metrics.cuidado} tone="teal" />
        <Metric label="eMAR" value={metrics.medicamentos} tone="sky" />
        <Metric label="Por validar" value={metrics.porValidar} tone="sky" />
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
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-teal-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-950">Sin tareas para este filtro</h2>
            <p className="mt-1 text-sm text-slate-500">
              Configura actividades en Plan de cuidado o indicaciones en eMAR desde la ficha del residente.
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
                onCareAction={(action) => setCareModal({ action, row: item.row })}
                onMedicationAction={(action) => setMedModal({ action, row: item.row })}
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
      <MedicationTaskModal
        modal={medModal}
        saving={saving}
        onClose={() => !saving && setMedModal(null)}
        onSubmit={handleMedicationSubmit}
      />
    </PageLayout>
  );
}

function WorkItemRow({ item, canComplete, canAdminister, canValidate, onCareAction, onMedicationAction }) {
  const isCare = item.source === "care";
  return (
    <li className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${isCare ? "border-teal-200 bg-teal-50 text-teal-700" : "border-sky-200 bg-sky-50 text-sky-700"}`}>
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
          {item.row.notas && <p className="mt-1 text-xs text-slate-400">Notas: {item.row.notas}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {isCare && item.estado === "pendiente" && canComplete && (
            <>
              <button type="button" onClick={() => onCareAction("cumplida")} className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                Cumplir
              </button>
              <button type="button" onClick={() => onCareAction("omitida")} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                Omitir
              </button>
            </>
          )}
          {!isCare && item.estado === "pendiente" && canAdminister && (
            <>
              <button type="button" onClick={() => onMedicationAction("administrado")} className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                Administrar
              </button>
              <button type="button" onClick={() => onMedicationAction("omitido")} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                Omitir
              </button>
            </>
          )}
          {!isCare && item.estado === "pendiente_validacion" && canValidate && (
            <button type="button" onClick={() => onMedicationAction("validar")} className="rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800">
              Validar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function Metric({ label, value, tone = "slate" }) {
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
            {modal.row.actividad?.titulo}
          </div>
          <div className="text-xs text-slate-500">{residentName(modal.row.residentes)}</div>
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

function MedicationTaskModal({ modal, saving, onClose, onSubmit }) {
  const [notas, setNotas] = useState("");
  const [motivo, setMotivo] = useState("rechazo");
  const [seguimiento, setSeguimiento] = useState(false);
  const [dosis, setDosis] = useState("1");
  const [loteId, setLoteId] = useState("");
  const [lots, setLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(false);

  useEffect(() => {
    setNotas("");
    setMotivo("rechazo");
    setSeguimiento(false);
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
                </option>
              ))}
            </select>
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
            Cantidad administrada para descontar stock
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={dosis}
              onChange={(e) => setDosis(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
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
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={seguimiento}
              onChange={(e) => setSeguimiento(e.target.checked)}
              className="h-4 w-4 accent-teal-700"
            />
            Crear observación con seguimiento
          </label>
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
