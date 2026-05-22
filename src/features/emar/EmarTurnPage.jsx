import { useEffect, useMemo, useState } from "react";
import PageLayout from "../../layout/PageLayout";
import Modal from "../../components/Modal";
import HelpTooltip from "../../components/HelpTooltip";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import {
  EMAR_TURNOS,
  MED_STATUS_LABEL,
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

const STATUS_TONE = {
  pendiente: "bg-amber-50 text-amber-800 border-amber-200",
  administrado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  validado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  omitido: "bg-rose-50 text-rose-700 border-rose-200",
  pendiente_validacion: "bg-sky-50 text-sky-700 border-sky-200",
  revertido: "bg-slate-50 text-slate-600 border-slate-200",
  cancelado: "bg-slate-50 text-slate-600 border-slate-200",
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

function actionGuidance(metrics) {
  if (metrics.vencidas > 0) return "Primero resuelve administraciones vencidas o arrastradas.";
  if (metrics.pendiente_validacion > 0) return "Luego valida controlados con un segundo usuario autorizado.";
  if (metrics.pendiente > 0) return "Continúa administrando u omitiendo cada indicación pendiente.";
  return "Turno eMAR sin pendientes operativos para este filtro de fecha y turno.";
}

export default function EmarTurnPage() {
  const toast = useToast();
  const { can, profile } = useAuth();
  const [fecha, setFecha] = useState(todayIso());
  const [turno, setTurno] = useState(currentTurno());
  const [estado, setEstado] = useState("pendiente");
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
      setError("No pudimos cargar el eMAR del turno.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, turno]);

  const visibleRows = useMemo(() => {
    if (estado === "todas") return rows;
    return rows.filter((row) => row.estado === estado);
  }, [estado, rows]);

  const metrics = useMemo(() => {
    return rows.reduce((acc, row) => {
      acc.total += 1;
      acc[row.estado] = (acc[row.estado] ?? 0) + 1;
      if (row.indicacion?.es_controlado) acc.controlados += 1;
      if (isMedicationOverdue(row)) acc.vencidas += 1;
      return acc;
    }, { total: 0, pendiente: 0, administrado: 0, omitido: 0, pendiente_validacion: 0, validado: 0, controlados: 0, vencidas: 0 });
  }, [rows]);

  const handleSubmit = async (payload) => {
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
      setModal(null);
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
      title="eMAR"
      eyebrow="Medicamentos"
      description="Administración del turno, stock y controlados con doble validación."
      actions={
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          Generar / actualizar
        </button>
      }
      className="space-y-5"
    >
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_160px_160px_180px]">
        <div className="rounded-xl bg-sky-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-700">
            Prioridad eMAR
            <HelpTooltip label="Ayuda: eMAR">
              Al cargar esta vista se generan las administraciones programadas del turno. La generación es idempotente: reintentar no duplica registros.
            </HelpTooltip>
          </div>
          <div className="mt-1 text-sm font-semibold text-sky-950">
            {actionGuidance(metrics)}
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
            {EMAR_TURNOS.map((item) => <option key={item} value={item}>{item}</option>)}
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
            <option value="pendiente_validacion">Por validar</option>
            <option value="administrado">Administrados</option>
            <option value="omitido">Omitidos</option>
            <option value="todas">Todas</option>
          </select>
        </label>
      </section>

      <EmarWorkflowGuide metrics={metrics} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric label="Total" value={metrics.total} />
        <Metric label="Pendientes" value={metrics.pendiente} tone="amber" />
        <Metric label="Vencidas" value={metrics.vencidas} tone="rose" />
        <Metric label="Por validar" value={metrics.pendiente_validacion} tone="sky" />
        <Metric label="Controlados" value={metrics.controlados} tone="rose" />
        <Metric label="Omitidos" value={metrics.omitido} tone="rose" />
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
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-sky-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-sky-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-950">Sin administraciones para este filtro</h2>
            <p className="mt-1 text-sm text-slate-500">
              Configura indicaciones y horarios desde la ficha del residente en la pestaña eMAR.
            </p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="p-8 text-center">
            <h2 className="text-sm font-semibold text-slate-950">No hay registros en este estado</h2>
            <p className="mt-1 text-sm text-slate-500">
              El turno tiene administraciones cargadas, pero ninguna coincide con el filtro seleccionado.
            </p>
            <button
              type="button"
              onClick={() => setEstado("todas")}
              className="mt-4 text-sm font-semibold text-teal-700 hover:underline"
            >
              Ver todas las administraciones
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
        onClose={() => !saving && setModal(null)}
        onSubmit={handleSubmit}
      />
    </PageLayout>
  );
}

function EmarWorkflowGuide({ metrics }) {
  const steps = [
    {
      title: "1. Programar",
      text: "Las indicaciones activas del residente crean dosis por fecha, turno y horario.",
      tone: "border-slate-200 bg-white text-slate-700",
    },
    {
      title: "2. Administrar u omitir",
      text: "Administrar descuenta stock si corresponde; omitir exige motivo y puede abrir seguimiento.",
      tone: metrics.pendiente || metrics.vencidas ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-700",
    },
    {
      title: "3. Validar controlados",
      text: "Controlados o doble validación quedan pendientes para un segundo usuario autorizado.",
      tone: metrics.pendiente_validacion ? "border-sky-200 bg-sky-50 text-sky-900" : "border-slate-200 bg-white text-slate-700",
    },
    {
      title: "4. Cerrar turno",
      text: "Revisa arrastres, notas y controlados antes de entregar el turno.",
      tone: metrics.vencidas ? "border-rose-200 bg-rose-50 text-rose-900" : "border-slate-200 bg-white text-slate-700",
    },
  ];

  return (
    <section className="grid gap-3 lg:grid-cols-4">
      {steps.map((step) => (
        <div key={step.title} className={`rounded-2xl border p-4 shadow-sm ${step.tone}`}>
          <div className="text-sm font-semibold">{step.title}</div>
          <p className="mt-1 text-sm opacity-80">{step.text}</p>
        </div>
      ))}
    </section>
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
              {MED_STATUS_LABEL[row.estado] ?? row.estado}
            </span>
            {row.indicacion?.es_controlado && (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                Controlado
              </span>
            )}
            {row.indicacion?.requiere_doble_validacion && (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                Doble validación
              </span>
            )}
            {needsStock && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Requiere stock
              </span>
            )}
            {overdue && (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                {row._arrastre ? "Arrastre" : "Vencido"}
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
        <div className="flex shrink-0 flex-wrap justify-start gap-2 lg:justify-end">
          {row.estado === "pendiente" && canAdminister && (
            <>
              <button
                type="button"
                onClick={() => onAction("administrado")}
                className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Administrar
              </button>
              <button
                type="button"
                onClick={() => onAction("omitido")}
                className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
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
              className="rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800"
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

function Metric({ label, value, tone = "slate" }) {
  const cls = {
    slate: "bg-white text-slate-900 border-slate-200",
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    sky: "bg-sky-50 text-sky-900 border-sky-200",
    rose: "bg-rose-50 text-rose-900 border-rose-200",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs font-medium opacity-70">{label}</div>
    </div>
  );
}

function EmarActionModal({ modal, saving, onClose, onSubmit }) {
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
            dosis,
            loteId: needsLot ? loteId : null,
          });
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
              {OMISSION_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={seguimiento}
              onChange={(e) => setSeguimiento(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-teal-700"
            />
            <span>
              Crear observación con seguimiento
              <span className="block text-xs text-slate-500">
                Úsalo si la administración u omisión requiere control posterior del equipo.
              </span>
            </span>
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
