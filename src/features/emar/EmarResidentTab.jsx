import { useEffect, useMemo, useState } from "react";
import Modal from "../../components/Modal";
import HelpTooltip from "../../components/HelpTooltip";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import { formatDateOnly } from "../../utils/dateUtils";
import {
  EMAR_TURNOS,
  MED_ROUTES,
  MED_STATUS_LABEL,
  currentTurno,
  getResidentEmar,
  listPendingControlledReconciliations,
  reconcileControlledStock,
  registerStockMovement,
  saveMedicationIndication,
  saveStockLot,
  todayIso,
} from "./emarService";

const INITIAL_INDICATION = {
  medicamento_nombre: "",
  principio_activo: "",
  concentracion: "",
  forma_farmaceutica: "",
  dosis: "",
  unidad_dosis: "unidad",
  via: "oral",
  indicacion: "",
  prescriptor_nombre: "",
  fecha_indicacion: todayIso(),
  fecha_inicio: todayIso(),
  fecha_fin: "",
  estado: "activo",
  es_controlado: false,
  tipo_controlado: "psicotropico",
  requiere_stock: true,
  instrucciones: "",
};

const INITIAL_SCHEDULE = {
  frecuencia: "diaria",
  dias_semana: [1, 2, 3, 4, 5, 6, 7],
  dias_mes: [1],
  fecha_unica: "",
  hora: "09:00",
  turno: "mañana",
  tolerancia_min: 60,
};

const INITIAL_LOT = {
  medicamento_nombre: "",
  lote: "",
  fecha_vencimiento: "",
  cantidad_actual: 0,
  unidad: "unidad",
  ubicacion: "",
  es_controlado: false,
  tipo_controlado: "psicotropico",
  estado: "activo",
};

const WEEK_DAYS = [
  [1, "Lun"],
  [2, "Mar"],
  [3, "Mie"],
  [4, "Jue"],
  [5, "Vie"],
  [6, "Sab"],
  [7, "Dom"],
];

const STOCK_TONE = {
  activo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  agotado: "bg-rose-50 text-rose-700 border-rose-200",
  vencido: "bg-rose-50 text-rose-700 border-rose-200",
  inactivo: "bg-slate-50 text-slate-600 border-slate-200",
};

function formatSchedule(schedule) {
  if (!schedule) return "Sin horario";
  const base = `${schedule.turno} · ${schedule.hora?.slice(0, 5) ?? "--:--"}`;
  if (schedule.frecuencia === "semanal") return `${base} · semanal`;
  if (schedule.frecuencia === "mensual") return `${base} · dia ${schedule.dias_mes?.[0] ?? 1}`;
  if (schedule.frecuencia === "una_vez") return `${base} · ${formatDateOnly(schedule.fecha_unica)}`;
  return `${base} · diaria`;
}

