import { useCallback, useEffect, useMemo, useState } from "react";
import PageLayout from "../../layout/PageLayout";
import Badge from "../../components/Badge";
import MetricCard from "../../components/MetricCard";
import { IconPlus } from "../../components/icons";
import Modal from "../../components/Modal";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import {
  FormGrid,
  SelectField,
  SubmitBar,
  TextareaField,
  TextField,
} from "../../components/forms/FormKit";
import { formatDate, formatDateOnly, formatDateTime } from "../../utils/dateUtils";
import {
  RECLAMO_CANAL_LABEL,
  RECLAMO_CATEGORIA_LABEL,
  RECLAMO_ESTADO_LABEL,
  RECLAMO_ESTADO_TONE,
  RECLAMO_PRIORIDAD_LABEL,
  RECLAMO_PRIORIDAD_TONE,
  RECLAMO_SOL_TIPO_LABEL,
  RECLAMO_TIPO_LABEL,
  RECLAMO_TIPO_TONE,
  createReclamo,
  getReclamos,
  updateReclamoEstado,
} from "./reclamosService";

const FILTER_TIPO = [["", "Todos los tipos"], ...Object.entries(RECLAMO_TIPO_LABEL)];
const FILTER_ESTADO = [["", "Todos los estados"], ...Object.entries(RECLAMO_ESTADO_LABEL)];

const NUEVO_INIT = {
  tipo: "reclamo",
  canal: "presencial",
  descripcion: "",
  solicitante_nombre: "",
  solicitante_tipo: "familiar",
  prioridad: "normal",
  categoria: "",
  fecha_compromiso: "",
};

const GESTION_INIT = {
  estado: "en_proceso",
  prioridad: "normal",
  categoria: "",
  respuesta: "",
  fecha_compromiso: "",
};

