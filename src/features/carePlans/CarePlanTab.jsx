import { useEffect, useMemo, useState } from "react";
import Modal from "../../components/Modal";
import HelpTooltip from "../../components/HelpTooltip";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import {
  CARE_ACTIVITY_PRESETS,
  CARE_CATEGORIES,
  CARE_CATEGORY_LABEL,
  CARE_OPEN_STATUSES,
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

const INITIAL_PLAN = {
  titulo: "Plan de cuidado",
  objetivos: "",
  pauta_alimentacion: "",
  pauta_hidratacion: "",
  restricciones: "",
  riesgo_caidas: "",
  riesgo_up: "",
};

const INITIAL_ACTIVITY = {
  categoria: "alimentacion",
  titulo: "",
  descripcion: "",
  instrucciones: "",
  prioridad: "media",
  requiere_observacion: false,
  visible_familiar: false,
  resumen_familiar: "",
  activo: true,
};

const INITIAL_SCHEDULE = {
  frecuencia: "diaria",
  dias_semana: [1, 2, 3, 4, 5, 6, 7],
  dias_mes: [1],
  fecha_unica: "",
  hora: "09:00",
  turno: "mañana",
  tolerancia_min: 60,
  activo: true,
};

const WEEK_DAYS = [
  [1, "L"],
  [2, "Ma"],
  [3, "Mi"],
  [4, "J"],
  [5, "V"],
  [6, "S"],
  [7, "D"],
];

const PRIORITY_LABEL = { baja: "Baja", media: "Media", alta: "Alta", urgente: "Urgente" };
const PRIORITY_TONE = {
  baja: "bg-slate-100 text-slate-600",
  media: "bg-sky-50 text-sky-700",
  alta: "bg-amber-50 text-amber-800",
  urgente: "bg-rose-50 text-rose-700",
};
const PRIORITY_BORDER = {
  baja: "border-l-slate-300",
  media: "border-l-sky-300",
  alta: "border-l-amber-400",
  urgente: "border-l-rose-500",
};
const PRIORITY_ORDER = { urgente: 0, alta: 1, media: 2, baja: 3 };

function cloneSchedule(schedule = {}) {
  return {
    ...INITIAL_SCHEDULE,
    ...schedule,
    hora: schedule.hora?.slice(0, 5) ?? INITIAL_SCHEDULE.hora,
    dias_semana: schedule.dias_semana ?? INITIAL_SCHEDULE.dias_semana,
    dias_mes: schedule.dias_mes ?? INITIAL_SCHEDULE.dias_mes,
    fecha_unica: schedule.fecha_unica ?? "",
    tolerancia_min: Number(schedule.tolerancia_min ?? INITIAL_SCHEDULE.tolerancia_min),
    activo: schedule.activo !== false,
  };
}

function activeSchedules(activity) {
  return (activity?.horarios ?? [])
    .filter((schedule) => schedule.activo !== false)
    .sort((a, b) => `${a.turno ?? ""}${a.hora ?? ""}`.localeCompare(`${b.turno ?? ""}${b.hora ?? ""}`));
}

function formatSchedule(schedule) {
  const base = `${schedule.turno ?? "turno"} · ${schedule.hora?.slice(0, 5) ?? "--:--"}`;
  const tolerance = `tol. ${Number(schedule.tolerancia_min ?? 60)} min`;
  if (schedule.frecuencia === "semanal") {
    const days = (schedule.dias_semana ?? []).map((day) => WEEK_DAYS.find(([id]) => id === day)?.[1]).filter(Boolean).join(", ");
    return `${base} · semanal${days ? ` (${days})` : ""} · ${tolerance}`;
  }
  if (schedule.frecuencia === "mensual") return `${base} · día ${schedule.dias_mes?.[0] ?? 1} · ${tolerance}`;
  if (schedule.frecuencia === "una_vez") return `${base} · ${schedule.fecha_unica || "fecha única"} · ${tolerance}`;
  return `${base} · diaria · ${tolerance}`;
}

function presetKey(item) {
  return `${item.categoria}:${item.titulo}`.toLowerCase();
}

export default function CarePlanTab({ resident }) {
  const toast = useToast();
  const { can } = useAuth();
  const [plan, setPlan] = useState(null);
  const [dayTasks, setDayTasks] = useState([]);
  const [form, setForm] = useState(INITIAL_PLAN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);
  const [activityModal, setActivityModal] = useState(null);
  const [showPaused, setShowPaused] = useState(false);

  const canEdit = can("editar_planes_cuidado");
  const canCreate = can("crear_planes_cuidado");
  const canManage = plan ? canEdit : canCreate;

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
      setForm(data ? {
        titulo: data.titulo ?? "Plan de cuidado",
        objetivos: data.objetivos ?? "",
        pauta_alimentacion: data.pauta_alimentacion ?? "",
        pauta_hidratacion: data.pauta_hidratacion ?? "",
        restricciones: data.restricciones ?? "",
        riesgo_caidas: data.riesgo_caidas ?? "",
        riesgo_up: data.riesgo_up ?? "",
      } : INITIAL_PLAN);
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

  const activities = useMemo(() => {
    return (plan?.actividades ?? [])
      .filter((item) => item.activo !== false)
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.prioridad] ?? 2;
        const pb = PRIORITY_ORDER[b.prioridad] ?? 2;
        if (pa !== pb) return pa - pb;
        return (a.titulo || "").localeCompare(b.titulo || "");
      });
  }, [plan]);

  const pausedActivities = useMemo(
    () => (plan?.actividades ?? []).filter((item) => item.activo === false),
    [plan]
  );

  const existingPresetIds = useMemo(() => {
    const keys = new Set(activities.map(presetKey));
    return new Set(
      CARE_ACTIVITY_PRESETS
        .filter((preset) => keys.has(presetKey(preset.activity)))
        .map((preset) => preset.id)
    );
  }, [activities]);

  const presetGroups = useMemo(() => {
    return CARE_ACTIVITY_PRESETS.reduce((acc, preset) => {
      if (!acc[preset.area]) acc[preset.area] = [];
      acc[preset.area].push(preset);
      return acc;
    }, {});
  }, []);

  const metrics = useMemo(() => {
    const highPriority = activities.filter((item) => ["alta", "urgente"].includes(item.prioridad)).length;
    const followUp = activities.filter((item) => item.requiere_observacion).length;
    const schedules = activities.reduce((acc, item) => acc + activeSchedules(item).length, 0);
    const openToday = dayTasks.filter((task) => CARE_OPEN_STATUSES.includes(task.estado)).length;
    const reprogrammed = dayTasks.filter((task) => task.estado === "reprogramada").length;
    return { active: activities.length, highPriority, followUp, schedules, openToday, reprogrammed };
  }, [activities, dayTasks]);

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveCarePlan(resident.id, { ...form, id: plan?.id });
      toast("Plan de cuidado guardado.", "success");
      await load();
    } catch (err) {
      console.error(err);
      toast("No se pudo guardar el plan.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveActivity = async ({ activity, schedules }) => {
    if (!plan) return;
    setSaving(true);
    try {
      await saveCareActivity({ plan, activity: { ...activity, schedules } });
      toast("Actividad guardada.", "success");
      setActivityModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast(err.message || "No se pudo guardar la actividad.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (activity) => {
    setSaving(true);
    try {
      await deactivateCareActivity(activity.id);
      toast("Actividad pausada.", "info");
      await load();
    } catch (err) {
      console.error(err);
      toast("No se pudo pausar la actividad.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (activity) => {
    setSaving(true);
    try {
      await reactivateCareActivity(activity.id);
      toast("Actividad reactivada.", "success");
      await load();
    } catch (err) {
      console.error(err);
      toast("No se pudo reactivar la actividad.", "error");
    } finally {
      setSaving(false);
    }
  };

  const openActivity = (activity) => {
    setActivityModal({
      activity,
      schedules: activeSchedules(activity).length ? activeSchedules(activity) : [INITIAL_SCHEDULE],
    });
  };

  const duplicateActivity = (activity) => {
    setActivityModal({
      activity: {
        ...INITIAL_ACTIVITY,
        ...activity,
        id: undefined,
        titulo: `${activity.titulo} (copia)`,
        activo: true,
      },
      schedules: activeSchedules(activity).map((schedule) => ({ ...schedule, id: undefined })),
    });
  };

  const openPreset = (preset) => {
    const existing = activities.find((item) => presetKey(item) === presetKey(preset.activity));
    if (existing) {
      if (canEdit) openActivity(existing);
      return;
    }

    setActivityModal({
      activity: { ...INITIAL_ACTIVITY, ...preset.activity },
      schedules: [{ ...INITIAL_SCHEDULE, ...preset.schedule }],
    });
  };

  const handleAddBaseRoutine = async () => {
    if (!plan) return;
    setPresetSaving(true);
    try {
      const result = await createCarePresetActivities({
        plan,
        presetIds: CARE_ACTIVITY_PRESETS.map((preset) => preset.id),
        existingActivities: activities,
      });
      const createdText = `${result.created} actividad${result.created === 1 ? "" : "es"}`;
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

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="space-y-5">
      <WorkflowGuide />

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Actividades" value={metrics.active} tone="teal" />
        <Metric label="Alta prioridad" value={metrics.highPriority} tone="amber" />
        <Metric label="Horarios" value={metrics.schedules} />
        <Metric label="Seguimiento" value={metrics.followUp} tone="sky" />
        <Metric label="Pendientes hoy" value={metrics.openToday} tone="amber" />
        <Metric label="Reprogramadas" value={metrics.reprogrammed} tone="sky" />
      </section>

      <form onSubmit={handleSavePlan} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">PAI y pautas clínicas</h2>
            <p className="text-sm text-slate-500">
              Define el marco clínico antes de programar rutinas. Medicamentos se gestionan en eMAR.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            Versión {plan?.version ?? 1}
            <HelpTooltip label="Ayuda: plan de cuidado">
              El plan convierte pautas no farmacológicas en tareas por turno. La tolerancia de cada horario determina cuándo queda vencida.
            </HelpTooltip>
          </div>
        </div>

        {!plan && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Este residente aún no tiene plan activo. Guarda la pauta base para empezar a agregar actividades y horarios.
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-4">
            <SectionTitle title="Identificación y objetivos" subtitle="Lo que guía la ejecución diaria." />
            <Field label="Título del plan" value={form.titulo} onChange={(value) => setForm((p) => ({ ...p, titulo: value }))} disabled={!canManage || saving} />
            <TextArea label="Objetivos clínico-operativos" value={form.objetivos} onChange={(value) => setForm((p) => ({ ...p, objetivos: value }))} disabled={!canManage || saving} rows={5} />
          </div>
          <div className="space-y-4">
            <SectionTitle title="Riesgos y restricciones" subtitle="Alertas visibles para quienes ejecutan tareas." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <SelectField label="Riesgo de caídas" value={form.riesgo_caidas} onChange={(value) => setForm((p) => ({ ...p, riesgo_caidas: value }))} disabled={!canManage || saving} />
              <SelectField label="Riesgo UPP" value={form.riesgo_up} onChange={(value) => setForm((p) => ({ ...p, riesgo_up: value }))} disabled={!canManage || saving} />
            </div>
            <TextArea label="Restricciones o alertas" value={form.restricciones} onChange={(value) => setForm((p) => ({ ...p, restricciones: value }))} disabled={!canManage || saving} rows={5} />
          </div>
          <div className="space-y-4">
            <SectionTitle title="Pautas base" subtitle="Usadas para alimentación, hidratación y continuidad." />
            <TextArea label="Pauta de alimentación" value={form.pauta_alimentacion} onChange={(value) => setForm((p) => ({ ...p, pauta_alimentacion: value }))} disabled={!canManage || saving} rows={4} />
            <TextArea label="Pauta de hidratación" value={form.pauta_hidratacion} onChange={(value) => setForm((p) => ({ ...p, pauta_hidratacion: value }))} disabled={!canManage || saving} rows={4} />
          </div>
        </div>

        {canManage && (
          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? "Guardando..." : plan ? "Guardar PAI" : "Crear plan"}
            </button>
          </div>
        )}
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Actividades y programación</h2>
            <p className="text-sm text-slate-500">
              Cada actividad puede tener varios horarios. Al generar el turno, el sistema crea una tarea por horario vigente.
            </p>
          </div>
          {plan && canCreate && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAddBaseRoutine}
                disabled={presetSaving || saving}
                className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-60"
              >
                {presetSaving ? "Agregando..." : "Agregar rutina base"}
              </button>
              <button
                type="button"
                onClick={() => setActivityModal({ activity: INITIAL_ACTIVITY, schedules: [INITIAL_SCHEDULE] })}
                className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Nueva actividad
              </button>
            </div>
          )}
        </div>

        {plan && canCreate && (
          <PresetPicker
            groups={presetGroups}
            existingPresetIds={existingPresetIds}
            saving={saving || presetSaving}
            canEdit={canEdit}
            onOpen={openPreset}
          />
        )}

        {!plan ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Crea el plan base para agregar actividades.
          </p>
        ) : activities.length === 0 && pausedActivities.length === 0 ? (
          <EmptyActivities />
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {activities.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                canEdit={canEdit}
                canCreate={canCreate}
                saving={saving}
                onEdit={openActivity}
                onDuplicate={duplicateActivity}
                onDeactivate={handleDeactivate}
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
            onToggle={() => setShowPaused((prev) => !prev)}
            onReactivate={handleReactivate}
          />
        )}
      </section>

      <ActivityModal
        modal={activityModal}
        saving={saving}
        onClose={() => !saving && setActivityModal(null)}
        onSubmit={handleSaveActivity}
      />
    </div>
  );
}

function WorkflowGuide() {
  const steps = [
    ["Definir pauta", "Objetivos, riesgos y restricciones del PAI."],
    ["Programar", "Actividades con frecuencia, turno, hora y tolerancia."],
    ["Ejecutar", "El turno cumple, omite o reprograma con trazabilidad."],
    ["Portal familiar", "Solo las actividades publicadas con resumen seguro aparecen para los familiares vinculados."],
  ];
  return (
    <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
      <div className="grid gap-3 md:grid-cols-4">
        {steps.map(([title, text], index) => (
          <div key={title} className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-semibold text-teal-800 ring-1 ring-teal-200">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-teal-950">{title}</p>
              <p className="mt-0.5 text-xs leading-5 text-teal-800">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, tone = "slate" }) {
  const cls = {
    slate: "border-slate-200 bg-white text-slate-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    teal: "border-teal-200 bg-teal-50 text-teal-900",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs font-medium opacity-70">{label}</div>
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function PresetPicker({ groups, existingPresetIds, saving, canEdit, onOpen }) {
  return (
    <div className="mt-5 border-y border-slate-100 py-5">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Rutina sugerida ELEAM</h3>
          <p className="text-sm text-slate-500">Base clínica editable para no empezar desde cero.</p>
        </div>
        <p className="text-xs text-slate-400">Las ya agregadas aparecen en verde.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(groups).map(([area, presets]) => (
          <div key={area}>
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
                    title={added ? "Editar actividad existente" : "Agregar esta actividad"}
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
    </div>
  );
}

function EmptyActivities() {
  return (
    <div className="mt-6 p-4 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-50">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-teal-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-950">Sin actividades aún</p>
      <p className="mt-1 text-sm text-slate-500">Agrega alimentación, baño, movilidad u otros cuidados recurrentes.</p>
    </div>
  );
}

function ActivityRow({ activity, canEdit, canCreate, saving, onEdit, onDuplicate, onDeactivate }) {
  const schedules = activeSchedules(activity);
  return (
    <div className={`border-l-4 py-4 pl-4 ${PRIORITY_BORDER[activity.prioridad] ?? PRIORITY_BORDER.media}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="teal">{CARE_CATEGORY_LABEL[activity.categoria] ?? activity.categoria}</Badge>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_TONE[activity.prioridad] ?? PRIORITY_TONE.media}`}>
              {PRIORITY_LABEL[activity.prioridad] ?? activity.prioridad}
            </span>
            {activity.requiere_observacion && <Badge tone="amber">seguimiento al cerrar</Badge>}
            <Badge tone={activity.visible_familiar ? "emerald" : "slate"}>
              {activity.visible_familiar ? "Visible familia" : "Interno"}
            </Badge>
            <Badge>{schedules.length} horario{schedules.length === 1 ? "" : "s"}</Badge>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-950">{activity.titulo}</h3>
          {activity.descripcion && <p className="mt-1 text-sm text-slate-600">{activity.descripcion}</p>}
          {activity.instrucciones && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{activity.instrucciones}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {schedules.map((schedule, index) => (
              <span key={schedule.id ?? `${schedule.turno}-${schedule.hora}-${index}`} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500">
                {formatSchedule(schedule)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canEdit && (
            <button type="button" onClick={() => onEdit(activity)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Editar
            </button>
          )}
          {canCreate && (
            <button type="button" onClick={() => onDuplicate(activity)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Duplicar
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => onDeactivate(activity)}
              disabled={saving}
              className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              Pausar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PausedActivities({ items, show, canEdit, saving, onToggle, onReactivate }) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`h-4 w-4 transition-transform ${show ? "rotate-90" : ""}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        {items.length} actividad{items.length === 1 ? "" : "es"} pausada{items.length === 1 ? "" : "s"}
      </button>
      {show && (
        <div className="mt-3 space-y-2">
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

function ActivityModal({ modal, saving, onClose, onSubmit }) {
  const [activity, setActivity] = useState(INITIAL_ACTIVITY);
  const [schedules, setSchedules] = useState([INITIAL_SCHEDULE]);

  useEffect(() => {
    if (!modal) return;
    const sourceSchedules = modal.schedules?.length
      ? modal.schedules
      : modal.schedule
        ? [modal.schedule]
        : [INITIAL_SCHEDULE];
    setActivity({ ...INITIAL_ACTIVITY, ...modal.activity, activo: modal.activity?.activo !== false });
    setSchedules(sourceSchedules.map(cloneSchedule));
  }, [modal]);

  if (!modal) return null;

  const updateSchedule = (index, patch) => {
    setSchedules((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const addSchedule = () => setSchedules((prev) => [...prev, cloneSchedule({ ...prev[prev.length - 1], id: undefined })]);
  const removeSchedule = (index) => setSchedules((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  const familySummaryMissing = activity.visible_familiar && !activity.resumen_familiar?.trim();

  return (
    <Modal isOpen={!!modal} onClose={onClose} title={activity.id ? "Editar actividad" : "Nueva actividad"}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ activity, schedules });
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Categoría
            <select
              value={activity.categoria}
              onChange={(e) => setActivity((p) => ({ ...p, categoria: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {CARE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Prioridad
            <select
              value={activity.prioridad}
              onChange={(e) => setActivity((p) => ({ ...p, prioridad: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </label>
        </div>
        <Field label="Título" value={activity.titulo} onChange={(value) => setActivity((p) => ({ ...p, titulo: value }))} disabled={saving} />
        <TextArea label="Descripción operativa" value={activity.descripcion ?? ""} onChange={(value) => setActivity((p) => ({ ...p, descripcion: value }))} disabled={saving} rows={3} />
        <TextArea label="Instrucciones internas para el turno" value={activity.instrucciones ?? ""} onChange={(value) => setActivity((p) => ({ ...p, instrucciones: value }))} disabled={saving} rows={3} />

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={activity.visible_familiar}
              disabled={saving}
              onChange={(e) => setActivity((p) => ({
                ...p,
                visible_familiar: e.target.checked,
                resumen_familiar: e.target.checked ? p.resumen_familiar ?? "" : "",
              }))}
              className="mt-0.5 h-4 w-4 accent-teal-700"
            />
            <span>
              <span className="block font-semibold text-slate-800">Publicar en portal familiar</span>
              <span className="block text-xs text-slate-500">
                Desactivado por defecto. El portal mostrará solo el resumen para familia.
              </span>
            </span>
          </label>
          {activity.visible_familiar && (
            <div className="mt-3">
              <TextArea
                label="Resumen para familia"
                value={activity.resumen_familiar ?? ""}
                onChange={(value) => setActivity((p) => ({ ...p, resumen_familiar: value }))}
                disabled={saving}
                rows={2}
              />
              {familySummaryMissing && (
                <p className="mt-1 text-xs text-rose-600">Es obligatorio para publicar la actividad.</p>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Horarios</h3>
              <p className="text-xs text-slate-500">La frecuencia crea tareas; la tolerancia define cuándo quedan vencidas.</p>
            </div>
            <button
              type="button"
              onClick={addSchedule}
              className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50"
            >
              Agregar horario
            </button>
          </div>
          <div className="space-y-3">
            {schedules.map((schedule, index) => (
              <ScheduleEditor
                key={schedule.id ?? index}
                index={index}
                schedule={schedule}
                canRemove={schedules.length > 1}
                saving={saving}
                onChange={(patch) => updateSchedule(index, patch)}
                onRemove={() => removeSchedule(index)}
              />
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <input
            type="checkbox"
            checked={activity.requiere_observacion}
            onChange={(e) => setActivity((p) => ({ ...p, requiere_observacion: e.target.checked }))}
            className="mt-0.5 h-4 w-4 accent-teal-700"
          />
          <span>
            Crear observación al cerrar esta actividad.
            <span className="block text-xs text-amber-700">Úsalo en rutinas donde el resultado clínico debe quedar trazado.</span>
          </span>
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !activity.titulo?.trim() || schedules.length === 0 || familySummaryMissing} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar actividad"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ScheduleEditor({ index, schedule, canRemove, saving, onChange, onRemove }) {
  const toggleDay = (day) => {
    const set = new Set(schedule.dias_semana ?? []);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    onChange({ dias_semana: Array.from(set).sort((a, b) => a - b) });
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Horario {index + 1}</p>
          <p className="text-xs text-slate-500">{formatSchedule(schedule)}</p>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} disabled={saving} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
            Quitar
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <label className="block text-sm font-medium text-slate-700">
          Frecuencia
          <select
            value={schedule.frecuencia}
            onChange={(e) => onChange({ frecuencia: e.target.value })}
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
            onChange={(e) => onChange({ turno: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            {CARE_TURNOS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Hora
          <input
            type="time"
            value={schedule.hora}
            onChange={(e) => onChange({ hora: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <Field
          label="Tolerancia (min)"
          type="number"
          min="0"
          max="720"
          step="5"
          value={schedule.tolerancia_min}
          onChange={(value) => onChange({ tolerancia_min: Number(value) })}
          disabled={saving}
        />
      </div>

      {schedule.frecuencia === "semanal" && (
        <div className="mt-3">
          <div className="mb-2 text-sm font-medium text-slate-700">Días</div>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map(([day, label]) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`grid h-9 min-w-[2.25rem] place-items-center rounded-full border px-2 text-xs font-semibold ${
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
        <div className="mt-3 max-w-xs">
          <Field
            label="Día del mes"
            type="number"
            min="1"
            max="31"
            value={(schedule.dias_mes?.[0] ?? 1).toString()}
            onChange={(value) => onChange({ dias_mes: [Math.max(1, Math.min(31, Number(value) || 1))] })}
            disabled={saving}
          />
        </div>
      )}

      {schedule.frecuencia === "una_vez" && (
        <label className="mt-3 block max-w-xs text-sm font-medium text-slate-700">
          Fecha
          <input
            type="date"
            value={schedule.fecha_unica}
            onChange={(e) => onChange({ fecha_unica: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      )}
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

function SelectField({ label, value, onChange, disabled }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
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
