import { useEffect, useMemo, useState } from "react";
import Modal from "../../components/Modal";
import HelpTooltip from "../../components/HelpTooltip";
import MetricCard from "../../components/MetricCard";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import useSessionFormDraft from "../../hooks/useSessionFormDraft";
import CarePlanActivityModal from "./CarePlanActivityModal";
import {
  CARE_ACTIVITY_PRESETS,
  CARE_BASE_PRESET_IDS,
  CARE_CATEGORIES,
  CARE_CATEGORY_LABEL,
  CARE_TURNOS,
  createCarePresetActivities,
  deactivateCareActivity,
  getResidentCarePlan,
  listCareTasks,
  reactivateCareActivity,
  saveCareActivity,
  saveCarePlan,
  todayIso,
} from "./carePlansService";
import {
  PRIORITY_BORDER,
  PRIORITY_LABEL,
  PRIORITY_TONE,
} from "./careTasksBoardUtils";
import {
  INITIAL_CARE_ACTIVITY,
  INITIAL_CARE_PLAN,
  INITIAL_CARE_SCHEDULE,
  TURN_LABELS,
  WEEK_DAYS,
  buildCarePlanForm,
  buildQuickCarePlanDefaults,
  calculateCarePlanReadiness,
  carePresetKey,
  formatCareSchedule,
  getActiveCareSchedules,
  getCarePlanPrimaryAction,
  groupCarePresetsByArea,
  nextCareTaskSummary,
  sortCareActivities,
} from "./carePlanUi";

const RISK_TONE = {
  bajo: { label: "Bajo", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  medio: { label: "Medio", badge: "border-amber-200 bg-amber-50 text-amber-800" },
  alto: { label: "Alto", badge: "border-rose-200 bg-rose-50 text-rose-700" },
};

const UPP_TOOLTIP = "Úlceras Por Presión: lesiones en la piel causadas por presión prolongada en residentes con movilidad reducida.";

function residentFullName(resident = {}) {
  return [resident?.nombre, resident?.apellido].filter(Boolean).join(" ") || "Residente";
}

function clearSessionDraft(key) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Draft persistence must never block the clinical workflow.
  }
}

