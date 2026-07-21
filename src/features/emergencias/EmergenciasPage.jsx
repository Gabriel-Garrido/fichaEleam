import { useCallback, useEffect, useState } from "react";
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
import { formatDateOnly } from "../../utils/dateUtils";
import {
  BIEN_CATEGORIA_LABEL,
  BIEN_ESTADO_LABEL,
  BIEN_ESTADO_TONE,
  ESCENARIO_TIPO_LABEL,
  PLAN_ESTADO_LABEL,
  PLAN_ESTADO_TONE,
  SIMULACRO_RESULTADO_LABEL,
  SIMULACRO_RESULTADO_TONE,
  SIMULACRO_TIPO_LABEL,
  deleteEscenario,
  deleteInventarioBien,
  deleteSimulacro,
  getEscenarios,
  getInventarioBienes,
  getPlanEmergencias,
  getSimulacros,
  saveEscenario,
  saveInventarioBien,
  savePlanEmergencias,
  saveSimulacro,
} from "./emergenciasService";

const ESCENARIO_TIPO_PATH = {
  incendio: "M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z",
  sismo: "M6.115 5.19l.319 1.913A6 6 0 008.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 002.288-4.042 1.087 1.087 0 00-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 01-.98-.314l-.295-.295a1.125 1.125 0 010-1.591l.13-.132a1.125 1.125 0 011.3-.21l.603.302a.809.809 0 001.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 001.528-1.732l.146-.292M6.115 5.19A9 9 0 1017.18 4.64M6.115 5.19A8.965 8.965 0 0112 3c1.929 0 3.716.607 5.18 1.64",
  inundacion: "M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z",
  emergencia_medica: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z",
  corte_suministro: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  evacuacion: "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9",
  otro: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
};

function EscenarioTipoIcon({ tipo, className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={ESCENARIO_TIPO_PATH[tipo] ?? ESCENARIO_TIPO_PATH.otro} />
    </svg>
  );
}

const TABS = [
  { id: "plan", label: "Plan" },
  { id: "escenarios", label: "Escenarios" },
  { id: "simulacros", label: "Simulacros" },
  { id: "inventario", label: "Inventario" },
];

// ─── Plan Tab ────────────────────────────────────────────────────────────────

const PLAN_INIT = {
  titulo: "Plan de Emergencias y Desastres",
  estado: "borrador",
  objetivo_general: "",
  alcance: "",
  fecha_aprobacion: "",
  fecha_revision: "",
};

