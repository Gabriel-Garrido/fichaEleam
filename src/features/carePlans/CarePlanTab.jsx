import { useEffect, useMemo, useState } from "react";
import HelpTooltip from "../../components/HelpTooltip";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import useSessionFormDraft from "../../hooks/useSessionFormDraft";
import CarePlanActivityModal from "./CarePlanActivityModal";
import {
  CARE_BASE_PRESET_IDS,
  CARE_CATEGORY_LABEL,
  CARE_TURNOS,
  createCarePresetActivities,
  deactivateCareActivity,
  getResidentCarePlan,
  reactivateCareActivity,
  saveCareActivity,
  saveCarePlan,
} from "./carePlansService";
import {
  INITIAL_CARE_ACTIVITY,
  INITIAL_CARE_SCHEDULE,
  TURN_LABELS,
  buildCarePlanForm,
  buildQuickCarePlanDefaults,
  calculateCarePlanReadiness,
  formatCareSchedule,
  getActiveCareSchedules,
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);
  const [activityModal, setActivityModal] = useState(null);
  const [clinicalOpen, setClinicalOpen] = useState(false);
  const [showPaused, setShowPaused] = useState(false);

  const canEdit = can("editar_planes_cuidado");
  const canCreate = can("crear_planes_cuidado");
  const canManage = plan ? canEdit : canCreate;
  const planDraftKey = `fichaeleam_carePlan_${resident.id}_${plan?.id ?? "new"}`;
  const planDraftInitial = useMemo(() => buildCarePlanForm(plan), [plan]);
  const [form, setForm, , planDirty] = useSessionFormDraft(planDraftKey, planDraftInitial);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getResidentCarePlan(resident.id);
      setPlan(data);
      setClinicalOpen(false);
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
    () => calculateCarePlanReadiness({ plan, activities: plan?.actividades ?? [] }),
    [plan]
  );

  const handleCreatePlan = async (includeBaseRoutine) => {
    if (!canCreate) return;
    setSaving(true);
    try {
      const savedPlan = await saveCarePlan(resident.id, buildQuickCarePlanDefaults(resident));
      if (includeBaseRoutine) {
        await createCarePresetActivities({
          plan: savedPlan,
          presetIds: CARE_BASE_PRESET_IDS,
          existingActivities: [],
        });
      }
      toast(includeBaseRoutine ? "Plan creado con rutina base." : "Plan creado.", "success");
      await load();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo crear el plan.", "error");
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

  const openNewActivity = () => setActivityModal({ activity: INITIAL_CARE_ACTIVITY, schedules: [INITIAL_CARE_SCHEDULE] });

  if (loading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (!plan) {
    return (
      <CarePlanEmptyState
        resident={resident}
        canCreate={canCreate}
        saving={saving}
        onCreate={handleCreatePlan}
      />
    );
  }

  return (
    <div className="space-y-5">
      <CarePlanHeader
        resident={resident}
        plan={plan}
        metrics={metrics}
      />

      <RoutineCockpit
        activities={activities}
        pausedActivities={pausedActivities}
        canCreate={canCreate}
        canEdit={canEdit}
        saving={saving}
        presetSaving={presetSaving}
        showPaused={showPaused}
        onAddBaseRoutine={handleAddBaseRoutine}
        onNew={openNewActivity}
        onEdit={openActivity}
        onDeactivate={handleDeactivate}
        onTogglePaused={() => setShowPaused((prev) => !prev)}
        onReactivate={handleReactivate}
      />

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

      <CarePlanActivityModal
        modal={activityModal}
        saving={saving}
        onClose={() => !saving && setActivityModal(null)}
        onSubmit={handleSaveActivity}
      />

    </div>
  );
}

function CarePlanHeader({ resident, plan, metrics }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="teal">Programa activo</Badge>
            <Badge>Versión {plan.version ?? 1}</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-950 sm:text-2xl">
            {plan.titulo || `Plan de cuidado de ${residentFullName(resident)}`}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Acciones y frecuencia del programa de atención integral de la persona residente.
          </p>
          <p className="mt-3 text-sm font-medium text-slate-500">
            {metrics.active} rutina{metrics.active === 1 ? "" : "s"} activa{metrics.active === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </section>
  );
}

function CarePlanEmptyState({ resident, canCreate, saving, onCreate }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-teal-50">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7 text-teal-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-950">Crea el plan de cuidado de {residentFullName(resident)}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Parte con una rutina base lista (alimentación, hidratación, higiene, movilidad, prevención y bienestar) y ajústala después solo donde haga falta. Toma menos de un minuto.
      </p>
      {canCreate ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => onCreate(true)}
            disabled={saving}
            className="w-full rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Creando..." : "Crear plan con rutina base"}
          </button>
        </div>
      ) : (
        <p className="mt-6 text-sm font-medium text-slate-400">Tu perfil no permite crear el plan de cuidado.</p>
      )}
    </section>
  );
}