export default function CarePlanTab({ resident }) {
  const toast = useToast();
  const { can } = useAuth();
  const [plan, setPlan] = useState(null);
  const [dayTasks, setDayTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);
  const [activityModal, setActivityModal] = useState(null);
  const [clinicalOpen, setClinicalOpen] = useState(false);
  const [showPaused, setShowPaused] = useState(false);
  const [familyPreview, setFamilyPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const canEdit = can("editar_planes_cuidado");
  const canCreate = can("crear_planes_cuidado");
  const canManage = plan ? canEdit : canCreate;
  const planDraftKey = `fichaeleam_carePlan_${resident.id}_${plan?.id ?? "new"}`;
  const planDraftInitial = useMemo(() => buildCarePlanForm(plan), [plan]);
  const [form, setForm, , planDirty] = useSessionFormDraft(planDraftKey, planDraftInitial);

  const load = async () => {
    setLoading(true);
    try {
      const [data, tasks] = await Promise.all([
        getResidentCarePlan(resident.id),
        listCareTasks({
          residenteId: resident.id,
          fecha: todayIso(),
          estado: null,
          generate: false,
          includeCarryOver: false,
          limit: 200,
        }).catch(() => []),
      ]);
      setPlan(data);
      setDayTasks(tasks ?? []);
      setClinicalOpen(!data);
    } catch (err) {
      console.error(err);
      toast("No se pudo cargar el plan de cuidado.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resident.id]);

  const activities = useMemo(
    () => sortCareActivities(plan?.actividades ?? []),
    [plan]
  );

  const pausedActivities = useMemo(
    () => (plan?.actividades ?? []).filter((item) => item.activo === false),
    [plan]
  );

  const metrics = useMemo(
    () => calculateCarePlanReadiness({ plan, activities: plan?.actividades ?? [], dayTasks }),
    [plan, dayTasks]
  );

  const nextTask = useMemo(() => nextCareTaskSummary(dayTasks), [dayTasks]);

  const primaryAction = useMemo(
    () => getCarePlanPrimaryAction({ plan, metrics, canManage }),
    [plan, metrics, canManage]
  );

  const existingPresetIds = useMemo(() => {
    const keys = new Set(activities.map(carePresetKey));
    return new Set(
      CARE_ACTIVITY_PRESETS
        .filter((preset) => keys.has(carePresetKey(preset.activity)))
        .map((preset) => preset.id)
    );
  }, [activities]);

  const presetGroups = useMemo(() => groupCarePresetsByArea(), []);

  const handleQuickStart = async ({ form: quickForm, includeBaseRoutine }) => {
    if (!canCreate) return;
    setSaving(true);
    try {
      const savedPlan = await saveCarePlan(resident.id, quickForm);
      if (includeBaseRoutine) {
        await createCarePresetActivities({
          plan: savedPlan,
          presetIds: CARE_BASE_PRESET_IDS,
          existingActivities: [],
        });
      }
      toast(includeBaseRoutine ? "Plan creado con rutina base." : "Plan creado.", "success");
      await load();
      return true;
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo crear el plan.", "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveCarePlan(resident.id, { ...form, id: plan?.id });
      clearSessionDraft(planDraftKey);
      toast("Plan de cuidado guardado.", "success");
      setClinicalOpen(false);
      await load();
      return true;
    } catch (err) {
      console.error(err);
      toast("No se pudo guardar el plan.", "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveActivity = async ({ activity, schedules }) => {
    if (!plan) return;
    setSaving(true);
    try {
      await saveCareActivity({ plan, activity: { ...activity, schedules } });
      toast("Rutina guardada.", "success");
      setActivityModal(null);
      await load();
      return true;
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo guardar la rutina.", "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAddBaseRoutine = async () => {
    if (!plan) return;
    setPresetSaving(true);
    try {
      const result = await createCarePresetActivities({
        plan,
        presetIds: CARE_BASE_PRESET_IDS,
        existingActivities: activities,
      });
      const createdText = `${result.created} rutina${result.created === 1 ? "" : "s"}`;
      const skippedText = result.skipped ? `, ${result.skipped} ya existían` : "";
      toast(`Rutina base agregada: ${createdText}${skippedText}.`, "success");
      setShowTemplates(false);
      await load();
    } catch (err) {
      console.error(err);
      toast("No se pudo agregar la rutina base.", "error");
    } finally {
      setPresetSaving(false);
    }
  };

  const handleDeactivate = async (activity) => {
    setSaving(true);
    try {
      await deactivateCareActivity(activity.id);
      toast("Rutina pausada.", "info");
      await load();
    } catch (err) {
      console.error(err);
      toast("No se pudo pausar la rutina.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (activity) => {
    setSaving(true);
    try {
      await reactivateCareActivity(activity.id);
      toast("Rutina reactivada.", "success");
      await load();
    } catch (err) {
      console.error(err);
      toast("No se pudo reactivar la rutina.", "error");
    } finally {
      setSaving(false);
    }
  };

  const openActivity = (activity) => {
    setActivityModal({
      activity,
      schedules: getActiveCareSchedules(activity).length
        ? getActiveCareSchedules(activity)
        : [INITIAL_CARE_SCHEDULE],
    });
  };

  const duplicateActivity = (activity) => {
    setActivityModal({
      activity: {
        ...INITIAL_CARE_ACTIVITY,
        ...activity,
        id: undefined,
        titulo: `${activity.titulo} (copia)`,
        activo: true,
      },
      schedules: getActiveCareSchedules(activity).map((schedule) => ({ ...schedule, id: undefined })),
    });
  };

  const openPreset = (preset) => {
    const existing = activities.find((item) => carePresetKey(item) === carePresetKey(preset.activity));
    if (existing) {
      if (canEdit) openActivity(existing);
      return;
    }

    setActivityModal({
      activity: { ...INITIAL_CARE_ACTIVITY, ...preset.activity },
      schedules: [{ ...INITIAL_CARE_SCHEDULE, ...preset.schedule }],
    });
  };

  const handlePrimaryAction = () => {
    if (!canManage) return;
    if (!plan) {
      const target = document.getElementById("care-plan-quick-start");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (metrics.active === 0) {
      handleAddBaseRoutine();
      return;
    }
    if (metrics.schedules === 0 && activities[0]) {
      openActivity(activities[0]);
      return;
    }
    if (!metrics.hasClinicalSummary) {
      setClinicalOpen(true);
      return;
    }
    setActivityModal({ activity: INITIAL_CARE_ACTIVITY, schedules: [INITIAL_CARE_SCHEDULE] });
  };

  if (loading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="space-y-5">
      <CarePlanHero
        resident={resident}
        plan={plan}
        metrics={metrics}
        nextTask={nextTask}
        primaryAction={primaryAction}
        canManage={canManage}
        saving={saving || presetSaving}
        onPrimaryAction={handlePrimaryAction}
      />

      {!plan ? (
        <QuickStartPanel
          resident={resident}
          canCreate={canCreate}
          saving={saving}
          onSubmit={handleQuickStart}
        />
      ) : (
        <>
          <ClinicalPlanPanel
            form={form}
            plan={plan}
            metrics={metrics}
            canManage={canManage}
            saving={saving}
            open={clinicalOpen}
            dirty={planDirty}
            onToggle={() => setClinicalOpen((prev) => !prev)}
            onChange={setForm}
            onSubmit={handleSavePlan}
          />

          <RoutineCockpit
            activities={activities}
            pausedActivities={pausedActivities}
            metrics={metrics}
            canCreate={canCreate}
            canEdit={canEdit}
            saving={saving}
            presetSaving={presetSaving}
            showPaused={showPaused}
            showTemplates={showTemplates}
            presetGroups={presetGroups}
            existingPresetIds={existingPresetIds}
            onToggleTemplates={() => setShowTemplates((prev) => !prev)}
            onFamilyPreview={() => setFamilyPreview(true)}
            onAddBaseRoutine={handleAddBaseRoutine}
            onNew={() => setActivityModal({ activity: INITIAL_CARE_ACTIVITY, schedules: [INITIAL_CARE_SCHEDULE] })}
            onOpenPreset={openPreset}
            onEdit={openActivity}
            onDuplicate={duplicateActivity}
            onDeactivate={handleDeactivate}
            onTogglePaused={() => setShowPaused((prev) => !prev)}
            onReactivate={handleReactivate}
          />
        </>
      )}

      <CarePlanActivityModal
        modal={activityModal}
        saving={saving}
        onClose={() => !saving && setActivityModal(null)}
        onSubmit={handleSaveActivity}
      />

      <FamilyPreviewModal
        isOpen={familyPreview}
        onClose={() => setFamilyPreview(false)}
        plan={plan}
        activities={activities}
        resident={resident}
      />
    </div>
  );
}

function CarePlanHero({ resident, plan, metrics, nextTask, primaryAction, canManage, saving, onPrimaryAction }) {
  const pct = metrics.score;
  const statusTone = pct >= 80
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : pct >= 45
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-slate-200 bg-white text-slate-900";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={plan ? "teal" : "amber"}>{plan ? "Plan activo" : "Sin plan activo"}</Badge>
            {plan && <Badge>Versión {plan.version ?? 1}</Badge>}
            {metrics.openToday > 0 && <Badge tone="amber">{metrics.openToday} pendiente{metrics.openToday === 1 ? "" : "s"} hoy</Badge>}
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-950 sm:text-2xl">
            {plan?.titulo || `Plan de cuidado de ${residentFullName(resident)}`}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Crea una pauta operativa clara para el equipo: rutinas por turno, alertas clínicas y visibilidad familiar controlada.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard size="sm" label="Rutinas activas" value={metrics.active} />
            <MetricCard size="sm" label="Horarios" value={metrics.schedules} />
            <MetricCard size="sm" label="Prioridad alta" value={metrics.highPriority} tone="amber" />
            <MetricCard size="sm" label="Portal familia" value={metrics.familyVisible} tone="teal" />
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${statusTone}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-current opacity-60">Estado operativo</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{pct}%</p>
            </div>
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={!canManage || saving}
              className={`w-full rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto ${
                primaryAction.tone === "amber"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : primaryAction.tone === "sky"
                    ? "bg-sky-700 hover:bg-sky-800"
                    : "bg-teal-700 hover:bg-teal-800"
              }`}
            >
              {saving ? "Procesando..." : primaryAction.label}
            </button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
            <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 text-sm leading-5 opacity-80">{primaryAction.reason}</p>
          {nextTask && (
            <div className="mt-3 rounded-xl border border-white/70 bg-white/70 px-3 py-2">
              <p className="text-xs font-semibold uppercase opacity-60">Próxima tarea</p>
              <p className="mt-0.5 text-sm font-semibold">{nextTask.title}</p>
              <p className="text-xs opacity-70">{nextTask.when}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function QuickStartPanel({ resident, canCreate, saving, onSubmit }) {
  const [includeBaseRoutine, setIncludeBaseRoutine] = useState(true);
  const residentId = resident?.id;
  const residentNombre = resident?.nombre;
  const residentApellido = resident?.apellido;
  const quickDraftKey = `fichaeleam_carePlanQuickStart_${residentId ?? "new"}`;
  const quickInitial = useMemo(
    () => buildQuickCarePlanDefaults({
      id: residentId,
      nombre: residentNombre,
      apellido: residentApellido,
    }),
    [residentId, residentNombre, residentApellido]
  );
  const [quickForm, setQuickForm, resetQuickDraft, quickDirty] = useSessionFormDraft(quickDraftKey, quickInitial);

  return (
    <section id="care-plan-quick-start" className="rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            Promise.resolve(onSubmit({ form: quickForm, includeBaseRoutine }))
              .then((ok) => {
                if (ok) resetQuickDraft();
              });
          }}
        >
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase text-teal-700">Inicio guiado</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Crear plan en menos de un minuto</h2>
            <p className="mt-1 text-sm text-slate-600">
              Parte con una pauta segura y ajusta después solo las excepciones.
            </p>
            {quickDirty && (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                Borrador guardado en esta sesión.
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Título"
              value={quickForm.titulo}
              onChange={(value) => setQuickForm((prev) => ({ ...prev, titulo: value }))}
              disabled={!canCreate || saving}
            />
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-2">
              <SelectField
                label="Riesgo caídas"
                value={quickForm.riesgo_caidas}
                onChange={(value) => setQuickForm((prev) => ({ ...prev, riesgo_caidas: value }))}
                disabled={!canCreate || saving}
              />
              <SelectField
                label="Riesgo UPP"
                value={quickForm.riesgo_up}
                onChange={(value) => setQuickForm((prev) => ({ ...prev, riesgo_up: value }))}
                disabled={!canCreate || saving}
                tooltip={UPP_TOOLTIP}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <TextArea
              label="Objetivo del cuidado"
              value={quickForm.objetivos}
              onChange={(value) => setQuickForm((prev) => ({ ...prev, objetivos: value }))}
              disabled={!canCreate || saving}
              rows={4}
            />
            <TextArea
              label="Alimentación"
              value={quickForm.pauta_alimentacion}
              onChange={(value) => setQuickForm((prev) => ({ ...prev, pauta_alimentacion: value }))}
              disabled={!canCreate || saving}
              rows={4}
            />
            <TextArea
              label="Hidratación"
              value={quickForm.pauta_hidratacion}
              onChange={(value) => setQuickForm((prev) => ({ ...prev, pauta_hidratacion: value }))}
              disabled={!canCreate || saving}
              rows={4}
            />
          </div>

          <label className="mt-4 flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-950">
            <input
              type="checkbox"
              checked={includeBaseRoutine}
              onChange={(e) => setIncludeBaseRoutine(e.target.checked)}
              disabled={!canCreate || saving}
              className="mt-0.5 h-4 w-4 accent-teal-700"
            />
            <span>
              Agregar rutina base recomendada
              <span className="block text-xs text-teal-700">
                Incluye alimentación, hidratación, higiene, movilidad, prevención y bienestar con horarios editables.
              </span>
            </span>
          </label>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Podrás editar, pausar o duplicar cualquier rutina después de crear el plan.
            </p>
            <button
              type="submit"
              disabled={!canCreate || saving || !quickForm.titulo.trim()}
              className="w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 sm:w-auto"
            >
              {saving ? "Creando..." : "Crear plan operativo"}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <GuideStep index={1} title="Pauta segura" text="Los campos vienen con textos base para orientar al turno." />
          <GuideStep index={2} title="Rutinas listas" text="La rutina recomendada crea tareas recurrentes sin configuración manual inicial." />
          <GuideStep index={3} title="Ajuste fino" text="Luego modifica horarios, prioridades o publicación familiar solo donde haga falta." />
        </div>
      </div>
    </section>
  );
}

function ClinicalPlanPanel({ form, plan, metrics, canManage, saving, open, dirty, onToggle, onChange, onSubmit }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">Plan de cuidado y alertas</h2>
            <Badge tone={metrics.hasClinicalSummary ? "emerald" : "amber"}>
              {metrics.hasClinicalSummary ? "Completo" : "Pendiente"}
            </Badge>
            {dirty && <Badge tone="amber">Borrador</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Información clínica que orienta al equipo. No bloquea la operación diaria.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
          {open ? "Ocultar" : "Editar"}
          <Chevron open={open} />
        </span>
      </button>

      {!open && (
        <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          <ClinicalSummaryItem label="Objetivo" value={plan.objetivos} fallback="Sin objetivo registrado" />
          <ClinicalSummaryItem label="Alimentación" value={plan.pauta_alimentacion} fallback="Sin pauta específica" />
          <ClinicalSummaryItem label="Hidratación" value={plan.pauta_hidratacion} fallback="Sin pauta específica" />
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-400">Riesgos</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <RiskBadge label="Caídas" value={plan.riesgo_caidas} />
              <RiskBadge label="UPP" value={plan.riesgo_up} tooltip={UPP_TOOLTIP} />
            </div>
          </div>
        </div>
      )}

      {open && (
        <form onSubmit={onSubmit} className="border-t border-slate-100 p-4 sm:p-5">
          <div className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-4">
              <Field
                label="Título del plan"
                value={form.titulo}
                onChange={(value) => onChange((prev) => ({ ...prev, titulo: value }))}
                disabled={!canManage || saving}
              />
              <TextArea
                label="Objetivos clínico-operativos"
                value={form.objetivos}
                onChange={(value) => onChange((prev) => ({ ...prev, objetivos: value }))}
                disabled={!canManage || saving}
                rows={5}
              />
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <SelectField
                  label="Riesgo de caídas"
                  value={form.riesgo_caidas}
                  onChange={(value) => onChange((prev) => ({ ...prev, riesgo_caidas: value }))}
                  disabled={!canManage || saving}
                />
                <SelectField
                  label="Riesgo UPP"
                  value={form.riesgo_up}
                  onChange={(value) => onChange((prev) => ({ ...prev, riesgo_up: value }))}
                  disabled={!canManage || saving}
                  tooltip={UPP_TOOLTIP}
                />
              </div>
              <TextArea
                label="Restricciones o alertas"
                value={form.restricciones}
                onChange={(value) => onChange((prev) => ({ ...prev, restricciones: value }))}
                disabled={!canManage || saving}
                rows={5}
              />
            </div>
            <div className="space-y-4">
              <TextArea
                label="Pauta de alimentación"
                value={form.pauta_alimentacion}
                onChange={(value) => onChange((prev) => ({ ...prev, pauta_alimentacion: value }))}
                disabled={!canManage || saving}
                rows={4}
              />
              <TextArea
                label="Pauta de hidratación"
                value={form.pauta_hidratacion}
                onChange={(value) => onChange((prev) => ({ ...prev, pauta_hidratacion: value }))}
                disabled={!canManage || saving}
                rows={4}
              />
            </div>
          </div>

          {canManage && (
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Guardando..." : "Guardar plan"}
              </button>
            </div>
          )}
        </form>
      )}
    </section>
  );
}

function RoutineCockpit({
  activities,
  pausedActivities,
  metrics,
  canCreate,
  canEdit,
  saving,
  presetSaving,
  showPaused,
  showTemplates,
  presetGroups,
  existingPresetIds,
  onToggleTemplates,
  onFamilyPreview,
  onAddBaseRoutine,
  onNew,
  onOpenPreset,
  onEdit,
  onDuplicate,
  onDeactivate,
  onTogglePaused,
  onReactivate,
}) {
  const grouped = groupActivitiesByTurn(activities);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">Rutinas activas</h2>
            <HelpTooltip label="Ayuda: rutinas de cuidado">
              Cada rutina programada genera tareas por turno. La tolerancia define cuándo la tarea queda vencida.
            </HelpTooltip>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona por turno. El equipo solo verá tareas accionables, con prioridad y ventana clara.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={onFamilyPreview}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Vista familiar
          </button>
          {canCreate && (
            <>
              <button
                type="button"
                onClick={onAddBaseRoutine}
                disabled={presetSaving || saving}
                className="w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-60 sm:w-auto"
              >
                {presetSaving ? "Agregando..." : "Rutina base"}
              </button>
              <button
                type="button"
                onClick={onNew}
                className="w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 sm:w-auto"
              >
                Nueva rutina
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard size="sm" label="Con seguimiento" value={metrics.followUp} tone="amber" />
        <MetricCard size="sm" label="Familia" value={metrics.familyVisible} tone="teal" />
        <MetricCard size="sm" label="Pendientes hoy" value={metrics.openToday} tone="amber" />
        <MetricCard size="sm" label="Reprogramadas" value={metrics.reprogrammed} tone="sky" />
      </div>

      {canCreate && (
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <button
            type="button"
            onClick={onToggleTemplates}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-950">Plantillas recomendadas</span>
              <span className="block text-xs text-slate-500">Agrega una rutina específica o edita una existente.</span>
            </span>
            <Chevron open={showTemplates} />
          </button>
          {showTemplates && (
            <PresetPicker
              groups={presetGroups}
              existingPresetIds={existingPresetIds}
              saving={saving || presetSaving}
              canEdit={canEdit}
              onOpen={onOpenPreset}
            />
          )}
        </div>
      )}

      {activities.length === 0 && pausedActivities.length === 0 ? (
        <EmptyActivities onAddBaseRoutine={canCreate ? onAddBaseRoutine : null} saving={presetSaving || saving} />
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {CARE_TURNOS.map((turno) => (
            <TurnRoutineColumn
              key={turno}
              turno={turno}
              items={grouped[turno] ?? []}
              canEdit={canEdit}
              canCreate={canCreate}
              saving={saving}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDeactivate={onDeactivate}
            />
          ))}
        </div>
      )}

      {pausedActivities.length > 0 && (
        <PausedActivities
          items={pausedActivities}
          show={showPaused}
          canEdit={canEdit}
          saving={saving}
          onToggle={onTogglePaused}
          onReactivate={onReactivate}
        />
      )}
    </section>
  );
}

function groupActivitiesByTurn(activities = []) {
  return activities.reduce((acc, activity) => {
    const primaryTurn = getActiveCareSchedules(activity)[0]?.turno ?? "mañana";
    if (!acc[primaryTurn]) acc[primaryTurn] = [];
    acc[primaryTurn].push(activity);
    return acc;
  }, {});
}

function TurnRoutineColumn({ turno, items, canEdit, canCreate, saving, onEdit, onDuplicate, onDeactivate }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-950">{TURN_LABELS[turno] ?? turno}</h3>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-400">
          Sin rutinas en este turno.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              canEdit={canEdit}
              canCreate={canCreate}
              saving={saving}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDeactivate={onDeactivate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PresetPicker({ groups, existingPresetIds, saving, canEdit, onOpen }) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {Object.entries(groups).map(([area, presets]) => (
        <div key={area} className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-400">{area}</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const added = existingPresetIds.has(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onOpen(preset)}
                  disabled={saving || (added && !canEdit)}
                  title={added ? "Editar rutina existente" : "Agregar esta rutina"}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                    added
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                  }`}
                >
                  {preset.activity.titulo}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityRow({ activity, canEdit, canCreate, saving, onEdit, onDuplicate, onDeactivate }) {
  const schedules = getActiveCareSchedules(activity);
  return (
    <article className={`rounded-xl border border-slate-200 border-l-4 bg-white p-3 ${PRIORITY_BORDER[activity.prioridad] ?? PRIORITY_BORDER.media}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="teal">{CARE_CATEGORY_LABEL[activity.categoria] ?? activity.categoria}</Badge>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_TONE[activity.prioridad] ?? PRIORITY_TONE.media}`}>
          {PRIORITY_LABEL[activity.prioridad] ?? activity.prioridad}
        </span>
        {activity.requiere_observacion && <Badge tone="amber">Seguimiento</Badge>}
        <Badge tone={activity.visible_familiar ? "emerald" : "slate"}>
          {activity.visible_familiar ? "Familia" : "Interno"}
        </Badge>
      </div>

      <h4 className="mt-2 text-sm font-semibold text-slate-950">{activity.titulo}</h4>
      {activity.descripcion && <p className="mt-1 text-sm leading-5 text-slate-600">{activity.descripcion}</p>}
      {activity.instrucciones && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{activity.instrucciones}</p>}

      <div className="mt-3 space-y-1.5">
        {schedules.map((schedule, index) => (
          <div key={schedule.id ?? `${schedule.turno}-${schedule.hora}-${index}`} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
            {formatCareSchedule(schedule)}
          </div>
        ))}
      </div>

      {activity.visible_familiar && activity.resumen_familiar?.trim() && (
        <p className="mt-3 rounded-lg border border-teal-100 bg-teal-50 px-2.5 py-2 text-xs leading-5 text-teal-800">
          {activity.resumen_familiar}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {canEdit && (
          <button type="button" onClick={() => onEdit(activity)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Editar
          </button>
        )}
        {canCreate && (
          <button type="button" onClick={() => onDuplicate(activity)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Duplicar
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => onDeactivate(activity)}
            disabled={saving}
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            Pausar
          </button>
        )}
      </div>
    </article>
  );
}


function FamilyPreviewModal({ isOpen, onClose, plan, activities, resident }) {
  const published = (activities ?? []).filter((activity) => activity.visible_familiar && activity.activo !== false);
  const hasPlanContent =
    plan?.objetivos?.trim() || plan?.pauta_alimentacion?.trim()
    || plan?.pauta_hidratacion?.trim() || plan?.restricciones?.trim()
    || plan?.riesgo_caidas || plan?.riesgo_up;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Vista familiar - ${residentFullName(resident)}`}
      panelClassName="max-w-2xl p-4 sm:p-6"
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          Solo aparecen contenidos marcados como visibles para familia.
        </div>

        {hasPlanContent && (
          <section className="space-y-3">
            <p className="text-xs font-bold uppercase text-slate-400">Plan compartido</p>
            {plan?.objetivos?.trim() && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Objetivos</p>
                <p className="whitespace-pre-line text-sm text-slate-700">{plan.objetivos}</p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {plan?.pauta_alimentacion?.trim() && (
                <InfoBox tone="teal" label="Alimentación" value={plan.pauta_alimentacion} />
              )}
              {plan?.pauta_hidratacion?.trim() && (
                <InfoBox tone="sky" label="Hidratación" value={plan.pauta_hidratacion} />
              )}
            </div>
            {plan?.restricciones?.trim() && (
              <InfoBox tone="amber" label="Alertas y restricciones" value={plan.restricciones} />
            )}
            <div className="flex flex-wrap gap-2">
              {plan?.riesgo_caidas && <RiskBadge label="Caídas" value={plan.riesgo_caidas} />}
              {plan?.riesgo_up && <RiskBadge label="UPP" value={plan.riesgo_up} tooltip={UPP_TOOLTIP} />}
            </div>
          </section>
        )}

        <section>
          <p className="mb-3 text-xs font-bold uppercase text-slate-400">
            Rutinas publicadas ({published.length})
          </p>
          {published.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-sm font-semibold text-slate-700">Ninguna rutina publicada</p>
              <p className="mt-1 text-xs text-slate-500">
                Edita una rutina y activa la publicación familiar para compartirla.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {published.map((activity) => (
                <li key={activity.id} className="rounded-xl border border-teal-100 bg-teal-50/70 p-3">
                  <Badge tone="teal">{CARE_CATEGORY_LABEL[activity.categoria] ?? activity.categoria}</Badge>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{activity.resumen_familiar}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {getActiveCareSchedules(activity).map((schedule, index) => (
                      <span key={schedule.id ?? index} className="rounded-full border border-slate-100 bg-white px-2 py-0.5 text-xs text-slate-400">
                        {formatCareSchedule(schedule)}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}

function PausedActivities({ items, show, canEdit, saving, onToggle, onReactivate }) {
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
      >
        <Chevron open={show} />
        {items.length} rutina{items.length === 1 ? "" : "s"} pausada{items.length === 1 ? "" : "s"}
      </button>
      {show && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {items.map((activity) => (
            <div key={activity.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm font-medium text-slate-700">{activity.titulo}</span>
                <p className="text-xs text-slate-400">{CARE_CATEGORY_LABEL[activity.categoria] ?? activity.categoria}</p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => onReactivate(activity)}
                  disabled={saving}
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                  Reactivar
                </button>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-400">Pausada</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyActivities({ onAddBaseRoutine, saving }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-50">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-teal-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-950">Aún no hay rutinas activas</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        La forma más rápida es cargar la rutina base y ajustar horarios o prioridades después.
      </p>
      {onAddBaseRoutine && (
        <button
          type="button"
          onClick={onAddBaseRoutine}
          disabled={saving}
          className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? "Agregando..." : "Agregar rutina base"}
        </button>
      )}
    </div>
  );
}

function GuideStep({ index, title, text }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-teal-100 bg-white/80 p-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-700 text-sm font-semibold text-white">
        {index}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function ClinicalSummaryItem({ label, value, fallback }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className={`mt-1 line-clamp-3 text-sm ${value?.trim() ? "text-slate-700" : "text-slate-400"}`}>
        {value?.trim() || fallback}
      </p>
    </div>
  );
}

function RiskBadge({ label, value, tooltip }) {
  const risk = RISK_TONE[value];
  return (
    <span
      title={tooltip}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${risk?.badge ?? "border-slate-200 bg-white text-slate-400"}`}
    >
      {label}: {risk?.label ?? "Sin clasificar"}
    </span>
  );
}

function InfoBox({ tone = "teal", label, value }) {
  const cls = {
    teal: "border-teal-100 bg-teal-50 text-teal-800",
    sky: "border-sky-100 bg-sky-50 text-sky-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <p className="mb-1 text-xs font-semibold uppercase opacity-70">{label}</p>
      <p className="whitespace-pre-line text-sm">{value}</p>
    </div>
  );
}

function Badge({ children, tone = "slate" }) {
  const cls = {
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

function Chevron({ open }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
      className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function Field({ label, value, onChange, disabled, type = "text", min, max, step }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, disabled, tooltip }) {
  return (
    <label className="block text-sm font-medium text-slate-700" title={tooltip}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      >
        <option value="">Sin clasificar</option>
        <option value="bajo">Bajo</option>
        <option value="medio">Medio</option>
        <option value="alto">Alto</option>
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange, disabled, rows = 3 }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      />
    </label>
  );
}