function PlanTab({ plan, onChange: notifyChange, canManage }) {
  const toast = useToast();
  const [form, setForm] = useState(PLAN_INIT);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  useEffect(() => {
    if (plan) {
      setForm({
        titulo: plan.titulo ?? "Plan de Emergencias y Desastres",
        estado: plan.estado ?? "borrador",
        objetivo_general: plan.objetivo_general ?? "",
        alcance: plan.alcance ?? "",
        fecha_aprobacion: plan.fecha_aprobacion ?? "",
        fecha_revision: plan.fecha_revision ?? "",
      });
    }
  }, [plan]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await savePlanEmergencias(form, plan?.id ?? null);
      notifyChange(saved);
      setEditing(false);
      toast("Plan guardado", "success");
    } catch (err) {
      toast(err.message || "Error al guardar el plan", "error");
    } finally {
      setSaving(false);
    }
  }, [form, plan, notifyChange, toast]);

  if (!plan && !editing) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-teal-50">
          <svg className="h-7 w-7 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-800">Sin plan de emergencias</p>
        <p className="mt-1 text-sm text-slate-500">El ELEAM aún no tiene un plan de emergencias y desastres registrado.</p>
        {canManage && (
          <button type="button" onClick={() => setEditing(true)} className="mt-5 rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Crear plan
          </button>
        )}
      </div>
    );
  }

  if (!editing) {
    const tone = PLAN_ESTADO_TONE[plan.estado] ?? "slate";
    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{plan.titulo}</h2>
              <Badge tone={tone}>{PLAN_ESTADO_LABEL[plan.estado] ?? plan.estado}</Badge>
              <span className="text-xs text-slate-400">v{plan.version}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-slate-500">
              {plan.fecha_aprobacion && <span>Aprobado: {formatDateOnly(plan.fecha_aprobacion)}</span>}
              {plan.fecha_revision && <span>Revisión programada: {formatDateOnly(plan.fecha_revision)}</span>}
            </div>
          </div>
          {canManage && (
            <button type="button" onClick={() => setEditing(true)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Editar
            </button>
          )}
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {plan.objetivo_general ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Objetivo general</p>
              <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{plan.objetivo_general}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
              Sin objetivo general registrado
            </div>
          )}
          {plan.alcance ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Alcance</p>
              <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{plan.alcance}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
              Sin alcance registrado
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-base font-bold text-slate-900">{plan ? "Editar plan de emergencias" : "Crear plan de emergencias"}</h2>
        <p className="mt-0.5 text-sm text-slate-500">DS20 Art. 25 N°3 — Requerido para acreditación SEREMI.</p>
      </div>
      <form onSubmit={handleSubmit} className="p-5">
        <FormGrid columns={2}>
          <TextField
            id="pe-titulo"
            name="titulo"
            label="Título del plan"
            value={form.titulo}
            onChange={f("titulo")}
            required
            disabled={saving}
          />
          <SelectField
            id="pe-estado"
            name="estado"
            label="Estado"
            value={form.estado}
            onChange={f("estado")}
            disabled={saving}
            placeholder={null}
            options={[
              ["borrador", "Borrador"],
              ["vigente", "Vigente"],
              ["revision", "En revisión"],
            ]}
          />
          <TextField
            id="pe-aprobacion"
            name="fecha_aprobacion"
            label="Fecha de aprobación"
            type="date"
            value={form.fecha_aprobacion}
            onChange={f("fecha_aprobacion")}
            disabled={saving}
          />
          <TextField
            id="pe-revision"
            name="fecha_revision"
            label="Próxima revisión"
            type="date"
            value={form.fecha_revision}
            onChange={f("fecha_revision")}
            disabled={saving}
          />
        </FormGrid>
        <div className="mt-4 space-y-4">
          <TextareaField
            id="pe-objetivo"
            name="objetivo_general"
            label="Objetivo general"
            value={form.objetivo_general}
            onChange={f("objetivo_general")}
            rows={4}
            disabled={saving}
            placeholder="Describir el propósito del plan de emergencias del ELEAM..."
          />
          <TextareaField
            id="pe-alcance"
            name="alcance"
            label="Alcance"
            value={form.alcance}
            onChange={f("alcance")}
            rows={4}
            disabled={saving}
            placeholder="Personas, áreas e instalaciones que cubre este plan..."
          />
        </div>
        <SubmitBar
          submitLabel="Guardar plan"
          busyLabel="Guardando..."
          busy={saving}
          onCancel={() => setEditing(false)}
        />
      </form>
    </div>
  );
}

// ─── Escenarios Tab ──────────────────────────────────────────────────────────

const ESCENARIO_INIT = {
  nombre: "",
  tipo: "incendio",
  descripcion: "",
  procedimiento: "",
  recursos_necesarios: "",
  punto_encuentro: "",
};

