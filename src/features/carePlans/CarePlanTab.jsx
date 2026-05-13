import { useEffect, useMemo, useState } from "react";
import Modal from "../../components/Modal";
import HelpTooltip from "../../components/HelpTooltip";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import {
  CARE_CATEGORIES,
  CARE_CATEGORY_LABEL,
  CARE_TURNOS,
  deactivateCareActivity,
  getResidentCarePlan,
  saveCareActivity,
  saveCarePlan,
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

export default function CarePlanTab({ resident }) {
  const toast = useToast();
  const { can } = useAuth();
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState(INITIAL_PLAN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activityModal, setActivityModal] = useState(null);
  const [showPaused, setShowPaused] = useState(false);

  const canEdit = can("editar_planes_cuidado");
  const canCreate = can("crear_planes_cuidado");
  const canManage = plan ? canEdit : canCreate;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getResidentCarePlan(resident.id);
      setPlan(data);
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

  const handleSaveActivity = async ({ activity, schedule }) => {
    if (!plan) return;
    setSaving(true);
    try {
      await saveCareActivity({ plan, activity, schedule });
      toast("Actividad guardada.", "success");
      setActivityModal(null);
      await load();
    } catch (err) {
      console.error(err);
      toast("No se pudo guardar la actividad.", "error");
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
    } catch {
      toast("No se pudo pausar la actividad.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSavePlan} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Plan de cuidado</h2>
            <p className="text-sm text-slate-500">
              Pautas no farmacológicas para convertir en tareas por turno.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            Versión {plan?.version ?? 1}
            <HelpTooltip label="Ayuda: plan de cuidado">
              Usa esta sección para alimentación, hidratación, higiene, movilidad, prevención de caídas y otros cuidados. Medicamentos van en eMAR.
            </HelpTooltip>
          </div>
        </div>

        {!plan && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Este residente aún no tiene plan activo. Guarda la pauta base para empezar a agregar actividades.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Título" value={form.titulo} onChange={(value) => setForm((p) => ({ ...p, titulo: value }))} disabled={!canManage || saving} />
          <SelectField label="Riesgo de caídas" value={form.riesgo_caidas} onChange={(value) => setForm((p) => ({ ...p, riesgo_caidas: value }))} disabled={!canManage || saving} />
          <SelectField label="Riesgo UPP" value={form.riesgo_up} onChange={(value) => setForm((p) => ({ ...p, riesgo_up: value }))} disabled={!canManage || saving} />
          <TextArea label="Objetivos" value={form.objetivos} onChange={(value) => setForm((p) => ({ ...p, objetivos: value }))} disabled={!canManage || saving} />
          <TextArea label="Pauta de alimentación" value={form.pauta_alimentacion} onChange={(value) => setForm((p) => ({ ...p, pauta_alimentacion: value }))} disabled={!canManage || saving} />
          <TextArea label="Pauta de hidratación" value={form.pauta_hidratacion} onChange={(value) => setForm((p) => ({ ...p, pauta_hidratacion: value }))} disabled={!canManage || saving} />
          <div className="md:col-span-2">
            <TextArea label="Restricciones o alertas" value={form.restricciones} onChange={(value) => setForm((p) => ({ ...p, restricciones: value }))} disabled={!canManage || saving} />
          </div>
        </div>

        {canManage && (
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? "Guardando..." : plan ? "Guardar cambios" : "Crear plan"}
            </button>
          </div>
        )}
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Actividades programadas</h2>
            <p className="text-sm text-slate-500">Cada actividad genera tareas según su frecuencia y turno.</p>
          </div>
          {plan && canCreate && (
            <button              type="button"
              onClick={() => setActivityModal({ activity: INITIAL_ACTIVITY, schedule: INITIAL_SCHEDULE })}
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Nueva actividad
            </button>
          )}
        </div>

        {!plan ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Crea el plan base para agregar actividades.
          </p>
        ) : activities.length === 0 && pausedActivities.length === 0 ? (
          <div className="mt-6 p-4 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-teal-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-950">Sin actividades aún</p>
            <p className="mt-1 text-sm text-slate-500">Agrega alimentación, baño, movilidad u otros cuidados recurrentes.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {activities.map((activity) => (
              <div key={activity.id} className={`border-l-4 py-4 pl-4 ${PRIORITY_BORDER[activity.prioridad] ?? PRIORITY_BORDER.media}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                        {CARE_CATEGORY_LABEL[activity.categoria] ?? activity.categoria}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_TONE[activity.prioridad] ?? PRIORITY_TONE.media}`}>
                        {PRIORITY_LABEL[activity.prioridad] ?? activity.prioridad}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-950">{activity.titulo}</h3>
                    {activity.descripcion && <p className="mt-1 text-sm text-slate-600">{activity.descripcion}</p>}
                    {activity.instrucciones && <p className="mt-1 text-sm text-slate-500">{activity.instrucciones}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(activity.horarios ?? []).filter((h) => h.activo !== false).map((h) => (
                        <span key={h.id} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500">
                          {h.turno} · {h.hora?.slice(0, 5)} · {h.frecuencia}
                        </span>
                      ))}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 gap-2">
                      <button                        type="button"
                        onClick={() => {
                          const schedule = (activity.horarios ?? [])[0] ?? INITIAL_SCHEDULE;
                          setActivityModal({ activity, schedule });
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button                        type="button"
                        onClick={() => handleDeactivate(activity)}
                        disabled={saving}
                        className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Pausar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {pausedActivities.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button              type="button"
              onClick={() => setShowPaused((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`h-4 w-4 transition-transform ${showPaused ? "rotate-90" : ""}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              {pausedActivities.length} actividad{pausedActivities.length === 1 ? "" : "es"} pausada{pausedActivities.length === 1 ? "" : "s"}
            </button>
            {showPaused && (
              <div className="mt-3 space-y-2">
                {pausedActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">{activity.titulo}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-400">Pausada</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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

function TextArea({ label, value, onChange, disabled }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={3}
        className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      />
    </label>
  );
}

function ActivityModal({ modal, saving, onClose, onSubmit }) {
  const [activity, setActivity] = useState(INITIAL_ACTIVITY);
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);

  useEffect(() => {
    if (!modal) return;
    setActivity({ ...INITIAL_ACTIVITY, ...modal.activity });
    setSchedule({
      ...INITIAL_SCHEDULE,
      ...modal.schedule,
      hora: modal.schedule?.hora?.slice(0, 5) ?? INITIAL_SCHEDULE.hora,
      dias_semana: modal.schedule?.dias_semana ?? INITIAL_SCHEDULE.dias_semana,
      dias_mes: modal.schedule?.dias_mes ?? INITIAL_SCHEDULE.dias_mes,
    });
  }, [modal]);

  if (!modal) return null;

  const toggleDay = (day) => {
    setSchedule((prev) => {
      const set = new Set(prev.dias_semana ?? []);
      if (set.has(day)) set.delete(day); else set.add(day);
      return { ...prev, dias_semana: Array.from(set).sort((a, b) => a - b) };
    });
  };

  return (
    <Modal isOpen={!!modal} onClose={onClose} title={activity.id ? "Editar actividad" : "Nueva actividad"}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ activity, schedule });
        }}
      >
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
        <Field label="Título" value={activity.titulo} onChange={(value) => setActivity((p) => ({ ...p, titulo: value }))} disabled={saving} />
        <TextArea label="Descripción" value={activity.descripcion ?? ""} onChange={(value) => setActivity((p) => ({ ...p, descripcion: value }))} disabled={saving} />
        <TextArea label="Instrucciones" value={activity.instrucciones ?? ""} onChange={(value) => setActivity((p) => ({ ...p, instrucciones: value }))} disabled={saving} />
        <div className="grid grid-cols-2 gap-3">
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
          <label className="block text-sm font-medium text-slate-700">
            Turno
            <select
              value={schedule.turno}
              onChange={(e) => setSchedule((p) => ({ ...p, turno: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {CARE_TURNOS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-700">
            Frecuencia
            <select
              value={schedule.frecuencia}
              onChange={(e) => setSchedule((p) => ({ ...p, frecuencia: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="una_vez">Una vez</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Hora
            <input
              type="time"
              value={schedule.hora}
              onChange={(e) => setSchedule((p) => ({ ...p, hora: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
        </div>
        <Field
          label="Tolerancia (min)"
          type="number"
          min="0"
          step="5"
          value={schedule.tolerancia_min}
          onChange={(value) => setSchedule((p) => ({ ...p, tolerancia_min: Number(value) }))}
          disabled={saving}
        />

        {schedule.frecuencia === "semanal" && (
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Días</div>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map(([day, label]) => (
                <button
                  type="button"

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
          <Field
            label="Día del mes"
            type="number"
            min="1"
            max="31"
            value={(schedule.dias_mes?.[0] ?? 1).toString()}
            onChange={(value) => setSchedule((p) => ({ ...p, dias_mes: [Math.max(1, Math.min(31, Number(value) || 1))] }))}
            disabled={saving}
          />
        )}

        {schedule.frecuencia === "una_vez" && (
          <label className="block text-sm font-medium text-slate-700">
            Fecha
            <input
              type="date"
              value={schedule.fecha_unica}
              onChange={(e) => setSchedule((p) => ({ ...p, fecha_unica: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={activity.requiere_observacion}
            onChange={(e) => setActivity((p) => ({ ...p, requiere_observacion: e.target.checked }))}
            className="h-4 w-4 accent-teal-700"
          />
          Crear observación al cerrar esta actividad
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !activity.titulo?.trim()} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
