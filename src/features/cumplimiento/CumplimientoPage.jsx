import { useEffect, useMemo, useState } from "react";
import PageLayout from "../../layout/PageLayout";
import Badge from "../../components/Badge";
import TabBar from "../../components/TabBar";
import MetricCard from "../../components/MetricCard";
import EmptyState from "../../components/EmptyState";
import { IconPlus } from "../../components/icons";
import Modal from "../../components/Modal";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import { useAuth } from "../../context/AuthContext";
import {
  FormGrid,
  Notice,
  SelectField,
  SubmitBar,
  TextareaField,
  TextField,
} from "../../components/forms/FormKit";
import { formatDateOnly, formatDateTime } from "../../utils/dateUtils";
import {
  BRECHA_ESTADO_LABEL,
  BRECHA_ESTADO_TONE,
  BRECHA_RIESGO_LABEL,
  BRECHA_RIESGO_TONE,
  HITOS_TRANSITORIOS,
  PROTOCOLOS_REQUERIDOS,
  PROTOCOLO_ESTADO_LABEL,
  PROTOCOLO_ESTADO_TONE,
  PROTOCOLO_TIPO_DESC,
  PROTOCOLO_TIPO_LABEL,
  REPORTE_ESTADO_LABEL,
  REPORTE_ESTADO_TONE,
  currentPeriodo,
  deleteBrecha,
  deleteProtocolo,
  diasRestantes,
  generarReporteSenama,
  getBrechas,
  getProtocolos,
  getReportesSenama,
  hitoTone,
  marcarReporteEnviado,
  protocolosFaltantes,
  saveBrecha,
  saveProtocolo,
} from "./cumplimientoService";

const TABS = [
  { id: "transitorios", label: "Transitorios" },
  { id: "protocolos", label: "Protocolos" },
  { id: "senama", label: "Reporte SENAMA" },
];

// ─── Transitorios Tab ────────────────────────────────────────────────────────

function HitoCard({ hito }) {
  const dias = diasRestantes(hito.fecha);
  const tone = hitoTone(dias);
  const tones = {
    emerald: "border-emerald-100 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
    rose: "border-rose-200 bg-rose-50",
  };
  const vencido = dias < 0;
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-sm font-bold text-slate-900">{hito.label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{hito.detalle}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums text-slate-900">
          {vencido ? "Vencido" : `${dias.toLocaleString("es-CL")} días`}
        </span>
        <span className="text-xs text-slate-500">
          {vencido ? `desde el ${formatDateOnly(hito.fecha)}` : `· límite ${formatDateOnly(hito.fecha)}`}
        </span>
      </div>
    </div>
  );
}

const BRECHA_INIT = {
  requisito: "",
  descripcion: "",
  riesgo: "medio",
  estado: "pendiente",
  plazo: "",
  plan_accion: "",
  notas_seguimiento: "",
};