export default function EmarResidentTab({ resident }) {
  const toast = useToast();
  const { can } = useAuth();
  const [data, setData] = useState({ indicaciones: [], lotes: [], administraciones: [] });
  const [pendingReconciliations, setPendingReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [indicationModal, setIndicationModal] = useState(null);
  const [lotModal, setLotModal] = useState(null);
  const [movementModal, setMovementModal] = useState(null);
  const [reconcileModal, setReconcileModal] = useState(null);

  const canCreateIndication = can("crear_indicaciones_medicamentos");
  const canEditIndication = can("editar_indicaciones_medicamentos");
  const canAdjustStock = can("ajustar_stock_medicamentos");
  const canValidate = can("validar_medicamentos_controlados");

  const load = async () => {
    setLoading(true);
    try {
      const [emar, pending] = await Promise.all([
        getResidentEmar(resident.id),
        listPendingControlledReconciliations().catch(() => []),
      ]);
      setData(emar);
      setPendingReconciliations(
        (pending ?? []).filter((item) => item.lote?.residente_id === resident.id)
      );
    } catch (err) {
      console.error(err);
      toast("No se pudo cargar eMAR del residente.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resident.id]);

  const activeIndications = useMemo(
    () => data.indicaciones.filter((item) => item.estado !== "suspendido"),
    [data.indicaciones]
  );

  const controlledLots = useMemo(
    () => data.lotes.filter((lot) => lot.es_controlado),
    [data.lotes]
  );

  const handleSaveIndication = async ({ indication, schedule }) => {
    setSaving(true);
    try {
      await saveMedicationIndication({ residenteId: resident.id, indication, schedule });
      toast("Indicación guardada.", "success");
      setIndicationModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo guardar la indicación.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLot = async ({ lot, indication }) => {
    setSaving(true);
    try {
      await saveStockLot({ residenteId: resident.id, indication, lot });
      toast("Lote guardado con trazabilidad de stock.", "success");
      setLotModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo guardar el lote.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleMovement = async ({ loteId, tipo, cantidad, motivo }) => {
    setSaving(true);
    try {
      await registerStockMovement({ loteId, tipo, cantidad, motivo });
      toast("Movimiento de stock registrado.", "success");
      setMovementModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo registrar el movimiento.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReconcile = async ({ loteId, cantidadFisica, motivo, conciliacionId }) => {
    setSaving(true);
    try {
      await reconcileControlledStock({ loteId, cantidadFisica, motivo, conciliacionId });
      toast(conciliacionId ? "Conciliación validada." : "Conciliación enviada a validación.", "success");
      setReconcileModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo conciliar el stock.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-semibold text-slate-950">eMAR medicamentos</h2>
              <HelpTooltip label="Ayuda: eMAR del residente">
                Las indicaciones generan administraciones por turno. Los medicamentos controlados exigen stock por lote y doble validación.
              </HelpTooltip>
            </div>
            <p className="text-sm text-slate-500">
              Indicaciones activas, horarios, stock por lote y control de psicotrópicos/estupefacientes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreateIndication && (
              <button                type="button"
                onClick={() => setIndicationModal({ indication: INITIAL_INDICATION, schedule: { ...INITIAL_SCHEDULE, turno: currentTurno() } })}
                className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Nueva indicación
              </button>
            )}
            {canAdjustStock && (
              <button                type="button"
                onClick={() => setLotModal({ lot: INITIAL_LOT, indication: activeIndications[0] ?? null })}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Nuevo lote
              </button>
            )}
          </div>
        </div>

        {activeIndications.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            No hay indicaciones activas. Agrega medicamentos habituales, SOS o tratamientos temporales con su horario.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {activeIndications.map((item) => (
              <IndicationRow
                key={item.id}
                item={item}
                canEdit={canEditIndication}
                canAdjustStock={canAdjustStock}
                onEdit={() => setIndicationModal({ indication: item, schedule: item.horarios?.[0] ?? INITIAL_SCHEDULE })}
                onNewLot={() => setLotModal({
                  indication: item,
                  lot: {
                    ...INITIAL_LOT,
                    medicamento_nombre: item.medicamento_nombre,
                    unidad: item.unidad_dosis || "unidad",
                    es_controlado: item.es_controlado,
                    tipo_controlado: item.tipo_controlado || "psicotropico",
                  },
                })}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Stock por lote</h2>
              <p className="text-sm text-slate-500">Entradas, salidas y ajustes quedan auditados por movimiento.</p>
            </div>
            {canAdjustStock && data.lotes.length > 0 && (
              <button                type="button"
                onClick={() => setMovementModal({ lot: data.lotes[0], tipo: "recepcion" })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Movimiento
              </button>
            )}
          </div>

          {data.lotes.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              Sin lotes registrados. El stock se exige al administrar medicamentos controlados o con inventario activo.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {data.lotes.map((lot) => (
                <StockLotRow
                  key={lot.id}
                  lot={lot}
                  canAdjustStock={canAdjustStock}
                  onEdit={() => setLotModal({ lot, indication: activeIndications.find((i) => i.id === lot.indicacion_id) ?? null })}
                  onMove={(tipo) => setMovementModal({ lot, tipo })}
                  onReconcile={() => setReconcileModal({ lot })}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Controlados</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MiniMetric label="Lotes" value={controlledLots.length} />
              <MiniMetric label="Por validar" value={pendingReconciliations.length} tone={pendingReconciliations.length ? "amber" : "emerald"} />
            </div>
            {pendingReconciliations.length > 0 && (
              <div className="mt-3 space-y-2">
                {pendingReconciliations.slice(0, 3).map((item) => (
                  <button
                    type="button"

                    key={item.id}
                    type="button"
                    disabled={!canValidate}
                    onClick={() => setReconcileModal({ reconciliation: item })}
                    className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {item.lote?.medicamento_nombre ?? "Medicamento"} · diferencia {item.diferencia}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Últimas administraciones</h2>
            {data.administraciones.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Aún no hay administraciones registradas.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {data.administraciones.slice(0, 6).map((row) => (
                  <div key={row.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-950">{row.indicacion?.medicamento_nombre}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {MED_STATUS_LABEL[row.estado] ?? row.estado}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDateOnly(row.fecha)} · {row.hora?.slice(0, 5)} · {row.turno}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <IndicationModal
        modal={indicationModal}
        saving={saving}
        onClose={() => !saving && setIndicationModal(null)}
        onSubmit={handleSaveIndication}
      />
      <LotModal
        modal={lotModal}
        indications={activeIndications}
        saving={saving}
        onClose={() => !saving && setLotModal(null)}
        onSubmit={handleSaveLot}
      />
      <MovementModal
        modal={movementModal}
        lots={data.lotes}
        saving={saving}
        onClose={() => !saving && setMovementModal(null)}
        onSubmit={handleMovement}
      />
      <ReconcileModal
        modal={reconcileModal}
        saving={saving}
        onClose={() => !saving && setReconcileModal(null)}
        onSubmit={handleReconcile}
      />
    </div>
  );
}

function IndicationRow({ item, canEdit, canAdjustStock, onEdit, onNewLot }) {
  return (
    <div className="py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
              {item.via}
            </span>
            {item.es_controlado && (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                Controlado
              </span>
            )}
            {item.fecha_fin && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                Hasta {formatDateOnly(item.fecha_fin)}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-950">{item.medicamento_nombre}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {item.dosis} {item.unidad_dosis || ""}{item.concentracion ? ` · ${item.concentracion}` : ""}
          </p>
          {item.instrucciones && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.instrucciones}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {(item.horarios ?? []).filter((h) => h.activo !== false).map((h) => (
              <span key={h.id} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500">
                {formatSchedule(h)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canAdjustStock && (
            <button type="button" onClick={onNewLot} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Lote
            </button>
          )}
          {canEdit && (
            <button type="button" onClick={onEdit} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StockLotRow({ lot, canAdjustStock, onEdit, onMove, onReconcile }) {
  const lowStock = Number(lot.cantidad_actual ?? 0) <= 0;
  const expired = lot.fecha_vencimiento && new Date(`${lot.fecha_vencimiento}T12:00:00`) < new Date();
  const estado = expired ? "vencido" : lowStock ? "agotado" : lot.estado;
  return (
    <div className="py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STOCK_TONE[estado] ?? STOCK_TONE.activo}`}>
              {estado}
            </span>
            {lot.es_controlado && (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                Controlado
              </span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-950">{lot.medicamento_nombre}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Stock {lot.cantidad_actual} {lot.unidad} · lote {lot.lote || "s/l"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Vence {formatDateOnly(lot.fecha_vencimiento)}{lot.ubicacion ? ` · ${lot.ubicacion}` : ""}
          </p>
        </div>
        {canAdjustStock && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={onEdit} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Editar lote
            </button>
            <button type="button" onClick={() => onMove("recepcion")} className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              Ingreso
            </button>
            {!lot.es_controlado && (
              <button type="button" onClick={() => onMove("ajuste")} className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50">
                Ajuste
              </button>
            )}
            {lot.es_controlado && (
              <button type="button" onClick={onReconcile} className="rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800">
                Conciliar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniMetric({ label, value, tone = "slate" }) {
  const cls = {
    slate: "bg-slate-50 text-slate-900",
    amber: "bg-amber-50 text-amber-900",
    emerald: "bg-emerald-50 text-emerald-900",
  }[tone];
  return (
    <div className={`rounded-xl p-3 ${cls}`}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs font-medium opacity-70">{label}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", disabled, required = false, min, max, step }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        step={step}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, disabled, required = false }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        rows={3}
        className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      />
    </label>
  );
}

function ScheduleFields({ schedule, setSchedule, saving }) {
  const toggleDay = (day) => {
    setSchedule((prev) => {
      const set = new Set(prev.dias_semana ?? []);
      if (set.has(day)) set.delete(day); else set.add(day);
      return { ...prev, dias_semana: Array.from(set).sort((a, b) => a - b) };
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 text-sm font-semibold text-slate-950">Horario</div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700">
          Frecuencia
          <select
            value={schedule.frecuencia}
            onChange={(e) => setSchedule((p) => ({ ...p, frecuencia: e.target.value }))}
            disabled={saving}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            <option value="diaria">Diaria</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
            <option value="una_vez">Una vez</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Turno
          <select
            value={schedule.turno}
            onChange={(e) => setSchedule((p) => ({ ...p, turno: e.target.value }))}
            disabled={saving}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            {EMAR_TURNOS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <Field label="Hora" type="time" value={schedule.hora} onChange={(value) => setSchedule((p) => ({ ...p, hora: value }))} disabled={saving} />
        <Field label="Tolerancia (min)" type="number" min="0" step="5" value={schedule.tolerancia_min} onChange={(value) => setSchedule((p) => ({ ...p, tolerancia_min: value }))} disabled={saving} />
      </div>

      {schedule.frecuencia === "semanal" && (
        <div className="mt-3">
          <div className="mb-2 text-sm font-medium text-slate-700">Días</div>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map(([day, label]) => (
              <button
                type="button"

                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  schedule.dias_semana?.includes(day)
                    ? "border-teal-600 bg-teal-50 text-teal-700"
                    : "border-slate-200 text-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {schedule.frecuencia === "mensual" && (
        <div className="mt-3">
          <Field
            label="Día del mes"
            type="number"
            min="1"
            max="31"
            value={schedule.dias_mes?.[0] ?? 1}
            onChange={(value) => setSchedule((p) => ({ ...p, dias_mes: [Math.max(1, Math.min(31, Number(value) || 1))] }))}
            disabled={saving}
          />
        </div>
      )}

      {schedule.frecuencia === "una_vez" && (
        <div className="mt-3">
          <Field label="Fecha única" type="date" value={schedule.fecha_unica} onChange={(value) => setSchedule((p) => ({ ...p, fecha_unica: value }))} disabled={saving} />
        </div>
      )}
    </div>
  );
}

function IndicationModal({ modal, saving, onClose, onSubmit }) {
  const [indication, setIndication] = useState(INITIAL_INDICATION);
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);

  useEffect(() => {
    if (!modal) return;
    setIndication({ ...INITIAL_INDICATION, ...modal.indication });
    setSchedule({
      ...INITIAL_SCHEDULE,
      ...modal.schedule,
      hora: modal.schedule?.hora?.slice(0, 5) ?? INITIAL_SCHEDULE.hora,
      dias_semana: modal.schedule?.dias_semana ?? INITIAL_SCHEDULE.dias_semana,
      dias_mes: modal.schedule?.dias_mes ?? INITIAL_SCHEDULE.dias_mes,
    });
  }, [modal]);

  if (!modal) return null;

  const setControlled = (checked) => {
    setIndication((prev) => ({
      ...prev,
      es_controlado: checked,
      requiere_stock: checked ? true : prev.requiere_stock,
      tipo_controlado: checked ? prev.tipo_controlado || "psicotropico" : "psicotropico",
    }));
  };

  return (
    <Modal isOpen={!!modal} onClose={onClose} title={indication.id ? "Editar indicación" : "Nueva indicación"}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ indication, schedule });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Medicamento" value={indication.medicamento_nombre} onChange={(value) => setIndication((p) => ({ ...p, medicamento_nombre: value }))} disabled={saving} required />
          </div>
          <Field label="Principio activo" value={indication.principio_activo ?? ""} onChange={(value) => setIndication((p) => ({ ...p, principio_activo: value }))} disabled={saving} />
          <Field label="Concentración" value={indication.concentracion ?? ""} onChange={(value) => setIndication((p) => ({ ...p, concentracion: value }))} disabled={saving} />
          <Field label="Dosis" value={indication.dosis} onChange={(value) => setIndication((p) => ({ ...p, dosis: value }))} disabled={saving} required />
          <Field label="Unidad" value={indication.unidad_dosis ?? ""} onChange={(value) => setIndication((p) => ({ ...p, unidad_dosis: value }))} disabled={saving} />
          <label className="block text-sm font-medium text-slate-700">
            Vía
            <select
              value={indication.via}
              onChange={(e) => setIndication((p) => ({ ...p, via: e.target.value }))}
              disabled={saving}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {MED_ROUTES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <Field label="Prescriptor" value={indication.prescriptor_nombre ?? ""} onChange={(value) => setIndication((p) => ({ ...p, prescriptor_nombre: value }))} disabled={saving} />
          <Field label="Inicio" type="date" value={indication.fecha_inicio ?? ""} onChange={(value) => setIndication((p) => ({ ...p, fecha_inicio: value }))} disabled={saving} />
          <Field label="Fin" type="date" value={indication.fecha_fin ?? ""} onChange={(value) => setIndication((p) => ({ ...p, fecha_fin: value }))} disabled={saving} />
          <div className="col-span-2">
            <TextArea label="Instrucciones" value={indication.instrucciones ?? ""} onChange={(value) => setIndication((p) => ({ ...p, instrucciones: value }))} disabled={saving} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={indication.requiere_stock} disabled={saving || indication.es_controlado} onChange={(e) => setIndication((p) => ({ ...p, requiere_stock: e.target.checked }))} className="h-4 w-4 accent-teal-700" />
            Requiere stock
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={indication.es_controlado} disabled={saving} onChange={(e) => setControlled(e.target.checked)} className="h-4 w-4 accent-teal-700" />
            Medicamento controlado
          </label>
        </div>

        {indication.es_controlado && (
          <label className="block text-sm font-medium text-slate-700">
            Tipo controlado
            <select
              value={indication.tipo_controlado}
              onChange={(e) => setIndication((p) => ({ ...p, tipo_controlado: e.target.value }))}
              disabled={saving}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="psicotropico">Psicotrópico</option>
              <option value="estupefaciente">Estupefaciente</option>
            </select>
          </label>
        )}

        <ScheduleFields schedule={schedule} setSchedule={setSchedule} saving={saving} />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !indication.medicamento_nombre?.trim() || !indication.dosis?.trim()} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function LotModal({ modal, indications, saving, onClose, onSubmit }) {
  const [lot, setLot] = useState(INITIAL_LOT);
  const [indicationId, setIndicationId] = useState("");

  useEffect(() => {
    if (!modal) return;
    setLot({ ...INITIAL_LOT, ...modal.lot });
    setIndicationId(modal.indication?.id ?? modal.lot?.indicacion_id ?? "");
  }, [modal]);

  if (!modal) return null;

  const indication = indications.find((item) => item.id === indicationId) ?? modal.indication ?? null;

  return (
    <Modal isOpen={!!modal} onClose={onClose} title={lot.id ? "Editar lote" : "Nuevo lote"}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ lot: { ...lot, indicacion_id: indicationId || null }, indication });
        }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Indicación asociada
          <select
            value={indicationId}
            onChange={(e) => {
              const selected = indications.find((item) => item.id === e.target.value);
              setIndicationId(e.target.value);
              if (selected) {
                setLot((p) => ({
                  ...p,
                  medicamento_nombre: selected.medicamento_nombre,
                  unidad: selected.unidad_dosis || p.unidad,
                  es_controlado: selected.es_controlado,
                  tipo_controlado: selected.tipo_controlado || p.tipo_controlado,
                }));
              }
            }}
            disabled={saving}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Sin asociar</option>
            {indications.map((item) => <option key={item.id} value={item.id}>{item.medicamento_nombre}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Medicamento" value={lot.medicamento_nombre ?? ""} onChange={(value) => setLot((p) => ({ ...p, medicamento_nombre: value }))} disabled={saving} required />
          </div>
          <Field label="Lote" value={lot.lote ?? ""} onChange={(value) => setLot((p) => ({ ...p, lote: value }))} disabled={saving} />
          <Field label="Vencimiento" type="date" value={lot.fecha_vencimiento ?? ""} onChange={(value) => setLot((p) => ({ ...p, fecha_vencimiento: value }))} disabled={saving} />
          {!lot.id && (
            <Field label="Stock inicial" type="number" min="0" step="0.01" value={lot.cantidad_actual} onChange={(value) => setLot((p) => ({ ...p, cantidad_actual: value }))} disabled={saving} />
          )}
          <Field label="Unidad" value={lot.unidad ?? ""} onChange={(value) => setLot((p) => ({ ...p, unidad: value }))} disabled={saving} />
          <Field label="Ubicación" value={lot.ubicacion ?? ""} onChange={(value) => setLot((p) => ({ ...p, ubicacion: value }))} disabled={saving} />
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
          <input type="checkbox" checked={lot.es_controlado} disabled={saving || indication?.es_controlado} onChange={(e) => setLot((p) => ({ ...p, es_controlado: e.target.checked }))} className="h-4 w-4 accent-teal-700" />
          Lote controlado
        </label>
        {lot.id && (
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            La cantidad actual no se edita aquí. Usa Ingreso, Ajuste o Conciliar para conservar auditoría.
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !lot.medicamento_nombre?.trim()} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MovementModal({ modal, lots, saving, onClose, onSubmit }) {
  const [loteId, setLoteId] = useState("");
  const [tipo, setTipo] = useState("recepcion");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (!modal) return;
    setLoteId(modal.lot?.id ?? lots[0]?.id ?? "");
    setTipo(modal.tipo ?? "recepcion");
    setCantidad("");
    setMotivo("");
  }, [modal, lots]);

  if (!modal) return null;

  const selectedLot = lots.find((lot) => lot.id === loteId);
  const movementOptions = selectedLot?.es_controlado
    ? [["recepcion", "Recepción"]]
    : [
        ["recepcion", "Recepción"],
        ["ajuste", "Ajuste"],
        ["reversa", "Reversa"],
        ["merma", "Merma"],
        ["retiro", "Retiro"],
      ];

  return (
    <Modal isOpen={!!modal} onClose={onClose} title="Movimiento de stock">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const value = Number(cantidad);
          const signedQuantity = ["merma", "retiro"].includes(tipo) ? -Math.abs(value) : value;
          onSubmit({ loteId, tipo, cantidad: signedQuantity, motivo });
        }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Lote
          <select
            value={loteId}
            onChange={(e) => {
              const nextId = e.target.value;
              const nextLot = lots.find((lot) => lot.id === nextId);
              setLoteId(nextId);
              if (nextLot?.es_controlado) setTipo("recepcion");
            }}
            disabled={saving}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            {lots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.medicamento_nombre} · lote {lot.lote || "s/l"} · {lot.cantidad_actual} {lot.unidad}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={saving} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
            {movementOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        {selectedLot?.es_controlado && (
          <div className="rounded-xl bg-sky-50 p-3 text-xs text-sky-800">
            Los ajustes de controlados se hacen por Conciliar para exigir segundo usuario.
          </div>
        )}
        <Field label="Cantidad" type="number" min={tipo === "ajuste" ? undefined : "0.01"} step="0.01" value={cantidad} onChange={setCantidad} disabled={saving} required />
        <TextArea label="Motivo" value={motivo} onChange={setMotivo} disabled={saving} required />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !loteId || !cantidad || !motivo.trim()} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {saving ? "Guardando..." : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReconcileModal({ modal, saving, onClose, onSubmit }) {
  const [cantidadFisica, setCantidadFisica] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    setCantidadFisica("");
    setMotivo("");
  }, [modal]);

  if (!modal) return null;

  const isValidation = Boolean(modal.reconciliation);
  const lot = modal.lot ?? modal.reconciliation?.lote;

  return (
    <Modal isOpen={!!modal} onClose={onClose} title={isValidation ? "Validar conciliación" : "Conciliar controlado"}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            loteId: lot?.id ?? null,
            cantidadFisica,
            motivo,
            conciliacionId: modal.reconciliation?.id ?? null,
          });
        }}
      >
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <div className="font-semibold text-slate-950">{lot?.medicamento_nombre ?? "Medicamento"}</div>
          {modal.reconciliation ? (
            <div className="mt-1 text-xs text-slate-500">
              Sistema {modal.reconciliation.cantidad_sistema} · físico {modal.reconciliation.cantidad_fisica} · diferencia {modal.reconciliation.diferencia}
            </div>
          ) : (
            <div className="mt-1 text-xs text-slate-500">
              Stock sistema {lot?.cantidad_actual} {lot?.unidad}. La diferencia quedará pendiente de segundo usuario.
            </div>
          )}
        </div>
        {!isValidation && (
          <Field label="Cantidad física contada" type="number" min="0" step="0.01" value={cantidadFisica} onChange={setCantidadFisica} disabled={saving} required />
        )}
        <TextArea label={isValidation ? "Nota de validación" : "Motivo / acta breve"} value={motivo} onChange={setMotivo} disabled={saving} required={!isValidation} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={saving || (!isValidation && (cantidadFisica === "" || !motivo.trim()))} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {saving ? "Guardando..." : isValidation ? "Validar" : "Enviar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