function RoutineCockpit({
  activities,
  pausedActivities,
  canCreate,
  canEdit,
  saving,
  presetSaving,
  showPaused,
  onAddBaseRoutine,
  onNew,
  onEdit,
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
            <h2 className="text-base font-semibold text-slate-950">Rutinas por turno</h2>
            <HelpTooltip label="Ayuda: rutinas de cuidado">
              Cada rutina programada genera tareas por turno para el equipo. Edita una rutina para cambiar su horario.
            </HelpTooltip>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            El equipo solo verá tareas accionables, con prioridad y horario claro.
          </p>
        </div>
        {canCreate && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button type="button" onClick={onAddBaseRoutine} disabled={presetSaving || saving} className="w-full rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-60 sm:w-auto">
              {presetSaving ? "Agregando..." : "Agregar cuidados esenciales"}
            </button>
            <button
              type="button"
              onClick={onNew}
              className="w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 sm:w-auto"
            >
              Nueva rutina
            </button>
          </div>
        )}
      </div>

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

function TurnRoutineColumn({ turno, items, canEdit, saving, onEdit, onDeactivate }) {
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
              saving={saving}
              onEdit={onEdit}
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

function ActivityRow({ activity, canEdit, saving, onEdit, onDeactivate }) {
  const schedules = getActiveCareSchedules(activity);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="teal">{CARE_CATEGORY_LABEL[activity.categoria] ?? activity.categoria}</Badge>
      </div>

      <h4 className="mt-2 text-sm font-semibold text-slate-950">{activity.titulo}</h4>
      {activity.instrucciones && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{activity.instrucciones}</p>}

      <div className="mt-3 space-y-1.5">
        {schedules.map((schedule, index) => (
          <div key={schedule.id ?? `${schedule.turno}-${schedule.hora}-${index}`} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
            {formatCareSchedule(schedule)}
          </div>
        ))}
      </div>


      <div className="mt-3 flex flex-wrap gap-2">
        {canEdit && (
          <button type="button" onClick={() => onEdit(activity)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Editar
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
            <h2 className="text-base font-semibold text-slate-950">Información clínica y alertas</h2>
            <Badge tone={metrics.hasClinicalSummary ? "emerald" : "amber"}>
              {metrics.hasClinicalSummary ? "Completo" : "Pendiente"}
            </Badge>
            {dirty && <Badge tone="amber">Borrador</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Contexto que orienta al equipo. Opcional: no bloquea la operación diaria.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
          {open ? "Ocultar" : "Editar"}
          <Chevron open={open} />
        </span>
      </button>

      {!open && (
        <div className="border-t border-slate-100 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          {(plan.objetivo_biopsicosocial || plan.valoracion_social || plan.meta_rehabilitacion) && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 border-t border-slate-100 pt-3">
              <ClinicalSummaryItem label="Objetivo biopsicosocial" value={plan.objetivo_biopsicosocial} fallback={null} />
              <ClinicalSummaryItem label="Valoración social" value={plan.valoracion_social} fallback={null} />
              <ClinicalSummaryItem label="Meta de rehabilitación" value={plan.meta_rehabilitacion} fallback={null} />
            </div>
          )}
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
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          )}
        </form>
      )}
    </section>
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

function TextArea({ label, value, onChange, disabled, rows = 3, placeholder }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      />
    </label>
  );
}