export default function ReclamosPage() {
  const { isAdminEleam, can } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [selected, setSelected] = useState(null);
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevoForm, setNuevoForm] = useState(NUEVO_INIT);
  const [gestionForm, setGestionForm] = useState(GESTION_INIT);
  const [saving, setSaving] = useState(false);

  const canManage = isAdminEleam || can("gestionar_reclamos");

  const fn = (field) => (e) => setNuevoForm((p) => ({ ...p, [field]: e.target.value }));
  const fg = (field) => (e) => setGestionForm((p) => ({ ...p, [field]: e.target.value }));

  const load = useCallback(async () => {
    try {
      setItems(await getReclamos());
    } catch (err) {
      toast(err.message || "Error al cargar reclamos", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => items.filter((i) =>
      (!filterTipo || i.tipo === filterTipo) && (!filterEstado || i.estado === filterEstado)
    ),
    [items, filterTipo, filterEstado],
  );

  const openReclamo = (item) => {
    setSelected(item);
    setGestionForm({
      estado: item.estado,
      prioridad: item.prioridad,
      categoria: item.categoria ?? "",
      respuesta: item.respuesta ?? "",
      fecha_compromiso: item.fecha_compromiso ?? "",
    });
  };

  const handleNuevo = async (e) => {
    e.preventDefault();
    if (!nuevoForm.descripcion?.trim() || nuevoForm.descripcion.trim().length < 10) {
      toast("La descripción debe tener al menos 10 caracteres", "error");
      return;
    }
    setSaving(true);
    try {
      const saved = await createReclamo(nuevoForm);
      setItems((prev) => [saved, ...prev]);
      setShowNuevo(false);
      setNuevoForm(NUEVO_INIT);
      toast(`Folio ${saved.folio} registrado`, "success");
    } catch (err) {
      toast(err.message || "Error al registrar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleGestion = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const saved = await updateReclamoEstado(selected.id, gestionForm);
      setItems((prev) => prev.map((i) => i.id === saved.id ? saved : i));
      setSelected(saved);
      toast("Reclamo actualizado", "success");
    } catch (err) {
      toast(err.message || "Error al actualizar", "error");
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => ({
    abiertos: items.filter((i) => i.estado === "abierto").length,
    en_proceso: items.filter((i) => i.estado === "en_proceso").length,
    resueltos: items.filter((i) => i.estado === "resuelto").length,
    urgentes: items.filter((i) => i.prioridad === "urgente" && i.estado !== "resuelto").length,
  }), [items]);

  return (
    <PageLayout
      title="Reclamos y Sugerencias"
      eyebrow="DS20 Art. 27"
      description="Gestión de reclamos, sugerencias, felicitaciones y consultas del ELEAM."
      coachFeatureId="reclamos"
    >
      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard size="sm" label="Abiertos" value={stats.abiertos} tone="amber" />
        <MetricCard size="sm" label="En proceso" value={stats.en_proceso} tone="sky" />
        <MetricCard size="sm" label="Resueltos" value={stats.resueltos} tone="emerald" />
        <MetricCard size="sm" label="Urgentes" value={stats.urgentes} tone="rose" />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-wrap gap-2">
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            {FILTER_TIPO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            {FILTER_ESTADO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={() => { setNuevoForm(NUEVO_INIT); setShowNuevo(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          <IconPlus />
          Registrar
        </button>
      </div>

      {/* List */}
      {loading ? (
        <Loading message="Cargando..." />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-slate-600">Sin registros</p>
          <p className="mt-1 text-xs text-slate-400">
            {items.length === 0
              ? "Aún no hay reclamos ni sugerencias registrados."
              : "Ningún registro coincide con los filtros seleccionados."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Folio / Tipo</th>
                <th className="hidden px-4 py-2.5 text-left text-xs font-semibold text-slate-500 sm:table-cell">Descripción</th>
                <th className="hidden px-4 py-2.5 text-left text-xs font-semibold text-slate-500 md:table-cell">Estado</th>
                <th className="hidden px-4 py-2.5 text-left text-xs font-semibold text-slate-500 lg:table-cell">Prioridad</th>
                <th className="hidden px-4 py-2.5 text-left text-xs font-semibold text-slate-500 md:table-cell">Fecha</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((item) => {
                const tipoTone = RECLAMO_TIPO_TONE[item.tipo] ?? "slate";
                const estadoTone = RECLAMO_ESTADO_TONE[item.estado] ?? "slate";
                const priTone = RECLAMO_PRIORIDAD_TONE[item.prioridad] ?? "slate";
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-slate-600">{item.folio}</p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        <Badge tone={tipoTone}>{RECLAMO_TIPO_LABEL[item.tipo] ?? item.tipo}</Badge>
                        {item.prioridad === "urgente" && <Badge tone="rose">Urgente</Badge>}
                        <span className="md:hidden">
                          <Badge tone={estadoTone}>{RECLAMO_ESTADO_LABEL[item.estado] ?? item.estado}</Badge>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400 md:hidden">{formatDate(item.creado_en)}</p>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <p className="max-w-xs text-xs text-slate-600 line-clamp-2">{item.descripcion}</p>
                      {item.solicitante_nombre && (
                        <p className="mt-0.5 text-xs text-slate-400">{item.solicitante_nombre} · {RECLAMO_SOL_TIPO_LABEL[item.solicitante_tipo] ?? item.solicitante_tipo}</p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Badge tone={estadoTone}>{RECLAMO_ESTADO_LABEL[item.estado] ?? item.estado}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <Badge tone={priTone}>{RECLAMO_PRIORIDAD_LABEL[item.prioridad] ?? item.prioridad}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-slate-500 md:table-cell">
                      {formatDate(item.creado_en)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openReclamo(item)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo reclamo */}
      <Modal isOpen={showNuevo} onClose={() => setShowNuevo(false)} title="Registrar reclamo / sugerencia">
        <form onSubmit={handleNuevo} className="space-y-4">
          <FormGrid columns={2}>
            <SelectField
              id="nr-tipo"
              name="tipo"
              label="Tipo"
              value={nuevoForm.tipo}
              onChange={fn("tipo")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(RECLAMO_TIPO_LABEL)}
            />
            <SelectField
              id="nr-canal"
              name="canal"
              label="Canal de ingreso"
              value={nuevoForm.canal}
              onChange={fn("canal")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(RECLAMO_CANAL_LABEL).filter(([k]) => k !== "familiar_portal")}
            />
            <TextField
              id="nr-nombre"
              name="solicitante_nombre"
              label="Nombre del solicitante"
              value={nuevoForm.solicitante_nombre}
              onChange={fn("solicitante_nombre")}
              disabled={saving}
              placeholder="Opcional — dejar vacío si anónimo"
            />
            <SelectField
              id="nr-sol-tipo"
              name="solicitante_tipo"
              label="Tipo de solicitante"
              value={nuevoForm.solicitante_tipo}
              onChange={fn("solicitante_tipo")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(RECLAMO_SOL_TIPO_LABEL)}
            />
            <SelectField
              id="nr-prio"
              name="prioridad"
              label="Prioridad"
              value={nuevoForm.prioridad}
              onChange={fn("prioridad")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(RECLAMO_PRIORIDAD_LABEL)}
            />
            <SelectField
              id="nr-cat"
              name="categoria"
              label="Categoría"
              value={nuevoForm.categoria}
              onChange={fn("categoria")}
              disabled={saving}
              options={Object.entries(RECLAMO_CATEGORIA_LABEL)}
            />
            <TextField
              id="nr-compromiso"
              name="fecha_compromiso"
              label="Fecha compromiso"
              type="date"
              value={nuevoForm.fecha_compromiso}
              onChange={fn("fecha_compromiso")}
              disabled={saving}
            />
          </FormGrid>
          <TextareaField
            id="nr-desc"
            name="descripcion"
            label="Descripción"
            value={nuevoForm.descripcion}
            onChange={fn("descripcion")}
            rows={5}
            required
            disabled={saving}
            placeholder="Describir el reclamo, sugerencia o consulta en detalle..."
          />
          <SubmitBar submitLabel="Registrar" busyLabel="Registrando..." busy={saving} onCancel={() => setShowNuevo(false)} />
        </form>
      </Modal>

      {/* Modal detalle / gestión */}
      <Modal isOpen={selected !== null} onClose={() => setSelected(null)} title={selected ? `Folio ${selected.folio}` : ""}>
        {selected && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <InfoRow label="Tipo" value={<Badge tone={RECLAMO_TIPO_TONE[selected.tipo] ?? "slate"}>{RECLAMO_TIPO_LABEL[selected.tipo] ?? selected.tipo}</Badge>} />
              <InfoRow label="Canal" value={RECLAMO_CANAL_LABEL[selected.canal] ?? selected.canal} />
              <InfoRow label="Estado" value={<Badge tone={RECLAMO_ESTADO_TONE[selected.estado] ?? "slate"}>{RECLAMO_ESTADO_LABEL[selected.estado] ?? selected.estado}</Badge>} />
              <InfoRow label="Prioridad" value={<Badge tone={RECLAMO_PRIORIDAD_TONE[selected.prioridad] ?? "slate"}>{RECLAMO_PRIORIDAD_LABEL[selected.prioridad] ?? selected.prioridad}</Badge>} />
              {selected.solicitante_nombre && <InfoRow label="Solicitante" value={`${selected.solicitante_nombre} (${RECLAMO_SOL_TIPO_LABEL[selected.solicitante_tipo] ?? selected.solicitante_tipo})`} />}
              {selected.categoria && <InfoRow label="Categoría" value={RECLAMO_CATEGORIA_LABEL[selected.categoria] ?? selected.categoria} />}
              {selected.fecha_compromiso && <InfoRow label="Compromiso" value={formatDateOnly(selected.fecha_compromiso)} />}
              <InfoRow label="Recibido" value={formatDateTime(selected.creado_en)} />
            </div>

            {/* Descripción */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Descripción</p>
              <p className="rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-700 whitespace-pre-wrap">{selected.descripcion}</p>
            </div>

            {/* Respuesta existente */}
            {selected.respuesta && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Respuesta registrada</p>
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800 whitespace-pre-wrap">{selected.respuesta}</p>
                {selected.fecha_respuesta && (
                  <p className="mt-1 text-right text-xs text-slate-400">{formatDateTime(selected.fecha_respuesta)}</p>
                )}
              </div>
            )}

            {/* Caso resuelto: permitir reabrir */}
            {canManage && selected.estado === "resuelto" && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                <p className="text-sm text-emerald-800">Este caso está resuelto.</p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const saved = await updateReclamoEstado(selected.id, { estado: "en_proceso", prioridad: selected.prioridad, categoria: selected.categoria ?? "", fecha_compromiso: selected.fecha_compromiso ?? "" });
                      setItems((prev) => prev.map((i) => i.id === saved.id ? saved : i));
                      setSelected(saved);
                      setGestionForm((p) => ({ ...p, estado: "en_proceso" }));
                      toast("Caso reabierto", "success");
                    } catch (err) {
                      toast(err.message || "Error al reabrir", "error");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="shrink-0 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                  Reabrir caso
                </button>
              </div>
            )}

            {/* Formulario de gestión */}
            {canManage && selected.estado !== "resuelto" && (
              <form onSubmit={handleGestion} className="space-y-4 border-t border-slate-100 pt-5">
                <p className="text-sm font-semibold text-slate-800">Actualizar estado</p>
                <FormGrid columns={2}>
                  <SelectField
                    id="gs-estado"
                    name="estado"
                    label="Nuevo estado"
                    value={gestionForm.estado}
                    onChange={fg("estado")}
                    disabled={saving}
                    placeholder={null}
                    options={Object.entries(RECLAMO_ESTADO_LABEL)}
                  />
                  <SelectField
                    id="gs-prio"
                    name="prioridad"
                    label="Prioridad"
                    value={gestionForm.prioridad}
                    onChange={fg("prioridad")}
                    disabled={saving}
                    placeholder={null}
                    options={Object.entries(RECLAMO_PRIORIDAD_LABEL)}
                  />
                  <SelectField
                    id="gs-cat"
                    name="categoria"
                    label="Categoría"
                    value={gestionForm.categoria}
                    onChange={fg("categoria")}
                    disabled={saving}
                    options={Object.entries(RECLAMO_CATEGORIA_LABEL)}
                  />
                  <TextField
                    id="gs-compromiso"
                    name="fecha_compromiso"
                    label="Fecha compromiso"
                    type="date"
                    value={gestionForm.fecha_compromiso}
                    onChange={fg("fecha_compromiso")}
                    disabled={saving}
                  />
                </FormGrid>
                <TextareaField
                  id="gs-resp"
                  name="respuesta"
                  label="Respuesta al solicitante"
                  value={gestionForm.respuesta}
                  onChange={fg("respuesta")}
                  rows={4}
                  disabled={saving}
                  placeholder="Registrar la respuesta formal al solicitante..."
                />
                <SubmitBar submitLabel="Actualizar" busyLabel="Guardando..." busy={saving} onCancel={() => setSelected(null)} />
              </form>
            )}
          </div>
        )}
      </Modal>
    </PageLayout>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm text-slate-700">{value}</div>
    </div>
  );
}
