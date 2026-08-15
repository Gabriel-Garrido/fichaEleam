import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import HelpTooltip from "../../components/HelpTooltip";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { useAuth } from "../../context/AuthContext";
import useSessionFormDraft from "../../hooks/useSessionFormDraft";
import { formatDateOnly } from "../../utils/dateUtils";
import {
  EMAR_TURNOS,
  MED_ROUTES,
  currentTurno,
  getMedicationPrescriptionUrl,
  getResidentEmar,
  listPendingControlledReconciliations,
  reconcileControlledStock,
  registerStockMovement,
  saveMedicationIndication,
  saveStockLot,
  todayIso,
} from "./emarService";
import MedicationPrescriptionModal from "./MedicationPrescriptionModal";
import {
  buildStockLotAlerts,
  DEFAULT_MEDICATION_INDICATION,
  DEFAULT_MEDICATION_SCHEDULE,
  DEFAULT_STOCK_LOT,
  MEDICINE_STATUS_LABEL,
  getStockLotStatus,
  hasValidationErrors,
  summarizeMedicationSchedule,
  validateMedicationIndicationDraft,
} from "./emarUi";

const INITIAL_INDICATION = {
  ...DEFAULT_MEDICATION_INDICATION,
  fecha_indicacion: todayIso(),
  fecha_inicio: todayIso(),
};

const INITIAL_SCHEDULE = DEFAULT_MEDICATION_SCHEDULE;
const INITIAL_LOT = DEFAULT_STOCK_LOT;

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
  por_vencer: "bg-amber-50 text-amber-800 border-amber-200",
  sin_stock: "bg-rose-50 text-rose-700 border-rose-200",
  retirado: "bg-slate-50 text-slate-600 border-slate-200",
  inactivo: "bg-slate-50 text-slate-600 border-slate-200",
};

const MEDICATION_SECTIONS = [
  { id: "tratamiento", label: "Tratamiento y recetas" },
  { id: "stock", label: "Recepción y stock" },
  { id: "administracion", label: "Administraciones" },
];

function cloneSchedule(schedule = INITIAL_SCHEDULE) {
  return {
    ...INITIAL_SCHEDULE,
    ...schedule,
    hora: schedule.hora?.slice(0, 5) ?? INITIAL_SCHEDULE.hora,
    dias_semana: schedule.dias_semana ?? INITIAL_SCHEDULE.dias_semana,
    dias_mes: schedule.dias_mes ?? INITIAL_SCHEDULE.dias_mes,
  };
}