function EscenariosTab({ planId, canManage }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(ESCENARIO_INIT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const load = useCallback(async () => {
    if (!planId) { setLoading(false); return; }
    try {
      setItems(await getEscenarios(planId));
    } catch (err) {
      toast(err.message || "Error al cargar escenarios", "error");
    } finally {
      setLoading(false);
    }
  }, [planId, toast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(ESCENARIO_INIT); setModal("new"); };
  const openEdit = (item) => {
    setForm({
      nombre: item.nombre ?? "",
      tipo: item.tipo ?? "incendio",
      descripcion: item.descripcion ?? "",
      procedimiento: item.procedimiento ?? "",
      recursos_necesarios: item.recursos_necesarios ?? "",
      punto_encuentro: item.punto_encuentro ?? "",
      _id: item.id,
    });
    setModal("edit");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre?.trim()) { toast("Ingresa el nombre del escenario", "error"); return; }
    setSaving(true);
    try {
      const saved = await saveEscenario(planId, form, form._id ?? null);
      if (form._id) {
        setItems((prev) => prev.map((i) => i.id === saved.id ? saved : i));
      } else {
        setItems((prev) => [...prev, saved]);
      }
      setModal(null);
      toast("Escenario guardado", "success");
    } catch (err) {
      toast(err.message || "Error al guardar escenario", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: "Eliminar escenario",
      message: `Se eliminará "${item.nombre}" y dejará de estar disponible para nuevos simulacros. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    setDeleting(item.id);
    try {
      await deleteEscenario(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast("Escenario eliminado", "success");
    } catch (err) {
      toast(err.message || "Error al eliminar", "error");
    } finally {
      setDeleting(null);
    }
  };

  if (!planId) {
    return (
      <Notice title="Crea primero el plan de emergencias" tone="amber">
        Ve a la pestaña &quot;Plan&quot; y crea el plan base antes de agregar escenarios.
      </Notice>
    );
  }

  if (loading) return <Loading message="Cargando escenarios..." />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Escenarios de emergencia</h2>
          <p className="text-sm text-slate-500">Procedimientos documentados por tipo de emergencia.</p>
        </div>
        {canManage && (
          <button type="button" onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            <IconPlus />
            Agregar
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState compact title="Sin escenarios registrados" description="Registra los procedimientos para incendio, sismo, evacuación, etc." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600">
                    <EscenarioTipoIcon tipo={item.tipo} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{item.nombre}</p>
                    <p className="text-xs text-slate-500">{ESCENARIO_TIPO_LABEL[item.tipo] ?? item.tipo}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEdit(item)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Editar</button>
                    <button
                      type="button"
                      disabled={deleting === item.id}
                      onClick={() => handleDelete(item)}
                      className="rounded-xl border border-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {deleting === item.id ? "..." : "Eliminar"}
                    </button>
                  </div>
                )}
              </div>
              {(item.descripcion || item.punto_encuentro) && (
                <div className="mt-3 grid gap-3 border-t border-slate-50 pt-3 sm:grid-cols-2">
                  {item.descripcion && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Descripción</p>
                      <p className="mt-1 text-xs text-slate-600 line-clamp-3">{item.descripcion}</p>
                    </div>
                  )}
                  {item.punto_encuentro && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Punto de encuentro</p>
                      <p className="mt-1 text-xs text-slate-600">{item.punto_encuentro}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal !== null} onClose={() => setModal(null)} title={modal === "edit" ? "Editar escenario" : "Nuevo escenario"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGrid columns={2}>
            <TextField
              id="esc-nombre"
              name="nombre"
              label="Nombre del escenario"
              value={form.nombre}
              onChange={f("nombre")}
              required
              disabled={saving}
              placeholder="Ej: Incendio en cocina"
            />
            <SelectField
              id="esc-tipo"
              name="tipo"
              label="Tipo"
              value={form.tipo}
              onChange={f("tipo")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(ESCENARIO_TIPO_LABEL)}
            />
          </FormGrid>
          <TextareaField
            id="esc-desc"
            name="descripcion"
            label="Descripción"
            value={form.descripcion}
            onChange={f("descripcion")}
            rows={3}
            disabled={saving}
          />
          <TextareaField
            id="esc-proc"
            name="procedimiento"
            label="Procedimiento de respuesta"
            value={form.procedimiento}
            onChange={f("procedimiento")}
            rows={5}
            disabled={saving}
            placeholder="Pasos a seguir en caso de este escenario..."
          />
          <FormGrid columns={2}>
            <TextareaField
              id="esc-rec"
              name="recursos_necesarios"
              label="Recursos necesarios"
              value={form.recursos_necesarios}
              onChange={f("recursos_necesarios")}
              rows={3}
              disabled={saving}
            />
            <TextField
              id="esc-pe"
              name="punto_encuentro"
              label="Punto de encuentro"
              value={form.punto_encuentro}
              onChange={f("punto_encuentro")}
              disabled={saving}
              placeholder="Ej: Estacionamiento principal"
            />
          </FormGrid>
          <SubmitBar submitLabel="Guardar" busyLabel="Guardando..." busy={saving} onCancel={() => setModal(null)} />
        </form>
      </Modal>
    </div>
  );
}

// ─── Simulacros Tab ──────────────────────────────────────────────────────────

const SIMULACRO_INIT = {
  escenario_id: "",
  fecha_realizado: "",
  tipo_simulacro: "parcial",
  duracion_min: "",
  participantes: "",
  resultado: "satisfactorio",
  observaciones: "",
  acciones_mejora: "",
};

function SimulacrosTab({ planId, canRegister, canManage, canDelete }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [escenarios, setEscenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(SIMULACRO_INIT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const load = useCallback(async () => {
    if (!planId) { setLoading(false); return; }
    try {
      const [sims, escs] = await Promise.all([getSimulacros(planId), getEscenarios(planId)]);
      setItems(sims);
      setEscenarios(escs);
    } catch (err) {
      toast(err.message || "Error al cargar simulacros", "error");
    } finally {
      setLoading(false);
    }
  }, [planId, toast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(SIMULACRO_INIT); setModal("new"); };
  const openEdit = (item) => {
    setForm({
      escenario_id: item.escenario_id ?? "",
      fecha_realizado: item.fecha_realizado ?? "",
      tipo_simulacro: item.tipo_simulacro ?? "parcial",
      duracion_min: item.duracion_min != null ? String(item.duracion_min) : "",
      participantes: item.participantes != null ? String(item.participantes) : "",
      resultado: item.resultado ?? "satisfactorio",
      observaciones: item.observaciones ?? "",
      acciones_mejora: item.acciones_mejora ?? "",
      _id: item.id,
    });
    setModal("edit");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fecha_realizado) { toast("Selecciona la fecha del simulacro", "error"); return; }
    setSaving(true);
    try {
      const saved = await saveSimulacro(planId, form, form._id ?? null);
      if (form._id) {
        setItems((prev) => prev.map((i) => i.id === saved.id ? saved : i));
      } else {
        setItems((prev) => [saved, ...prev]);
      }
      setModal(null);
      toast("Simulacro registrado", "success");
    } catch (err) {
      toast(err.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: "Eliminar simulacro",
      message: `Se eliminará el registro del simulacro del ${formatDateOnly(item.fecha_realizado)}. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    setDeleting(item.id);
    try {
      await deleteSimulacro(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast("Simulacro eliminado", "success");
    } catch (err) {
      toast(err.message || "Error al eliminar", "error");
    } finally {
      setDeleting(null);
    }
  };

  if (!planId) {
    return (
      <Notice title="Crea primero el plan de emergencias" tone="amber">
        Ve a la pestaña &quot;Plan&quot; y crea el plan base antes de registrar simulacros.
      </Notice>
    );
  }

  if (loading) return <Loading message="Cargando simulacros..." />;

  const escenariosOptions = [
    ["", "Sin escenario específico"],
    ...escenarios.map((e) => [e.id, `${e.nombre} (${ESCENARIO_TIPO_LABEL[e.tipo] ?? e.tipo})`]),
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Simulacros</h2>
          <p className="text-sm text-slate-500">Registros de ejercicios realizados — DS20 Art. 25.</p>
        </div>
        {canRegister && (
          <button type="button" onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            <IconPlus />
            Registrar
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard size="sm" label="Total realizados" value={items.length} tone="teal" />
          <MetricCard size="sm" label="Último simulacro" value={formatDateOnly(items[0]?.fecha_realizado)} tone="slate" />
          <MetricCard size="sm" label="Satisfactorios" value={items.filter((i) => i.resultado === "satisfactorio").length} tone="emerald" />
          <MetricCard size="sm" label="Con observaciones" value={items.filter((i) => i.resultado !== "satisfactorio").length} tone="amber" />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState compact title="Sin simulacros registrados" description="Los simulacros deben realizarse al menos una vez al año según DS20." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const resTone = SIMULACRO_RESULTADO_TONE[item.resultado] ?? "slate";
            return (
              <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{formatDateOnly(item.fecha_realizado)}</p>
                      <p className="text-xs text-slate-500">{SIMULACRO_TIPO_LABEL[item.tipo_simulacro] ?? item.tipo_simulacro}</p>
                    </div>
                    <Badge tone={resTone}>{SIMULACRO_RESULTADO_LABEL[item.resultado] ?? item.resultado}</Badge>
                    {item.escenario?.nombre && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <EscenarioTipoIcon tipo={item.escenario.tipo} className="h-3.5 w-3.5" />
                        {item.escenario.nombre}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {item.participantes != null && (
                      <span className="text-xs text-slate-400">{item.participantes} participantes</span>
                    )}
                    {item.duracion_min != null && (
                      <span className="text-xs text-slate-400">{item.duracion_min} min</span>
                    )}
                    {canManage && (
                      <button type="button" onClick={() => openEdit(item)} className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Editar</button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        disabled={deleting === item.id}
                        onClick={() => handleDelete(item)}
                        className="rounded-xl border border-rose-100 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        {deleting === item.id ? "..." : "Eliminar"}
                      </button>
                    )}
                  </div>
                </div>
                {item.observaciones && (
                  <p className="mt-2 border-t border-slate-50 pt-2 text-xs text-slate-500 line-clamp-2">{item.observaciones}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal !== null} onClose={() => setModal(null)} title={modal === "edit" ? "Editar simulacro" : "Registrar simulacro"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGrid columns={2}>
            <TextField
              id="sim-fecha"
              name="fecha_realizado"
              label="Fecha realizado"
              type="date"
              value={form.fecha_realizado}
              onChange={f("fecha_realizado")}
              required
              disabled={saving}
            />
            <SelectField
              id="sim-tipo"
              name="tipo_simulacro"
              label="Tipo de simulacro"
              value={form.tipo_simulacro}
              onChange={f("tipo_simulacro")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(SIMULACRO_TIPO_LABEL)}
            />
            <TextField
              id="sim-dur"
              name="duracion_min"
              label="Duración (min)"
              type="number"
              min="1"
              value={form.duracion_min}
              onChange={f("duracion_min")}
              disabled={saving}
            />
            <TextField
              id="sim-partic"
              name="participantes"
              label="N° participantes"
              type="number"
              min="0"
              value={form.participantes}
              onChange={f("participantes")}
              disabled={saving}
            />
            <SelectField
              id="sim-resultado"
              name="resultado"
              label="Resultado"
              value={form.resultado}
              onChange={f("resultado")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(SIMULACRO_RESULTADO_LABEL)}
            />
            <SelectField
              id="sim-esc"
              name="escenario_id"
              label="Escenario practicado"
              value={form.escenario_id}
              onChange={f("escenario_id")}
              disabled={saving}
              placeholder={null}
              options={escenariosOptions}
            />
          </FormGrid>
          <TextareaField
            id="sim-obs"
            name="observaciones"
            label="Observaciones"
            value={form.observaciones}
            onChange={f("observaciones")}
            rows={3}
            disabled={saving}
          />
          <TextareaField
            id="sim-acc"
            name="acciones_mejora"
            label="Acciones de mejora"
            value={form.acciones_mejora}
            onChange={f("acciones_mejora")}
            rows={3}
            disabled={saving}
          />
          <SubmitBar submitLabel="Guardar" busyLabel="Guardando..." busy={saving} onCancel={() => setModal(null)} />
        </form>
      </Modal>
    </div>
  );
}

// ─── Inventario Tab ──────────────────────────────────────────────────────────

const BIEN_INIT = {
  nombre: "",
  descripcion: "",
  categoria: "equipamiento_general",
  estado: "operativo",
  numero_serie: "",
  fecha_adquisicion: "",
  fecha_revision: "",
  proveedor: "",
  notas: "",
};

function InventarioTab({ canManage, canDelete }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BIEN_INIT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const load = useCallback(async () => {
    try {
      setItems(await getInventarioBienes());
    } catch (err) {
      toast(err.message || "Error al cargar inventario", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(BIEN_INIT); setModal("new"); };
  const openEdit = (item) => {
    setForm({
      nombre: item.nombre ?? "",
      descripcion: item.descripcion ?? "",
      categoria: item.categoria ?? "equipamiento_general",
      estado: item.estado ?? "operativo",
      numero_serie: item.numero_serie ?? "",
      fecha_adquisicion: item.fecha_adquisicion ?? "",
      fecha_revision: item.fecha_revision ?? "",
      proveedor: item.proveedor ?? "",
      notas: item.notas ?? "",
      _id: item.id,
    });
    setModal("edit");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre?.trim()) { toast("Ingresa el nombre del bien", "error"); return; }
    setSaving(true);
    try {
      const saved = await saveInventarioBien(form, form._id ?? null);
      if (form._id) {
        setItems((prev) =>
          prev.map((i) => i.id === saved.id ? saved : i)
             .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre))
        );
      } else {
        setItems((prev) =>
          [...prev, saved]
            .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre))
        );
      }
      setModal(null);
      toast("Bien guardado", "success");
    } catch (err) {
      toast(err.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: "Eliminar bien",
      message: `Se eliminará "${item.nombre}" del inventario. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    setDeleting(item.id);
    try {
      await deleteInventarioBien(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast("Bien eliminado", "success");
    } catch (err) {
      toast(err.message || "Error al eliminar", "error");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <Loading message="Cargando inventario..." />;

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = [];
    acc[item.categoria].push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Inventario de bienes</h2>
          <p className="text-sm text-slate-500">Equipos, infraestructura y recursos del ELEAM — DS20 Art. 22.</p>
        </div>
        {canManage && (
          <button type="button" onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            <IconPlus />
            Agregar bien
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState compact title="Sin bienes registrados" description="Registra el inventario de equipos e infraestructura del ELEAM." />
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{BIEN_CATEGORIA_LABEL[cat] ?? cat}</p>
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Bien</th>
                      <th className="hidden px-4 py-2.5 text-left text-xs font-semibold text-slate-500 sm:table-cell">Estado</th>
                      <th className="hidden px-4 py-2.5 text-left text-xs font-semibold text-slate-500 md:table-cell">Revisión</th>
                      {canManage && <th className="px-4 py-2.5" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {catItems.map((item) => {
                      const eTone = BIEN_ESTADO_TONE[item.estado] ?? "slate";
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{item.nombre}</p>
                            {item.descripcion && <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{item.descripcion}</p>}
                            <div className="mt-1 sm:hidden">
                              <Badge tone={eTone} size="xs">{BIEN_ESTADO_LABEL[item.estado] ?? item.estado}</Badge>
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            <Badge tone={eTone}>{BIEN_ESTADO_LABEL[item.estado] ?? item.estado}</Badge>
                          </td>
                          <td className="hidden px-4 py-3 text-xs text-slate-500 md:table-cell">
                            {item.fecha_revision ? formatDateOnly(item.fecha_revision) : "—"}
                          </td>
                          {canManage && (
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1.5">
                                <button type="button" onClick={() => openEdit(item)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Editar</button>
                                {canDelete && (
                                  <button
                                    type="button"
                                    disabled={deleting === item.id}
                                    onClick={() => handleDelete(item)}
                                    className="rounded-lg border border-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                                  >
                                    {deleting === item.id ? "..." : "Eliminar"}
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal !== null} onClose={() => setModal(null)} title={modal === "edit" ? "Editar bien" : "Agregar bien"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGrid columns={2}>
            <TextField
              id="bien-nombre"
              name="nombre"
              label="Nombre del bien"
              value={form.nombre}
              onChange={f("nombre")}
              required
              disabled={saving}
              placeholder="Ej: Extintor CO₂ 5kg"
            />
            <SelectField
              id="bien-cat"
              name="categoria"
              label="Categoría"
              value={form.categoria}
              onChange={f("categoria")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(BIEN_CATEGORIA_LABEL)}
            />
            <SelectField
              id="bien-estado"
              name="estado"
              label="Estado"
              value={form.estado}
              onChange={f("estado")}
              disabled={saving}
              placeholder={null}
              options={Object.entries(BIEN_ESTADO_LABEL)}
            />
            <TextField
              id="bien-serie"
              name="numero_serie"
              label="N° de serie"
              value={form.numero_serie}
              onChange={f("numero_serie")}
              disabled={saving}
            />
            <TextField
              id="bien-adq"
              name="fecha_adquisicion"
              label="Fecha de adquisición"
              type="date"
              value={form.fecha_adquisicion}
              onChange={f("fecha_adquisicion")}
              disabled={saving}
            />
            <TextField
              id="bien-rev"
              name="fecha_revision"
              label="Fecha de revisión"
              type="date"
              value={form.fecha_revision}
              onChange={f("fecha_revision")}
              disabled={saving}
            />
            <TextField
              id="bien-prov"
              name="proveedor"
              label="Proveedor"
              value={form.proveedor}
              onChange={f("proveedor")}
              disabled={saving}
            />
          </FormGrid>
          <TextareaField
            id="bien-notas"
            name="notas"
            label="Descripción / notas"
            value={form.notas}
            onChange={f("notas")}
            rows={3}
            disabled={saving}
          />
          <SubmitBar submitLabel="Guardar" busyLabel="Guardando..." busy={saving} onCancel={() => setModal(null)} />
        </form>
      </Modal>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function EmergenciasPage() {
  const { can, isAdminEleam } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("plan");
  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const canManage = isAdminEleam || can("gestionar_emergencias");
  const canRegisterSimulacro = isAdminEleam || can("registrar_simulacros");

  useEffect(() => {
    getPlanEmergencias()
      .then(setPlan)
      .catch((err) => toast(err.message || "Error al cargar el plan", "error"))
      .finally(() => setLoadingPlan(false));
  }, [toast]);

  const planEstado = plan?.estado ?? null;
  const planTone = PLAN_ESTADO_TONE[planEstado] ?? "slate";

  return (
    <PageLayout
      title="Plan de Emergencias"
      eyebrow="DS20 Art. 25"
      description="Plan de emergencias y desastres, escenarios, simulacros e inventario de bienes del ELEAM."
      coachFeatureId="emergencias"
      actions={plan && (
        <Badge tone={planTone}>{PLAN_ESTADO_LABEL[planEstado] ?? "Sin plan"}</Badge>
      )}
    >
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {loadingPlan ? (
        <Loading message="Cargando..." />
      ) : (
        <div key={tab}>
          {tab === "plan" && (
            <PlanTab plan={plan} onChange={setPlan} canManage={canManage} />
          )}
          {tab === "escenarios" && (
            <EscenariosTab planId={plan?.id ?? null} canManage={canManage} />
          )}
          {tab === "simulacros" && (
            <SimulacrosTab
              planId={plan?.id ?? null}
              canRegister={canRegisterSimulacro}
              canManage={canManage}
              canDelete={isAdminEleam}
            />
          )}
          {tab === "inventario" && (
            <InventarioTab canManage={isAdminEleam || can("editar_inventario_bienes")} canDelete={isAdminEleam} />
          )}
        </div>
      )}
    </PageLayout>
  );
}
