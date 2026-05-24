import { useEffect, useMemo, useState } from "react";
import PageLayout from "../../layout/PageLayout";
import Modal from "../../components/Modal";
import HelpTooltip from "../../components/HelpTooltip";
import CollapsibleGuide from "../../components/CollapsibleGuide";
import MetricCard from "../../components/MetricCard";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { useAuth } from "../../context/AuthContext";
import useSessionFormDraft from "../../hooks/useSessionFormDraft";
import {
  EMAR_TURNOS,
  OMISSION_REASONS,
  administerMedication,
  currentTurno,
  isMedicationOverdue,
  listAvailableLots,
  listMedicationAdministrations,
  medicationDueAt,
  todayIso,
  validateControlledAdministration,
} from "./emarService";
import {
  MEDICINE_FILTER_LABEL,
  MEDICINE_STATUS_LABEL,
  buildMedicationMetrics,
  getStockLotStatus,
  getMedicationTurnFocus,
  matchesMedicationFilter,
  sortMedicationRowsByFocus,
} from "./emarUi";

const STATUS_TONE = {
  pendiente: "bg-amber-50 text-amber-800 border-amber-200",
  administrado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  validado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  omitido: "bg-rose-50 text-rose-700 border-rose-200",
  pendiente_validacion: "bg-sky-50 text-sky-700 border-sky-200",
  revertido: "bg-slate-50 text-slate-600 border-slate-200",
  cancelado: "bg-slate-50 text-slate-600 border-slate-200",
};

const FOCUS_TONE = {
  rose:    { bg: "bg-rose-50",    label: "text-rose-700",    title: "text-rose-950",    detail: "text-rose-700" },
  amber:   { bg: "bg-amber-50",   label: "text-amber-700",   title: "text-amber-950",   detail: "text-amber-700" },
  sky:     { bg: "bg-sky-50",     label: "text-sky-700",     title: "text-sky-950",     detail: "text-sky-700" },
  emerald: { bg: "bg-emerald-50", label: "text-emerald-700", title: "text-emerald-950", detail: "text-emerald-700" },
};

function residentName(row) {
  const r = row.residentes;
  return [r?.apellido, r?.nombre].filter(Boolean).join(", ") || "Residente";
}

function formatTime(value) {
  return value?.slice?.(0, 5) ?? "--:--";
}