export default function EmarResidentTab({ resident }) {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const [data, setData] = useState({ indicaciones: [], lotes: [], administraciones: [], movimientos: [] });
  const [pendingReconciliations, setPendingReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [indicationModal, setIndicationModal] = useState(null);
  const [lotModal, setLotModal] = useState(null);
  const [movementModal, setMovementModal] = useState(null);
  const [reconcileModal, setReconcileModal] = useState(null);
  const [prescriptionModal, setPrescriptionModal] = useState(null);
  const [section, setSection] = useState("tratamiento");

  const canCreateIndication = can("crear_indicaciones_medicamentos");
  const canEditIndication = can("editar_indicaciones_medicamentos");
  const canUploadPrescription = can("adjuntar_recetas_medicamentos");
  const canAdminister = can("administrar_medicamentos");
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
      toast("No se pudieron cargar los medicamentos del residente.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resident.id]);

  const activeIndications = useMemo(
    () => data.indicaciones.filter((item) => !["suspendida", "suspendido", "finalizada"].includes(item.estado)),
    [data.indicaciones]
  );

  const closedIndications = useMemo(
    () => data.indicaciones.filter((item) => ["suspendida", "suspendido", "finalizada"].includes(item.estado)),
    [data.indicaciones]
  );

  const stockAlerts = useMemo(() => {
    return buildStockLotAlerts(data.lotes);
  }, [data.lotes]);

  const recentPending = useMemo(
    () => data.administraciones.filter((row) => ["pendiente", "pendiente_validacion"].includes(row.estado)).length,
    [data.administraciones]
  );

  const receptionMovements = useMemo(
    () => data.movimientos.filter((item) => item.tipo === "recepcion"),
    [data.movimientos]
  );

  const openPrescription = async (recipe) => {
    try {
      const url = await getMedicationPrescriptionUrl(recipe.storage_path);
      if (!url) throw new Error("No se pudo abrir la receta.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast(error.message || "No se pudo abrir la receta.", "error");
    }
  };

  const handleSaveIndication = async ({ indication, schedule }) => {
    setSaving(true);
    try {
      const saved = await saveMedicationIndication({ residenteId: resident.id, indication, schedule });
      toast("Indicación guardada.", "success");
      setIndicationModal(null);
      await load();
      if (!indication.id && saved?.requiere_stock && canAdjustStock) {
        setLotModal({
          indication: saved,
          lot: {
            ...INITIAL_LOT,
            medicamento_nombre: saved.medicamento_nombre,
            unidad: saved.unidad_dosis || "unidad",
            es_controlado: saved.es_controlado,
            tipo_controlado: saved.tipo_controlado || "psicotropico",
          },
        });
      }
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo guardar la indicación.", "error");
      throw err;
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
      throw err;
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
      throw err;
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
      throw err;
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Medicamentos</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Indicaciones, recetas, stock y administraciones de {resident.nombre} {resident.apellido}.</p>
          </div>
          {canCreateIndication && <button type="button" onClick={() => setIndicationModal({ indication: INITIAL_INDICATION, schedule: { ...INITIAL_SCHEDULE, turno: currentTurno() } })} className="min-h-10 w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 sm:w-auto">Nueva indicación</button>}
        </div>
        <MedicationSectionNav active={section} onChange={setSection} />
      </section>

      {section === "tratamiento" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4"><div className="flex items-center gap-1.5"><h2 className="text-base font-semibold text-slate-950">Tratamiento actual</h2><HelpTooltip label="Ayuda: tratamiento y recetas">Registra medicamento, dosis, vía, prescriptor, vigencia y horarios. La receta en PDF o imagen queda asociada a la indicación.</HelpTooltip></div><p className="mt-1 text-sm text-slate-500">La información necesaria para generar las administraciones del turno.</p></div>
        {activeIndications.length === 0 ? <EmptyMedicationState title="Aún no hay indicaciones" text="Registra la primera indicación médica y adjunta su receta." action={canCreateIndication ? "Crear indicación" : null} onAction={() => setIndicationModal({ indication: INITIAL_INDICATION, schedule: { ...INITIAL_SCHEDULE, turno: currentTurno() } })} /> : <IndicationGroup title="Indicaciones vigentes" items={activeIndications} empty="Sin indicaciones vigentes." canEdit={canEditIndication} canUpload={canUploadPrescription} onEdit={setIndicationModal} onUpload={setPrescriptionModal} onOpenPrescription={openPrescription} />}
        {closedIndications.length > 0 && <details className="mt-4 border-t border-slate-100 pt-4"><summary className="cursor-pointer text-sm font-semibold text-slate-600">Ver indicaciones cerradas ({closedIndications.length})</summary><div className="mt-3"><IndicationGroup title="Historial" items={closedIndications} empty="" canEdit={canEditIndication} canUpload={canUploadPrescription} onEdit={setIndicationModal} onUpload={setPrescriptionModal} onOpenPrescription={openPrescription} /></div></details>}
      </section>}

      {section === "stock" && <div className="space-y-4">
        <StockAlertsPanel alerts={stockAlerts} canAdjustStock={canAdjustStock} onNewLot={() => setLotModal({ lot: INITIAL_LOT, indication: activeIndications[0] ?? null })} />
        <PendingControlledValidations pending={pendingReconciliations} canValidate={canValidate} onValidate={(item) => setReconcileModal({ reconciliation: item })} />
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-1.5"><h2 className="text-base font-semibold text-slate-950">Recepción y stock</h2><HelpTooltip label="Ayuda: recepción y stock">Cada lote conserva cantidad recibida, vencimiento, ubicación y movimientos posteriores.</HelpTooltip></div><p className="mt-1 text-sm text-slate-500">Los controlados muestran aquí mismo sus acciones de conteo y doble firma.</p></div>{canAdjustStock && <button type="button" onClick={() => setLotModal({ lot: INITIAL_LOT, indication: activeIndications[0] ?? null })} className="min-h-10 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Registrar recepción</button>}</div>
          {data.lotes.length === 0 ? <EmptyMedicationState title="Sin recepciones registradas" text="Registra el primer lote, su cantidad, vencimiento y ubicación." /> : <div className="mt-4 divide-y divide-slate-100">{data.lotes.map((lot) => <StockLotRow key={lot.id} lot={lot} canAdjustStock={canAdjustStock} onEdit={() => setLotModal({ lot, indication: activeIndications.find((item) => item.id === lot.indicacion_id) ?? null })} onMove={(tipo) => setMovementModal({ lot, tipo })} onReconcile={() => setReconcileModal({ lot })} />)}</div>}
          <ReceptionHistory movements={receptionMovements} />
        </section>
      </div>}

      {section === "administracion" && <AdministrationSection rows={data.administraciones} pending={recentPending} canAdminister={canAdminister} onOpenTurn={() => navigate(`/operacion/medicamentos?q=${encodeURIComponent(`${resident.nombre} ${resident.apellido}`)}`)} />}

      <IndicationModal
        modal={indicationModal}
        saving={saving}
        confirm={confirm}
        onClose={() => !saving && setIndicationModal(null)}
        onSubmit={handleSaveIndication}
      />
      <LotModal
        modal={lotModal}
        indications={activeIndications}
        saving={saving}
        confirm={confirm}
        onClose={() => !saving && setLotModal(null)}
        onSubmit={handleSaveLot}
      />
      <MovementModal
        modal={movementModal}
        lots={data.lotes}
        saving={saving}
        confirm={confirm}
        onClose={() => !saving && setMovementModal(null)}
        onSubmit={handleMovement}
      />
      <ReconcileModal
        modal={reconcileModal}
        saving={saving}
        confirm={confirm}
        onClose={() => !saving && setReconcileModal(null)}
        onSubmit={handleReconcile}
      />
      <MedicationPrescriptionModal indication={prescriptionModal} residentId={resident.id} onClose={() => setPrescriptionModal(null)} onSaved={load} />
    </div>
  );
}

function MedicationSectionNav({ active, onChange }) {
  return <nav aria-label="Secciones de medicamentos" className="mt-4 flex gap-1 overflow-x-auto border-t border-slate-100 pt-3">{MEDICATION_SECTIONS.map((item) => <button key={item.id} type="button" onClick={() => onChange(item.id)} aria-current={active === item.id ? "page" : undefined} className={`min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${active === item.id ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>{item.label}</button>)}</nav>;
}

function AdministrationSection({ rows, pending, canAdminister, onOpenTurn }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-base font-semibold text-slate-950">Administración y uso</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Cada dosis debe dejar medicamento, dosis, hora, vía, estado y responsable. La bandeja del turno es el lugar seguro para ejecutar u omitir.</p></div>{canAdminister && <button type="button" onClick={onOpenTurn} className="min-h-10 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">Abrir bandeja del turno{pending ? ` · ${pending}` : ""}</button>}</div>{rows.length === 0 ? <EmptyMedicationState title="Aún no hay administraciones" text="Cuando existan horarios y se trabaje el turno, el historial aparecerá aquí." /> : <div className="mt-4 space-y-2">{rows.map((row) => <div key={row.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-950">{row.indicacion?.medicamento_nombre}</p><p className="mt-1 text-xs text-slate-500">{formatDateOnly(row.fecha)} · {row.hora?.slice(0, 5)} · {row.turno} · {row.indicacion?.via || "vía no indicada"}</p></div><span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{MEDICINE_STATUS_LABEL[row.estado] ?? row.estado}</span></div>)}</div>}</section>;
}

function PendingControlledValidations({ pending, canValidate, onValidate }) {
  if (pending.length === 0) return null;
  return <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><p className="text-sm font-semibold text-sky-950">{pending.length} revisión{pending.length === 1 ? "" : "es"} de stock requiere{pending.length === 1 ? "" : "n"} segunda firma</p><div className="mt-3 flex flex-wrap gap-2">{pending.map((item) => <button key={item.id} type="button" disabled={!canValidate} onClick={() => onValidate(item)} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-900 disabled:opacity-50">{item.lote?.medicamento_nombre || "Medicamento"} · validar diferencia {item.diferencia}</button>)}</div></section>;
}

function ReceptionHistory({ movements }) {
  if (movements.length === 0) return null;
  return <details className="mt-4 border-t border-slate-100 pt-4"><summary className="cursor-pointer text-sm font-semibold text-slate-600">Ver historial de recepciones ({movements.length})</summary><div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">{movements.map((item) => <div key={item.id} className="grid gap-1 px-3 py-2 text-xs sm:grid-cols-[1fr_auto_auto]"><span className="font-semibold text-slate-800">{item.lote?.medicamento_nombre} · lote {item.lote?.lote || "sin identificar"}</span><span className="text-emerald-700">+{Number(item.cantidad)} {item.lote?.unidad}</span><span className="text-slate-500">{new Date(item.creado_en).toLocaleString("es-CL")}</span></div>)}</div></details>;
}

function EmptyMedicationState({ title, text, action = null, onAction = null }) {
  return <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><h3 className="text-sm font-semibold text-slate-950">{title}</h3><p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-slate-500">{text}</p>{action && <button type="button" onClick={onAction} className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">{action}</button>}</div>;
}

function StockAlertsPanel({ alerts, canAdjustStock, onNewLot }) {
  const groups = [
    { key: "vencidos", title: "Lotes vencidos", tone: "rose", items: alerts.vencidos, action: "Retirar o reemplazar" },
    { key: "porVencer", title: "Lotes por vencer", tone: "amber", items: alerts.porVencer, action: "Usar antes o reponer" },
    { key: "sinStock", title: "Sin stock", tone: "slate", items: alerts.sinStock, action: "Registrar nuevo lote" },
  ].filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-amber-950">Alertas de stock</h3>
          <p className="mt-1 text-sm text-amber-800">
            Revisa vencimientos y reposición antes de iniciar el turno. Los lotes vencidos no deben usarse para administrar.
          </p>
        </div>
        {canAdjustStock && (
          <button
            type="button"
            onClick={onNewLot}
            className="shrink-0 rounded-xl bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Registrar nuevo lote
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.key} className="rounded-xl bg-white p-3 ring-1 ring-amber-100">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</p>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                group.tone === "rose" ? "bg-rose-50 text-rose-700" : group.tone === "amber" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"
              }`}>
                {group.items.length}
              </span>
            </div>
            <div className="mt-2 space-y-2">
              {group.items.slice(0, 3).map(({ lot, status }) => (
                <div key={lot.id} className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{lot.medicamento_nombre}</span>
                  {" · "}
                  lote {lot.lote || "s/l"}
                  {status.days != null && status.key === "por_vencer" ? ` · ${status.days} días` : ""}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">{group.action}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function IndicationGroup({
  title,
  items,
  empty,
  canEdit,
  canUpload,
  onEdit,
  onUpload,
  onOpenPrescription,
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl bg-white p-3 text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl bg-white px-3">
          {items.map((item) => (
            <IndicationRow
              key={item.id}
              item={item}
              canEdit={canEdit}
              canUpload={canUpload}
              onUpload={() => onUpload(item)}
              onOpenPrescription={onOpenPrescription}
              onEdit={() => onEdit({
                indication: item,
                schedules: item.horarios?.filter((h) => h.activo !== false).length
                  ? item.horarios.filter((h) => h.activo !== false)
                  : [INITIAL_SCHEDULE],
              })}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function IndicationRow({ item, canEdit, canUpload, onEdit, onUpload, onOpenPrescription }) {
  const recipes = [...(item.recetas ?? [])].sort((a, b) => String(b.creado_en).localeCompare(String(a.creado_en)));
  const latestRecipe = recipes[0];
  return (
    <div className="py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
              {MED_ROUTES.find(([value]) => value === item.via)?.[1] ?? item.via}
            </span>
            {item.es_controlado && (
              <span
                className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                title="Medicamento controlado: requiere lote identificado y confirmación de un segundo usuario."
              >
                Requiere doble firma
              </span>
            )}
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${latestRecipe ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{latestRecipe ? "Receta adjunta" : "Falta receta"}</span>
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
          <p className="mt-1 text-xs text-slate-500">Prescriptor: {item.prescriptor_nombre}</p>
          {latestRecipe && <p className="mt-1 text-xs text-slate-500">Receta emitida el {formatDateOnly(latestRecipe.fecha_emision)} · {recipes.length} archivo{recipes.length === 1 ? "" : "s"} en historial</p>}
          {item.instrucciones && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.instrucciones}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {(item.horarios ?? []).filter((h) => h.activo !== false).map((h) => (
              <span key={h.id} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500">
                {summarizeMedicationSchedule(h)}
              </span>
            ))}
          </div>
          {recipes.length > 1 && <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-slate-500">Ver recetas anteriores</summary><div className="mt-2 flex flex-wrap gap-2">{recipes.slice(1).map((recipe) => <button key={recipe.id} type="button" onClick={() => onOpenPrescription(recipe)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50">{formatDateOnly(recipe.fecha_emision)}</button>)}</div></details>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {latestRecipe && <button type="button" onClick={() => onOpenPrescription(latestRecipe)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver receta</button>}
          {canUpload && <button type="button" onClick={onUpload} className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">{latestRecipe ? "Nueva receta" : "Adjuntar receta"}</button>}
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              title="Editar medicamento, dosis, vía y horarios."
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Editar indicación
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StockLotRow({ lot, canAdjustStock, onEdit, onMove, onReconcile }) {
  const status = getStockLotStatus(lot);
  const estado = status.key;
  return (
    <div className="py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STOCK_TONE[estado] ?? STOCK_TONE.activo}`}>
              {status.label}
            </span>
            {lot.es_controlado && (
              <span
                className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                title="Lote de medicamento controlado: ajustes y administraciones requieren segundo usuario."
              >
                Doble firma
              </span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-950">{lot.medicamento_nombre}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Stock {lot.cantidad_actual} {lot.unidad} · lote {lot.lote || "s/l"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {lot.fecha_vencimiento ? `Vence ${formatDateOnly(lot.fecha_vencimiento)}` : "Sin vencimiento registrado"}
            {status.key === "por_vencer" && status.days != null ? ` · quedan ${status.days} días` : ""}
            {status.key === "vencido" && status.days != null ? ` · vencido hace ${Math.abs(status.days)} días` : ""}
            {lot.ubicacion ? ` · ${lot.ubicacion}` : ""}
          </p>
          {status.key !== "activo" && (
            <p className={`mt-2 rounded-xl px-3 py-2 text-xs font-medium ${
              status.tone === "rose" ? "bg-rose-50 text-rose-700" : status.tone === "amber" ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-600"
            }`}>
              {status.actionable}
            </p>
          )}
        </div>
        {canAdjustStock && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={onEdit}
              title="Editar datos del lote (medicamento, vencimiento, ubicación). La cantidad solo cambia con movimientos."
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Editar lote
            </button>
            <button
              type="button"
              onClick={() => onMove("recepcion")}
              title="Registrar nuevas unidades que ingresan al inventario."
              className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Recibir más
            </button>
            {!lot.es_controlado && (
              <button
                type="button"
                onClick={() => onMove("ajuste")}
                title="Corregir la cantidad disponible cuando hay diferencias con lo físico."
                className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
              >
                Ajuste
              </button>
            )}
            {status.key === "vencido" && !lot.es_controlado && (
              <button
                type="button"
                onClick={() => onMove("retiro")}
                title="Sacar de circulación el lote vencido. Queda registrado el movimiento."
                className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                Retirar lote vencido
              </button>
            )}
            {lot.es_controlado && (
              <button
                type="button"
                onClick={onReconcile}
                title="Conteo físico que se compara con el sistema. La diferencia queda pendiente para que firme un segundo usuario."
                className="rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Revisar stock
              </button>
            )}
          </div>
        )}
      </div>
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

function ScheduleFields({ schedule, setSchedule, saving, title = "Horario", onRemove = null }) {
  const toggleDay = (day) => {
    setSchedule((prev) => {
      const set = new Set(prev.dias_semana ?? []);
      if (set.has(day)) set.delete(day); else set.add(day);
      return { ...prev, dias_semana: Array.from(set).sort((a, b) => a - b) };
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-950">
          {title}
          <HelpTooltip label="Ayuda: horario de medicamento">Usa todos los días o selecciona días específicos según la orden.</HelpTooltip>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={saving}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-60"
          >
            Quitar
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700">
          Frecuencia
          <select
            value={schedule.frecuencia}
            onChange={(e) => setSchedule((p) => ({ ...p, frecuencia: e.target.value }))}
            disabled={saving}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            <option value="diaria">Todos los días</option>
            <option value="semanal">Días específicos</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Turno
          <select
            value={schedule.turno}
            onChange={(e) => setSchedule((p) => ({ ...p, turno: e.target.value }))}
            disabled={saving}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm capitalize outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            {EMAR_TURNOS.map((item) => <option key={item} value={item} className="capitalize">{item}</option>)}
          </select>
        </label>
        <Field label="Hora" type="time" value={schedule.hora} onChange={(value) => setSchedule((p) => ({ ...p, hora: value }))} disabled={saving} />
      </div>

      {schedule.frecuencia === "semanal" && (
        <div className="mt-3">
          <div className="mb-2 text-sm font-medium text-slate-700">Días</div>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {WEEK_DAYS.map(([day, label]) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={schedule.dias_semana?.includes(day)}
                className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                  schedule.dias_semana?.includes(day)
                    ? "border-teal-600 bg-teal-50 text-teal-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

function IndicationModal({ modal, saving, confirm, onClose, onSubmit }) {
  const draftKey = modal?.indication?.id
    ? `fe_medication_indication_${modal.indication.id}`
    : "fe_medication_indication_new";
  const initialDraft = useMemo(() => {
    const incoming = modal?.schedules?.length ? modal.schedules : [modal?.schedule ?? INITIAL_SCHEDULE];
    return {
      indication: { ...INITIAL_INDICATION, ...(modal?.indication ?? {}) },
      schedules: incoming.map(cloneSchedule),
    };
  }, [modal]);
  const [draft, setDraft, resetDraft, dirty] = useSessionFormDraft(draftKey, initialDraft);
  const indication = draft.indication;
  const schedules = draft.schedules;
  const setIndication = (updater) => setDraft((prev) => ({
    ...prev,
    indication: typeof updater === "function" ? updater(prev.indication) : updater,
  }));
  const setSchedules = (updater) => setDraft((prev) => ({
    ...prev,
    schedules: typeof updater === "function" ? updater(prev.schedules) : updater,
  }));

  if (!modal) return null;

  const setControlled = (checked) => {
    setIndication((prev) => ({
      ...prev,
      es_controlado: checked,
      requiere_stock: checked,
      tipo_controlado: checked ? prev.tipo_controlado || "psicotropico" : "psicotropico",
    }));
  };
  const validationErrors = validateMedicationIndicationDraft(indication, schedules);

  const handleClose = async () => {
    if (dirty) {
      const ok = await confirm({
        title: "Descartar indicación",
        message: "Hay cambios sin guardar en esta indicación.",
        confirmText: "Descartar",
        cancelText: "Seguir editando",
        danger: true,
      });
      if (!ok) return;
    }
    onClose();
  };

  return (
    <Modal isOpen={!!modal} onClose={handleClose} title={indication.id ? "Editar indicación" : "Nueva indicación"}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (hasValidationErrors(validationErrors)) return;
          try {
            await onSubmit({ indication: { ...indication, schedules }, schedule: schedules });
            resetDraft();
          } catch {
            // The parent already shows the error. Keep the draft intact.
          }
        }}
      >
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
          Transcribe la orden vigente. Cada horario creará una dosis en el turno; los medicamentos controlados exigirán lote y segunda firma automáticamente.
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Medicamento" value={indication.medicamento_nombre} onChange={(value) => setIndication((p) => ({ ...p, medicamento_nombre: value }))} disabled={saving} required />
          </div>
          <Field label="Dosis" value={indication.dosis} onChange={(value) => setIndication((p) => ({ ...p, dosis: value }))} disabled={saving} required />
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
          <Field label="Prescriptor" value={indication.prescriptor_nombre ?? ""} onChange={(value) => setIndication((p) => ({ ...p, prescriptor_nombre: value }))} disabled={saving} required />
          <Field label="Inicio" type="date" value={indication.fecha_inicio ?? ""} onChange={(value) => setIndication((p) => ({ ...p, fecha_inicio: value }))} disabled={saving} required />
          <Field label="Fin (opcional)" type="date" value={indication.fecha_fin ?? ""} onChange={(value) => setIndication((p) => ({ ...p, fecha_fin: value }))} disabled={saving} />
          <div className="sm:col-span-2">
            <TextArea label="Indicaciones especiales (opcional)" value={indication.instrucciones ?? ""} onChange={(value) => setIndication((p) => ({ ...p, instrucciones: value }))} disabled={saving} />
          </div>
        </div>

        <div>
          <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={indication.es_controlado} disabled={saving} onChange={(e) => setControlled(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-700" />
            <span>
              Medicamento controlado
              <span className="block text-xs text-slate-500">Activa automáticamente lote, control de stock y segunda firma.</span>
            </span>
          </label>
        </div>

        {indication.es_controlado && (
          <label className="block text-sm font-medium text-slate-700">
            Clasificación legal
            <select
              value={indication.tipo_controlado}
              onChange={(e) => setIndication((p) => ({ ...p, tipo_controlado: e.target.value }))}
              disabled={saving}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="psicotropico">Receta retenida</option>
              <option value="estupefaciente">Receta especial</option>
            </select>
          </label>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Horarios de administración</h3>
              <p className="text-xs text-slate-500">Agrega una fila por cada hora indicada en la orden.</p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => setSchedules((prev) => [...prev, cloneSchedule({ turno: currentTurno() })])}
              className="rounded-xl border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"
            >
              Agregar horario
            </button>
          </div>
          {schedules.map((item, index) => (
            <ScheduleFields
              key={item.id ?? index}
              title={`Horario ${index + 1}`}
              schedule={item}
              setSchedule={(updater) => {
                setSchedules((prev) => prev.map((current, currentIndex) => {
                  if (currentIndex !== index) return current;
                  return typeof updater === "function" ? updater(current) : updater;
                }));
              }}
              saving={saving}
              onRemove={schedules.length > 1 ? () => setSchedules((prev) => prev.filter((_, currentIndex) => currentIndex !== index)) : null}
            />
          ))}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={saving} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto">
            Cancelar
          </button>
          <button type="submit" disabled={saving || hasValidationErrors(validationErrors)} className="w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 sm:w-auto">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function LotModal({ modal, indications, saving, confirm, onClose, onSubmit }) {
  const draftKey = modal?.lot?.id ? `fe_medication_lot_${modal.lot.id}` : "fe_medication_lot_new";
  const initialDraft = useMemo(() => ({
    lot: { ...INITIAL_LOT, ...(modal?.lot ?? {}) },
    indicationId: modal?.indication?.id ?? modal?.lot?.indicacion_id ?? "",
  }), [modal]);
  const [draft, setDraft, resetDraft, dirty] = useSessionFormDraft(draftKey, initialDraft);
  const lot = draft.lot;
  const indicationId = draft.indicationId;
  const setLot = (updater) => setDraft((prev) => ({
    ...prev,
    lot: typeof updater === "function" ? updater(prev.lot) : updater,
  }));
  const setIndicationId = (value) => setDraft((prev) => ({ ...prev, indicationId: value }));

  if (!modal) return null;

  const indication = indications.find((item) => item.id === indicationId) ?? modal.indication ?? null;
  const effectiveControlled = indication?.es_controlado === true || lot.es_controlado === true;
  const handleClose = async () => {
    if (dirty) {
      const ok = await confirm({
        title: "Descartar lote",
        message: "Hay cambios sin guardar en este lote.",
        confirmText: "Descartar",
        cancelText: "Seguir editando",
        danger: true,
      });
      if (!ok) return;
    }
    onClose();
  };

  return (
    <Modal isOpen={!!modal} onClose={handleClose} title={lot.id ? "Editar lote" : "Registrar recepción"}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await onSubmit({
              lot: {
                ...lot,
                indicacion_id: indicationId || null,
                es_controlado: effectiveControlled,
                tipo_controlado: effectiveControlled ? lot.tipo_controlado || indication?.tipo_controlado || "psicotropico" : null,
              },
              indication,
            });
            resetDraft();
          } catch {
            // Parent shows the error. Keep draft for correction.
          }
        }}
      >
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="font-semibold">Trazabilidad de inventario</div>
          <p className="mt-1 text-xs leading-relaxed">
            El stock inicial se registra como ingreso. Después, la cantidad solo cambia por movimientos, administraciones o revisiones de stock.
          </p>
        </div>

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
          <span className="mt-1 block text-xs text-slate-500">
            Asociar el lote ayuda a sugerir el stock correcto al administrar la indicación.
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
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
        <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
          <input type="checkbox" checked={effectiveControlled} disabled={saving || indication?.es_controlado} onChange={(e) => setLot((p) => ({ ...p, es_controlado: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-teal-700" />
          <span>
            Lote con doble firma
            <span className="block text-xs text-slate-500">Usa esta marca cuando el medicamento exige identificación estricta y segundo usuario.</span>
          </span>
        </label>
        {indication?.es_controlado && (
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-xs text-teal-900">
            Esta indicación requiere doble firma; el lote quedará identificado y pedirá segundo usuario al administrar.
          </div>
        )}
        {lot.id && (
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            La cantidad actual no se edita aquí. Usa Ingreso, Ajuste o Revisar stock para conservar el registro.
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={saving} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !lot.medicamento_nombre?.trim()} className="w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 sm:w-auto">
            {saving ? "Guardando..." : lot.id ? "Guardar cambios" : "Guardar recepción"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MovementModal({ modal, lots, saving, confirm, onClose, onSubmit }) {
  const draftKey = modal?.lot?.id ? `fe_medication_movement_${modal.lot.id}_${modal.tipo ?? "recepcion"}` : "fe_medication_movement";
  const initialDraft = useMemo(() => ({
    loteId: modal?.lot?.id ?? lots[0]?.id ?? "",
    tipo: modal?.tipo ?? "recepcion",
    cantidad: "",
    motivo: "",
  }), [modal, lots]);
  const [draft, setDraft, resetDraft, dirty] = useSessionFormDraft(draftKey, initialDraft);
  const { loteId, tipo, cantidad, motivo } = draft;
  const updateDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

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
  const handleClose = async () => {
    if (dirty) {
      const ok = await confirm({
        title: "Descartar movimiento",
        message: "Hay cambios sin guardar en este movimiento de stock.",
        confirmText: "Descartar",
        cancelText: "Seguir editando",
        danger: true,
      });
      if (!ok) return;
    }
    onClose();
  };

  return (
    <Modal isOpen={!!modal} onClose={handleClose} title={tipo === "recepcion" ? "Registrar recepción" : "Movimiento de stock"}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const value = Number(cantidad);
          const signedQuantity = ["merma", "retiro"].includes(tipo) ? -Math.abs(value) : value;
          try {
            await onSubmit({ loteId, tipo, cantidad: signedQuantity, motivo });
            resetDraft();
          } catch {
            // Parent shows the error. Keep draft for correction.
          }
        }}
      >
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-semibold text-slate-950">Regla de stock</div>
          <p className="mt-1 text-xs leading-relaxed">
            Recepción aumenta inventario. Merma y retiro descuentan. Ajuste y reversa solo están disponibles para lotes simples; los lotes con doble firma se corrigen con revisión de stock y segundo usuario.
          </p>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Lote
          <select
            value={loteId}
            onChange={(e) => {
              const nextId = e.target.value;
              const nextLot = lots.find((lot) => lot.id === nextId);
              updateDraft({ loteId: nextId, tipo: nextLot?.es_controlado ? "recepcion" : tipo });
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
          <select value={tipo} onChange={(e) => updateDraft({ tipo: e.target.value })} disabled={saving} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
            {movementOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        {selectedLot?.es_controlado && (
          <div className="rounded-xl bg-sky-50 p-3 text-xs text-sky-800">
            Los ajustes de estos lotes se hacen por Revisar stock para exigir segundo usuario.
          </div>
        )}
        <Field label="Cantidad" type="number" min={tipo === "ajuste" ? undefined : "0.01"} step="0.01" value={cantidad} onChange={(value) => updateDraft({ cantidad: value })} disabled={saving} required />
        <TextArea label="Motivo" value={motivo} onChange={(value) => updateDraft({ motivo: value })} disabled={saving} required />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={saving} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !loteId || !cantidad || !motivo.trim()} className="w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 sm:w-auto">
            {saving ? "Guardando..." : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReconcileModal({ modal, saving, confirm, onClose, onSubmit }) {
  const draftKey = modal?.reconciliation?.id
    ? `fe_medication_reconcile_validate_${modal.reconciliation.id}`
    : `fe_medication_reconcile_${modal?.lot?.id ?? "new"}`;
  const initialDraft = useMemo(() => ({ cantidadFisica: "", motivo: "" }), []);
  const [draft, setDraft, resetDraft, dirty] = useSessionFormDraft(draftKey, initialDraft);
  const { cantidadFisica, motivo } = draft;
  const updateDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  if (!modal) return null;

  const isValidation = Boolean(modal.reconciliation);
  const lot = modal.lot ?? modal.reconciliation?.lote;
  const handleClose = async () => {
    if (dirty) {
      const ok = await confirm({
        title: "Descartar revisión",
        message: "Hay cambios sin guardar en esta revisión de stock.",
        confirmText: "Descartar",
        cancelText: "Seguir editando",
        danger: true,
      });
      if (!ok) return;
    }
    onClose();
  };

  return (
    <Modal isOpen={!!modal} onClose={handleClose} title={isValidation ? "Validar revisión de stock" : "Revisar stock del lote"}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await onSubmit({
              loteId: lot?.id ?? null,
              cantidadFisica,
              motivo,
              conciliacionId: modal.reconciliation?.id ?? null,
            });
            resetDraft();
          } catch {
            // Parent shows the error. Keep draft for correction.
          }
        }}
      >
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
          <div className="font-semibold">{isValidation ? "Confirmación de segundo usuario" : "Revisión de stock"}</div>
          <p className="mt-1 text-xs leading-relaxed">
            {isValidation
              ? "Al validar, el stock del sistema se ajusta a la cantidad física contada y el movimiento queda firmado por un segundo usuario."
              : "Registra el conteo físico y el motivo. El ajuste no cambia el stock hasta que otro usuario autorizado lo valide."}
          </p>
        </div>

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
          <Field label="Cantidad física contada" type="number" min="0" step="0.01" value={cantidadFisica} onChange={(value) => updateDraft({ cantidadFisica: value })} disabled={saving} required />
        )}
        <TextArea label={isValidation ? "Nota de validación" : "Motivo / acta breve"} value={motivo} onChange={(value) => updateDraft({ motivo: value })} disabled={saving} required={!isValidation} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={saving} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto">
            Cancelar
          </button>
          <button type="submit" disabled={saving || (!isValidation && (cantidadFisica === "" || !motivo.trim()))} className="w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 sm:w-auto">
            {saving ? "Guardando..." : isValidation ? "Validar" : "Enviar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