function TransitoriosTab({ canManage, canDelete }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BRECHA_INIT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  useEffect(() => {
    getBrechas()
      .then(setItems)
      .catch((err) => toast(err.message || "Error al cargar brechas", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const stats = useMemo(() => ({
    abiertas: items.filter((i) => i.estado !== "cerrada").length,
    criticas: items.filter((i) => i.estado !== "cerrada" && i.riesgo === "critico").length,
    cerradas: items.filter((i) => i.estado === "cerrada").length,
  }), [items]);

  const openNew = () => { setForm(BRECHA_INIT); setModal("new"); };
  const openEdit = (item) => {
    setForm({
      requisito: item.requisito ?? "",
      descripcion: item.descripcion ?? "",
      riesgo: item.riesgo ?? "medio",
      estado: item.estado ?? "pendiente",
      plazo: item.plazo ?? "",
      plan_accion: item.plan_accion ?? "",
      notas_seguimiento: item.notas_seguimiento ?? "",
      _id: item.id,
    });
    setModal("edit");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requisito?.trim()) { toast("Ingresa el requisito de la brecha", "error"); return; }
    setSaving(true);
    try {
      const saved = await saveBrecha(form, form._id ?? null);
      setItems((prev) => {
        const next = form._id ? prev.map((i) => i.id === saved.id ? saved : i) : [...prev, saved];
        return next.sort((a, b) =>
          a.estado.localeCompare(b.estado) || String(a.plazo ?? "9999").localeCompare(String(b.plazo ?? "9999"))
        );
      });
      setModal(null);
      toast("Brecha guardada", "success");
    } catch (err) {
      toast(err.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: "Eliminar brecha",
      message: `Se eliminará "${item.requisito}" de la matriz de brechas. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    setDeleting(item.id);
    try {
      await deleteBrecha(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast("Brecha eliminada", "success");
    } catch (err) {
      toast(err.message || "Error al eliminar", "error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900">Plazos del período transitorio</h2>
        <p className="text-sm text-slate-500">Hitos legales del Decreto N°20 calculados automáticamente.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {HITOS_TRANSITORIOS.map((hito) => <HitoCard key={hito.id} hito={hito} />)}
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Matriz de brechas</h2>
            <p className="text-sm text-slate-500">Requisitos por adecuar antes del fin del plazo transitorio.</p>
          </div>
          {canManage && (
            <button type="button" onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              <IconPlus />
              Agregar brecha
            </button>
          )}
        </div>

        {items.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-3">
            <MetricCard size="sm" label="Abiertas" value={stats.abiertas} tone={stats.abiertas ? "amber" : "emerald"} />
            <MetricCard size="sm" label="Críticas abiertas" value={stats.criticas} tone={stats.criticas ? "rose" : "emerald"} />
            <MetricCard size="sm" label="Cerradas" value={stats.cerradas} tone="emerald" />
          </div>
        )}

        {loading ? (
          <Loading message="Cargando brechas..." />
        ) : items.length === 0 ? (
          <EmptyState compact title="Sin brechas registradas" description="Levanta aquí los requisitos del decreto que tu ELEAM aún debe adecuar." />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const riesgoTone = BRECHA_RIESGO_TONE[item.riesgo] ?? "slate";
              const estadoTone = BRECHA_ESTADO_TONE[item.estado] ?? "slate";
              const plazoDias = item.plazo ? diasRestantes(item.plazo) : null;
              const plazoVencido = plazoDias != null && plazoDias < 0 && item.estado !== "cerrada";
              return (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{item.requisito}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone={estadoTone}>{BRECHA_ESTADO_LABEL[item.estado] ?? item.estado}</Badge>
                        <Badge tone={riesgoTone}>Riesgo {BRECHA_RIESGO_LABEL[item.riesgo] ?? item.riesgo}</Badge>
                        {item.plazo && (
                          <span className={`text-xs ${plazoVencido ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                            {plazoVencido ? "Plazo vencido: " : "Plazo: "}{formatDateOnly(item.plazo)}
                          </span>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEdit(item)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Editar</button>
                        {canDelete && (
                          <button
                            type="button"
                            disabled={deleting === item.id}
                            onClick={() => handleDelete(item)}
                            className="rounded-xl border border-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                          >
                            {deleting === item.id ? "..." : "Eliminar"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {(item.descripcion || item.plan_accion) && (
                    <div className="mt-3 grid gap-3 border-t border-slate-50 pt-3 sm:grid-cols-2">
                      {item.descripcion && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-400">Descripción</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{item.descripcion}</p>
                        </div>
                      )}
                      {item.plan_accion && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-400">Plan de acción</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{item.plan_accion}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={modal !== null} onClose={() => setModal(null)} title={modal === "edit" ? "Editar brecha" : "Nueva brecha"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            id="br-req"
            name="requisito"
            label="Requisito del decreto"
            value={form.requisito}
            onChange={f("requisito")}
            required
            disabled={saving}
            placeholder="Ej: Certificación eléctrica vigente"
          />
          <FormGrid columns={3}>
            <SelectField
              id="br-riesgo"
              name="riesgo"
              label="Riesgo"
              value={form.riesgo}
              onChange={f("riesgo")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(BRECHA_RIESGO_LABEL)}
            />
            <SelectField
              id="br-estado"
              name="estado"
              label="Estado"
              value={form.estado}
              onChange={f("estado")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(BRECHA_ESTADO_LABEL)}
            />
            <TextField
              id="br-plazo"
              name="plazo"
              label="Plazo de cierre"
              type="date"
              value={form.plazo}
              onChange={f("plazo")}
              disabled={saving}
            />
          </FormGrid>
          <TextareaField
            id="br-desc"
            name="descripcion"
            label="Descripción"
            value={form.descripcion}
            onChange={f("descripcion")}
            rows={3}
            disabled={saving}
            placeholder="Qué exige el decreto y cuál es la situación actual..."
          />
          <TextareaField
            id="br-plan"
            name="plan_accion"
            label="Plan de acción"
            value={form.plan_accion}
            onChange={f("plan_accion")}
            rows={3}
            disabled={saving}
            placeholder="Acciones concretas para cerrar la brecha..."
          />
          <TextareaField
            id="br-notas"
            name="notas_seguimiento"
            label="Notas de seguimiento"
            value={form.notas_seguimiento}
            onChange={f("notas_seguimiento")}
            rows={2}
            disabled={saving}
          />
          <SubmitBar submitLabel="Guardar" busyLabel="Guardando..." busy={saving} onCancel={() => setModal(null)} />
        </form>
      </Modal>
    </div>
  );
}

// ─── Protocolos Tab ──────────────────────────────────────────────────────────

const PROTOCOLO_INIT = {
  tipo: "urgencias_medicas",
  titulo: "",
  contenido: "",
  estado: "borrador",
  fecha_aprobacion: "",
  fecha_revision: "",
};

function ProtocolosTab({ canManage, canDelete }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [reading, setReading] = useState(null);
  const [form, setForm] = useState(PROTOCOLO_INIT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  useEffect(() => {
    getProtocolos()
      .then(setItems)
      .catch((err) => toast(err.message || "Error al cargar protocolos", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const faltantes = useMemo(() => protocolosFaltantes(items), [items]);

  const openNew = (tipo = "urgencias_medicas") => {
    setForm({ ...PROTOCOLO_INIT, tipo, titulo: `Protocolo de ${PROTOCOLO_TIPO_LABEL[tipo].toLowerCase()}` });
    setModal("new");
  };
  const openEdit = (item) => {
    setForm({
      tipo: item.tipo ?? "urgencias_medicas",
      titulo: item.titulo ?? "",
      contenido: item.contenido ?? "",
      estado: item.estado ?? "borrador",
      fecha_aprobacion: item.fecha_aprobacion ?? "",
      fecha_revision: item.fecha_revision ?? "",
      _id: item.id,
    });
    setModal("edit");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo?.trim()) { toast("Ingresa el título del protocolo", "error"); return; }
    setSaving(true);
    try {
      const saved = await saveProtocolo(form, form._id ?? null);
      setItems((prev) => {
        const next = form._id ? prev.map((i) => i.id === saved.id ? saved : i) : [...prev, saved];
        return next.sort((a, b) => a.tipo.localeCompare(b.tipo) || String(b.creado_en).localeCompare(String(a.creado_en)));
      });
      setModal(null);
      toast("Protocolo guardado", "success");
    } catch (err) {
      toast(err.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: "Eliminar protocolo",
      message: `Se eliminará "${item.titulo}". Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    setDeleting(item.id);
    try {
      await deleteProtocolo(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast("Protocolo eliminado", "success");
    } catch (err) {
      toast(err.message || "Error al eliminar", "error");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <Loading message="Cargando protocolos..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Protocolos operativos</h2>
          <p className="text-sm text-slate-500">Urgencias, fallecimiento, ingreso, egreso y aseo/desinfección — DS20 Art. 25.</p>
        </div>
        {canManage && (
          <button type="button" onClick={() => openNew()} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            <IconPlus />
            Nuevo protocolo
          </button>
        )}
      </div>

      {faltantes.length > 0 && (
        <Notice title={`Faltan ${faltantes.length} protocolo${faltantes.length === 1 ? "" : "s"} vigente${faltantes.length === 1 ? "" : "s"} exigido${faltantes.length === 1 ? "" : "s"} por el DS20`} tone="amber">
          <div className="mt-1 flex flex-wrap gap-2">
            {faltantes.map((tipo) => (
              canManage ? (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => openNew(tipo)}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  + {PROTOCOLO_TIPO_LABEL[tipo]}
                </button>
              ) : (
                <span key={tipo} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                  {PROTOCOLO_TIPO_LABEL[tipo]}
                </span>
              )
            ))}
          </div>
        </Notice>
      )}

      {items.length === 0 ? (
        <EmptyState compact title="Sin protocolos registrados" description="Documenta los protocolos de urgencias médicas, fallecimiento, ingreso, egreso y aseo/desinfección." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => {
            const tone = PROTOCOLO_ESTADO_TONE[item.estado] ?? "slate";
            return (
              <div key={item.id} className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">{PROTOCOLO_TIPO_LABEL[item.tipo] ?? item.tipo}</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{item.titulo}</p>
                  </div>
                  <Badge tone={tone}>{PROTOCOLO_ESTADO_LABEL[item.estado] ?? item.estado}</Badge>
                </div>
                {item.contenido ? (
                  <p className="mt-2 text-xs leading-5 text-slate-600 line-clamp-3 whitespace-pre-wrap">{item.contenido}</p>
                ) : (
                  <p className="mt-2 text-xs italic text-slate-400">Sin contenido redactado.</p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-50 pt-3">
                  <p className="text-xs text-slate-400">
                    v{item.version}
                    {item.fecha_aprobacion ? ` · aprobado ${formatDateOnly(item.fecha_aprobacion)}` : ""}
                  </p>
                  <div className="flex gap-1.5">
                    {item.contenido && (
                      <button type="button" onClick={() => setReading(item)} className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Leer</button>
                    )}
                    {canManage && (
                      <button type="button" onClick={() => openEdit(item)} className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Editar</button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        disabled={deleting === item.id}
                        onClick={() => handleDelete(item)}
                        className="rounded-xl border border-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        {deleting === item.id ? "..." : "Eliminar"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal !== null} onClose={() => setModal(null)} title={modal === "edit" ? "Editar protocolo" : "Nuevo protocolo"} panelClassName="max-w-3xl p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGrid columns={2}>
            <SelectField
              id="pr-tipo"
              name="tipo"
              label="Tipo de protocolo"
              value={form.tipo}
              onChange={f("tipo")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(PROTOCOLO_TIPO_LABEL)}
              hint={PROTOCOLO_TIPO_DESC[form.tipo]}
            />
            <TextField
              id="pr-titulo"
              name="titulo"
              label="Título"
              value={form.titulo}
              onChange={f("titulo")}
              required
              disabled={saving}
            />
            <SelectField
              id="pr-estado"
              name="estado"
              label="Estado"
              value={form.estado}
              onChange={f("estado")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(PROTOCOLO_ESTADO_LABEL)}
              hint="Solo puede haber un protocolo vigente por tipo."
            />
            <TextField
              id="pr-aprobacion"
              name="fecha_aprobacion"
              label="Fecha de aprobación"
              type="date"
              value={form.fecha_aprobacion}
              onChange={f("fecha_aprobacion")}
              disabled={saving}
            />
          </FormGrid>
          <TextareaField
            id="pr-contenido"
            name="contenido"
            label="Contenido del protocolo"
            value={form.contenido}
            onChange={f("contenido")}
            rows={10}
            disabled={saving}
            placeholder={"1. Objetivo\n2. Alcance\n3. Responsables\n4. Pasos de actuación\n5. Contactos de derivación..."}
          />
          <SubmitBar submitLabel="Guardar" busyLabel="Guardando..." busy={saving} onCancel={() => setModal(null)} />
        </form>
      </Modal>

      <Modal isOpen={reading !== null} onClose={() => setReading(null)} title={reading?.titulo ?? ""} panelClassName="max-w-3xl p-4 sm:p-6">
        {reading && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={PROTOCOLO_ESTADO_TONE[reading.estado] ?? "slate"}>{PROTOCOLO_ESTADO_LABEL[reading.estado] ?? reading.estado}</Badge>
              <span className="text-xs text-slate-400">
                {PROTOCOLO_TIPO_LABEL[reading.tipo] ?? reading.tipo} · v{reading.version}
                {reading.fecha_aprobacion ? ` · aprobado ${formatDateOnly(reading.fecha_aprobacion)}` : ""}
              </span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{reading.contenido}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Reporte SENAMA Tab ──────────────────────────────────────────────────────

function DatoRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-sm font-bold tabular-nums text-slate-900">{value ?? "—"}</p>
    </div>
  );
}

function ReporteDatos({ datos }) {
  const residentes = datos?.residentes ?? {};
  const dependencia = residentes.por_dependencia ?? {};
  const personal = datos?.personal ?? {};
  const capacitacion = datos?.capacitacion ?? {};
  const simulacros = datos?.simulacros ?? {};
  const reclamos = datos?.reclamos ?? {};
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Residentes</p>
        <DatoRow label="Activos" value={residentes.activos} />
        <DatoRow label="Hospitalizados" value={residentes.hospitalizados} />
        <DatoRow label="Dependencia leve" value={dependencia.leve} />
        <DatoRow label="Dependencia moderada" value={dependencia.moderado} />
        <DatoRow label="Dependencia severa" value={dependencia.severo} />
        <DatoRow label="Dependencia total" value={dependencia.total_dependencia} />
        <DatoRow label="Sin clasificar" value={dependencia.sin_clasificar} />
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Personal y gestión</p>
        <DatoRow label="Personal activo" value={personal.total_activos} />
        <DatoRow label="Horas de capacitación (año)" value={capacitacion.horas_anio_actual} />
        <DatoRow label="Simulacros (año)" value={simulacros.total_anio_actual} />
        <DatoRow label="Último simulacro" value={simulacros.ultimo ? formatDateOnly(simulacros.ultimo) : "—"} />
        <DatoRow label="Reclamos abiertos" value={reclamos.abiertos} />
        <DatoRow label="Reclamos resueltos (año)" value={reclamos.resueltos_anio_actual} />
      </div>
    </div>
  );
}

function SenamaTab({ canManage }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [sending, setSending] = useState(null);
  const [comprobante, setComprobante] = useState("");
  const [savingSend, setSavingSend] = useState(false);

  const periodo = currentPeriodo();
  const reporteActual = items.find((i) => i.periodo === periodo) ?? null;

  useEffect(() => {
    getReportesSenama()
      .then(setItems)
      .catch((err) => toast(err.message || "Error al cargar reportes", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleGenerar = async () => {
    if (reporteActual) {
      const ok = await confirm({
        title: "Regenerar reporte",
        message: `Ya existe un reporte para ${periodo}. Se reemplazarán sus datos con la información actual del ELEAM.`,
        confirmText: "Regenerar",
      });
      if (!ok) return;
    }
    setGenerating(true);
    try {
      const saved = await generarReporteSenama(periodo);
      setItems((prev) => {
        const rest = prev.filter((i) => i.id !== saved.id && i.periodo !== saved.periodo);
        return [saved, ...rest].sort((a, b) => b.periodo.localeCompare(a.periodo));
      });
      toast(`Reporte ${periodo} generado`, "success");
    } catch (err) {
      toast(err.message || "Error al generar el reporte", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleMarcarEnviado = async (e) => {
    e.preventDefault();
    if (!sending) return;
    setSavingSend(true);
    try {
      const saved = await marcarReporteEnviado(sending.id, comprobante);
      setItems((prev) => prev.map((i) => i.id === saved.id ? saved : i));
      setSending(null);
      setComprobante("");
      toast("Reporte marcado como enviado", "success");
    } catch (err) {
      toast(err.message || "Error al actualizar", "error");
    } finally {
      setSavingSend(false);
    }
  };

  if (loading) return <Loading message="Cargando reportes..." />;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Período actual: {periodo}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Consolida residentes, personal, capacitación, simulacros y reclamos en un snapshot trimestral.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerar}
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {generating ? "Generando..." : reporteActual ? "Regenerar reporte" : "Generar reporte"}
            </button>
          )}
        </div>
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          El envío a SENAMA se realiza por sus canales oficiales. Aquí queda el respaldo del reporte generado
          y su constancia de envío para la fiscalización.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState compact title="Sin reportes generados" description="Genera el primer reporte trimestral con los datos actuales del ELEAM." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const tone = REPORTE_ESTADO_TONE[item.estado] ?? "slate";
            return (
              <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">Reporte {item.periodo}</p>
                    <Badge tone={tone}>{REPORTE_ESTADO_LABEL[item.estado] ?? item.estado}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setViewing(item)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      Ver datos
                    </button>
                    {canManage && item.estado !== "enviado" && (
                      <button
                        type="button"
                        onClick={() => { setSending(item); setComprobante(""); }}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Marcar enviado
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Generado {formatDateTime(item.creado_en)}{item.generador?.nombre ? ` por ${item.generador.nombre}` : ""}
                  {item.enviado_en ? ` · Enviado ${formatDateTime(item.enviado_en)}${item.emisor?.nombre ? ` por ${item.emisor.nombre}` : ""}` : ""}
                  {item.comprobante ? ` · Constancia: ${item.comprobante}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={viewing !== null} onClose={() => setViewing(null)} title={viewing ? `Reporte SENAMA ${viewing.periodo}` : ""} panelClassName="max-w-3xl p-4 sm:p-6">
        {viewing && (
          <div className="space-y-4">
            <ReporteDatos datos={viewing.datos} />
            {viewing.observaciones && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Observaciones</p>
                <p className="rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-700 whitespace-pre-wrap">{viewing.observaciones}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={sending !== null} onClose={() => setSending(null)} title={sending ? `Marcar enviado — ${sending.periodo}` : ""}>
        <form onSubmit={handleMarcarEnviado} className="space-y-4">
          <p className="text-sm text-slate-600">
            Registra la constancia del envío realizado a SENAMA (N° de oficio, correo o folio de la plataforma).
          </p>
          <TextField
            id="rs-comprobante"
            name="comprobante"
            label="Constancia de envío"
            value={comprobante}
            onChange={(e) => setComprobante(e.target.value)}
            disabled={savingSend}
            placeholder="Ej: Oficio N° 123 / correo del 15-06-2026"
          />
          <SubmitBar submitLabel="Confirmar envío" busyLabel="Guardando..." busy={savingSend} onCancel={() => setSending(null)} />
        </form>
      </Modal>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function CumplimientoPage() {
  const { can, isAdminEleam } = useAuth();
  const [tab, setTab] = useState("transitorios");

  const canManage = isAdminEleam || can("gestionar_cumplimiento");

  return (
    <PageLayout
      title="Cumplimiento DS20"
      eyebrow="Decreto N°20 MINSAL"
      description="Plazos transitorios, matriz de brechas, protocolos operativos y reportes a SENAMA."
      coachFeatureId="cumplimiento"
    >
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      <div key={tab}>
        {tab === "transitorios" && <TransitoriosTab canManage={canManage} canDelete={isAdminEleam} />}
        {tab === "protocolos" && <ProtocolosTab canManage={canManage} canDelete={isAdminEleam} />}
        {tab === "senama" && <SenamaTab canManage={canManage} />}
      </div>
    </PageLayout>
  );
}