function formatDueWindow(row) {
  const dueAt = medicationDueAt(row);
  if (!dueAt) return null;
  return dueAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export default function EmarTurnPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { can, profile } = useAuth();
  const [fecha, setFecha] = useState(todayIso());
  const [turno, setTurno] = useState(currentTurno());
  const [estado, setEstado] = useState("ahora");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const canAdminister = can("administrar_medicamentos");
  const canValidate = can("validar_medicamentos_controlados");
  const currentUserId = profile?.id ?? null;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listMedicationAdministrations({
        fecha,
        turno,
        estado: null,
      });
      setRows(data);
    } catch (err) {
      console.error(err);
    setError("No pudimos cargar los medicamentos del turno.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, turno]);

  const visibleRows = useMemo(() => {
    return sortMedicationRowsByFocus(
      rows.filter((row) => matchesMedicationFilter(row, estado, isMedicationOverdue)),
      isMedicationOverdue,
    );
  }, [estado, rows]);

  const metrics = useMemo(() => {
    return buildMedicationMetrics(rows, isMedicationOverdue);
  }, [rows]);

  const focus = getMedicationTurnFocus(metrics);
  const focusTone = FOCUS_TONE[focus.tone] ?? FOCUS_TONE.emerald;

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (payload.action === "validar") {
        await validateControlledAdministration({ id: payload.row.id, notas: payload.notas });
        toast("Registro de medicamento validado.", "success");
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
      setModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo guardar el registro de medicamento.", "error");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Medicamentos del turno"
      eyebrow="Administración"
      description="Qué administrar ahora, omisiones, stock y registros por validar."
      actions={
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          <svg className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Actualizar
        </button>
      }
      className="space-y-5"
    >
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_160px_160px]">
        <div className={`rounded-xl p-3 ${focusTone.bg}`}>
          <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${focusTone.label}`}>
            Qué hacer ahora
            <HelpTooltip label="Ayuda: medicamentos del turno">
              Al abrir esta vista se crean las administraciones programadas del turno. Reintentar no duplica registros.
            </HelpTooltip>
          </div>
          <div className={`mt-1 text-sm font-semibold ${focusTone.title}`}>
            {focus.title}
          </div>
          <p className={`mt-1 text-xs ${focusTone.detail}`}>
            {focus.detail}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(MEDICINE_FILTER_LABEL).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setEstado(value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  estado === value
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
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
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm capitalize outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            {EMAR_TURNOS.map((item) => <option key={item} value={item} className="capitalize">{item}</option>)}
          </select>
        </label>
      </section>

      <CollapsibleGuide
        storageKey="emarTurn"
        title="¿Cómo funciona la administración por turno?"
        steps={[
          {
            title: "Revisar",
            text: "Las indicaciones activas del residente crean dosis por fecha, turno y horario.",
          },
          {
            title: "Administrar u omitir",
            text: "Administrar descuenta stock si corresponde; omitir exige motivo y deja el registro auditado.",
            tone: metrics.pendientes || metrics.vencidas ? "border-amber-200 bg-amber-50" : null,
          },
          {
            title: "Confirmar segunda firma",
            text: "Algunos medicamentos quedan pendientes para un segundo usuario autorizado.",
            tone: metrics.porValidar ? "border-sky-200 bg-sky-50" : null,
          },
          {
            title: "Cerrar turno",
            text: "Revisa pendientes del turno anterior, notas y registros por validar antes de entregar.",
            tone: metrics.vencidas ? "border-rose-200 bg-rose-50" : null,
          },
        ]}
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Pendientes" value={metrics.pendientes} tone="amber" tooltip="Dosis del turno aún por administrar." />
        <MetricCard label="Vencidas" value={metrics.vencidas} tone="rose" tooltip="Dosis que pasaron su hora o ventana de tolerancia." />
        <MetricCard label="Por validar" value={metrics.porValidar} tone="sky" tooltip="Administraciones que necesitan confirmación de un segundo usuario." />
        <MetricCard label="Doble firma" value={metrics.controlados} tone="slate" tooltip="Medicamentos que exigen lote identificado y confirmación de un segundo usuario." />
        <MetricCard label="Omitidos" value={metrics.omitidas} tone="rose" tooltip="Dosis no administradas con motivo registrado." />
        <MetricCard label="Total" value={metrics.total} tooltip="Total de dosis programadas en el turno." />
      </section>

      {error && (
        <div className="flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="self-start rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 sm:self-auto"
          >
            Reintentar
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-sky-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-sky-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-950">Sin medicamentos para este turno</h2>
            <p className="mt-1 text-sm text-slate-500">
              Configura indicaciones y horarios desde la ficha del residente, pestaña Medicamentos.
            </p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="p-8 text-center">
            <h2 className="text-sm font-semibold text-slate-950">No hay registros en este estado</h2>
            <p className="mt-1 text-sm text-slate-500">
              El turno tiene medicamentos cargados, pero ninguno coincide con el filtro seleccionado.
            </p>
            <button
              type="button"
              onClick={() => setEstado("todas")}
              className="mt-4 text-sm font-semibold text-teal-700 hover:underline"
            >
              Ver todos los medicamentos
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visibleRows.map((row) => (
              <EmarRow
                key={row.id}
                row={row}
                currentUserId={currentUserId}
                canAdminister={canAdminister}
                canValidate={canValidate}
                onAction={(action) => setModal({ action, row })}
              />
            ))}
          </ul>
        )}
      </section>

      <EmarActionModal
        modal={modal}
        saving={saving}
        confirm={confirm}
        onClose={() => !saving && setModal(null)}
        onSubmit={handleSubmit}
      />
    </PageLayout>
  );
}

function EmarRow({ row, currentUserId, canAdminister, canValidate, onAction }) {
  const overdue = isMedicationOverdue(row);
  const canValidateThis = canValidate && row.administrado_por !== currentUserId;
  const needsStock = row.indicacion?.requiere_stock || row.indicacion?.es_controlado;
  const dueWindow = formatDueWindow(row);

  return (
    <li className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[row.estado]}`}>
              {MEDICINE_STATUS_LABEL[row.estado] ?? row.estado}
            </span>
            {row.indicacion?.es_controlado && (
              <span
                className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                title="Medicamento controlado: requiere lote identificado y confirmación de un segundo usuario."
              >
                Requiere doble firma
              </span>
            )}
            {row.indicacion?.requiere_doble_validacion && !row.indicacion?.es_controlado && (
              <span
                className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700"
                title="Necesita que un segundo usuario confirme antes de cerrar."
              >
                Segunda firma
              </span>
            )}
            {needsStock && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Requiere stock
              </span>
            )}
            {overdue && (
              <span
                className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                title={row._arrastre ? "Dosis pendiente de un turno anterior que se mantuvo abierta." : "Pasó la hora o la ventana de tolerancia."}
              >
                {row._arrastre ? "Pendiente anterior" : "Vencido"}
              </span>
            )}
            <span className="text-xs font-medium text-slate-500">
              {row._arrastre ? `${row.fecha} · ` : ""}{formatTime(row.hora)}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-950">
            {row.indicacion?.medicamento_nombre}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {residentName(row)} · {row.indicacion?.dosis} · vía {row.indicacion?.via}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {dueWindow && row.estado === "pendiente" && (
              <span>Ventana hasta {dueWindow}</span>
            )}
            {row.residentes?.ubicacion_label && <span>{row.residentes.ubicacion_label}</span>}
            {row.lote && (
              <span>
                Lote {row.lote.lote || "s/l"} · stock actual {row.lote.cantidad_actual} {row.lote.unidad}
              </span>
            )}
          </div>
          {row.indicacion?.instrucciones && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-500">{row.indicacion.instrucciones}</p>
          )}
          {row.estado === "pendiente_validacion" && (
            <p className="mt-2 text-xs text-sky-700">
              Espera validación de un usuario distinto al que registró la administración.
            </p>
          )}
          {row.motivo_omision && (
            <p className="mt-2 text-xs text-rose-700">Motivo de omisión: {row.motivo_omision}</p>
          )}
          {row.notas && <p className="mt-1 text-xs text-slate-400">Notas: {row.notas}</p>}
        </div>
        <div className="flex w-full shrink-0 flex-wrap justify-start gap-2 lg:w-auto lg:justify-end">
          {row.estado === "pendiente" && canAdminister && (
            <>
              <button
                type="button"
                onClick={() => onAction("administrado")}
                className="min-w-[7rem] flex-1 rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 sm:flex-none"
              >
                Administrar
              </button>
              <button
                type="button"
                onClick={() => onAction("omitido")}
                className="min-w-[7rem] flex-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 sm:flex-none"
              >
                Omitir
              </button>
            </>
          )}
          {row.estado === "pendiente" && !canAdminister && (
            <span className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">
              Sin permiso para administrar
            </span>
          )}
          {row.estado === "pendiente_validacion" && canValidateThis && (
            <button
              type="button"
              onClick={() => onAction("validar")}
              className="min-w-[7rem] flex-1 rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 sm:flex-none"
            >
              Validar
            </button>
          )}
          {row.estado === "pendiente_validacion" && canValidate && !canValidateThis && (
            <span className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
              Requiere otro validador
            </span>
          )}
          {row.estado === "pendiente_validacion" && !canValidate && (
            <span className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">
              Sin permiso para validar
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function EmarActionModal({ modal, saving, confirm, onClose, onSubmit }) {
  const draftKey = modal?.row?.id ? `fe_medication_action_${modal.action}_${modal.row.id}` : "fe_medication_action_empty";
  const [draft, setDraft, resetDraft, dirty] = useSessionFormDraft(draftKey, {
    notas: "",
    motivo: "rechazo",
    seguimiento: false,
    dosis: "1",
    loteId: "",
  });
  const [lots, setLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(false);

  useEffect(() => {
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
        setDraft((prev) => ({ ...prev, loteId: prev.loteId || rows[0]?.id || "" }));
      })
      .finally(() => setLoadingLots(false));
  }, [modal, setDraft]);

  if (!modal) return null;

  const isOmission = modal.action === "omitido";
  const isValidation = modal.action === "validar";
  const needsLot = modal.action === "administrado" && (modal.row.indicacion?.es_controlado || modal.row.indicacion?.requiere_stock);
  const unitLabel = modal.row.indicacion?.unidad_dosis || "unidad";
  const handleClose = async () => {
    if (dirty) {
      const ok = await confirm({
        title: "Descartar cambios",
        message: "Hay cambios sin guardar en este registro de medicamento.",
        confirmText: "Descartar",
        cancelText: "Seguir editando",
        danger: true,
      });
      if (!ok) return;
    }
    onClose();
  };

  const actionCopy = isValidation
    ? "Confirma la administración como segundo usuario. Esta acción firma la validación y cierra el pendiente."
    : isOmission
      ? "Registra que la dosis no se administró. No descuenta stock y exige un motivo para la continuidad clínica."
      : modal.row.indicacion?.es_controlado || modal.row.indicacion?.requiere_doble_validacion
        ? "Descuenta stock del lote seleccionado y deja la administración pendiente para un segundo usuario."
        : needsLot
          ? "Descuenta stock del lote seleccionado y marca la administración como realizada."
          : "Marca la administración como realizada. No hay descuento de stock configurado para esta indicación.";

  return (
    <Modal
      isOpen={!!modal}
      onClose={handleClose}
      title={isValidation ? "Validar registro" : isOmission ? "Registrar omisión" : "Administrar medicamento"}
      closeOnBackdrop={false}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await onSubmit({
              action: modal.action,
              row: modal.row,
              notas: draft.notas,
              motivo: isOmission ? draft.motivo : null,
              seguimiento: draft.seguimiento,
              dosis: draft.dosis,
              loteId: needsLot ? draft.loteId : null,
            });
            resetDraft();
          } catch {
            // The parent already shows the user-facing error. Keep the draft.
          }
        }}
      >
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-950">{modal.row.indicacion?.medicamento_nombre}</div>
          <div className="text-xs text-slate-500">
            {residentName(modal.row)} · {modal.row.indicacion?.dosis} · {formatTime(modal.row.hora)}
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
              value={draft.loteId}
              onChange={(e) => setDraft((prev) => ({ ...prev, loteId: e.target.value }))}
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
                  {getStockLotStatus(lot).key === "por_vencer" ? " · por vencer" : ""}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              Medicamentos descuenta esta cantidad del lote al guardar. Si requiere segundo usuario, el movimiento queda pendiente de validación.
            </span>
          </label>
        )}
        {needsLot && !loadingLots && lots.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {modal.row.indicacion?.es_controlado
              ? "No hay un lote disponible para administrar esta indicación. Registra un nuevo lote o usa otro lote activo desde la ficha del residente, pestaña Medicamentos."
              : "No hay stock disponible para este medicamento. Registra un lote con cantidad disponible desde la ficha del residente, pestaña Medicamentos."}
          </div>
        )}

        {modal.action === "administrado" && (
          <label className="block text-sm font-medium text-slate-700">
            Cantidad administrada ({unitLabel})
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={draft.dosis}
              onChange={(e) => setDraft((prev) => ({ ...prev, dosis: e.target.value }))}
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
              value={draft.motivo}
              onChange={(e) => setDraft((prev) => ({ ...prev, motivo: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {OMISSION_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Notas
          <textarea
            value={draft.notas}
            onChange={(e) => setDraft((prev) => ({ ...prev, notas: e.target.value }))}
            rows={4}
            placeholder={isValidation ? "Validación de segundo usuario..." : "Detalle breve para continuidad clínica..."}
            className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        {!isValidation && (
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.seguimiento}
              onChange={(e) => setDraft((prev) => ({ ...prev, seguimiento: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-teal-700"
            />
            <span>
              Dejar seguimiento pendiente
              <span className="block text-xs text-slate-500">
                Úsalo si el equipo debe revisar respuesta, omisión o continuidad en otro turno.
              </span>
            </span>
          </label>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={saving} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto">
            Cancelar
          </button>
          <button type="submit" disabled={saving || (needsLot && (!draft.loteId || lots.length === 0))} className="w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 sm:w-auto">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
