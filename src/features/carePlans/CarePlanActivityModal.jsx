import { useMemo } from "react";
import Modal from "../../components/Modal";
import { useConfirm } from "../../components/ConfirmDialog";
import useSessionFormDraft from "../../hooks/useSessionFormDraft";
import { CARE_CATEGORIES, CARE_TURNOS } from "./carePlansService";
import {
  INITIAL_CARE_ACTIVITY,
  INITIAL_CARE_SCHEDULE,
  TURN_LABELS,
  WEEK_DAYS,
  buildDailyShiftSchedules,
  careScheduleError,
  carePresetKey,
} from "./carePlanUi";

const DEFAULT_TIME_BY_SHIFT = { "mañana": "09:00", tarde: "15:00", noche: "21:00" };
const CATEGORY_ALIAS = {
  hidratacion: "alimentacion",
  bano: "higiene",
  cambios_posicion: "movilidad",
  prevencion_caidas: "movilidad",
  prevencion_up: "movilidad",
  psicologico: "actividad",
  social: "actividad",
  preventivo: "actividad",
  recreativo: "actividad",
};

export default function CarePlanActivityModal({ modal, saving, onClose, onSubmit }) {
  const confirm = useConfirm();
  const modalSeed = useMemo(() => {
    const source = modal?.schedules?.length ? modal.schedules : [INITIAL_CARE_SCHEDULE];
    return {
      activity: {
        ...INITIAL_CARE_ACTIVITY,
        ...modal?.activity,
        categoria: CATEGORY_ALIAS[modal?.activity?.categoria] ?? modal?.activity?.categoria ?? "alimentacion",
        activo: modal?.activity?.activo !== false,
      },
      schedules: buildDailyShiftSchedules(source.map((item) => item.turno), source),
      sourceCategory: modal?.activity?.categoria ?? null,
      categoryChanged: false,
    };
  }, [modal]);
  const draftKey = modal
    ? `fichaeleam_careActivity_simple_${modal.activity?.id ?? (carePresetKey(modal.activity) || "new")}`
    : "fichaeleam_careActivity_simple_closed";
  const [draft, setDraft, resetDraft, dirty] = useSessionFormDraft(draftKey, modalSeed);

  if (!modal) return null;

  const activity = draft.activity ?? INITIAL_CARE_ACTIVITY;
  const schedules = draft.schedules ?? [INITIAL_CARE_SCHEDULE];
  const scheduleErrors = schedules.map(careScheduleError).filter(Boolean);
  const selectedShifts = new Set(schedules.map((item) => item.turno));
  const updateActivity = (patch) => setDraft((prev) => ({
    ...prev,
    activity: { ...(prev.activity ?? INITIAL_CARE_ACTIVITY), ...patch },
  }));
  const toggleShift = (shift) => setDraft((prev) => {
    const current = prev.schedules ?? [];
    const exists = current.some((item) => item.turno === shift);
    const next = exists
      ? current.filter((item) => item.turno !== shift)
      : [...current, { ...INITIAL_CARE_SCHEDULE, turno: shift, hora: DEFAULT_TIME_BY_SHIFT[shift] }];
    return { ...prev, schedules: buildDailyShiftSchedules(next.map((item) => item.turno), next) };
  });
  const updateTime = (shift, hora) => setDraft((prev) => ({
    ...prev,
    schedules: (prev.schedules ?? []).map((item) => item.turno === shift ? { ...item, hora } : item),
  }));
  const updateSchedule = (shift, patch) => setDraft((prev) => ({
    ...prev,
    schedules: (prev.schedules ?? []).map((item) => item.turno === shift ? { ...item, ...patch } : item),
  }));
  const toggleWeekDay = (shift, day) => setDraft((prev) => ({
    ...prev,
    schedules: (prev.schedules ?? []).map((item) => {
      if (item.turno !== shift) return item;
      const selected = new Set(item.dias_semana ?? []);
      if (selected.has(day)) selected.delete(day);
      else selected.add(day);
      return { ...item, dias_semana: [...selected].sort((a, b) => a - b) };
    }),
  }));
  const handleClose = async () => {
    if (dirty) {
      const ok = await confirm({
        title: "Descartar cambios",
        message: "Hay cambios sin guardar. ¿Quieres descartarlos?",
        confirmText: "Descartar",
        cancelText: "Seguir editando",
        danger: true,
      });
      if (!ok) return;
      resetDraft();
    }
    onClose();
  };

  return (
    <Modal isOpen onClose={handleClose} title={activity.id ? "Editar cuidado" : "Agregar cuidado"} panelClassName="max-w-xl p-4 sm:p-6">
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const activityToSave = {
            ...activity,
            categoria: !draft.categoryChanged && draft.sourceCategory
              ? draft.sourceCategory
              : activity.categoria,
          };
          Promise.resolve(onSubmit({
            activity: activityToSave,
            schedules,
          })).then((ok) => ok && resetDraft());
        }}
      >
        <p className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-900">
          Define una acción concreta. Al guardarla aparecerá como tarea en cada turno seleccionado.
        </p>

        <Field label="Cuidado" value={activity.titulo ?? ""} onChange={(titulo) => updateActivity({ titulo })} disabled={saving} placeholder="Ej.: Ayuda en alimentación" />

        <label className="block text-sm font-medium text-slate-700">
          Área
          <select value={activity.categoria} onChange={(event) => {
            updateActivity({ categoria: event.target.value });
            setDraft((prev) => ({ ...prev, categoryChanged: true }));
          }} disabled={saving} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
            {CARE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Turnos en que se realiza</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {CARE_TURNOS.map((shift) => {
              const schedule = schedules.find((item) => item.turno === shift);
              return (
              <div key={shift} className={`rounded-xl border p-3 ${selectedShifts.has(shift) ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"}`}>
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <input type="checkbox" checked={selectedShifts.has(shift)} onChange={() => toggleShift(shift)} disabled={saving || (selectedShifts.size === 1 && selectedShifts.has(shift))} className="h-4 w-4 accent-teal-700" />
                  {TURN_LABELS[shift]}
                </span>
                {selectedShifts.has(shift) && (
                  <div className="mt-2 space-y-2">
                    <input aria-label={`Hora ${TURN_LABELS[shift]}`} type="time" value={schedule?.hora ?? DEFAULT_TIME_BY_SHIFT[shift]} onChange={(event) => updateTime(shift, event.target.value)} disabled={saving} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" />
                    <select aria-label={`Frecuencia ${TURN_LABELS[shift]}`} value={schedule?.frecuencia ?? "diaria"} onChange={(event) => updateSchedule(shift, { frecuencia: event.target.value })} disabled={saving} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm">
                      <option value="diaria">Todos los días</option>
                      <option value="semanal">Días específicos</option>
                      <option value="mensual">Un día al mes</option>
                      <option value="una_vez">Una sola fecha</option>
                    </select>
                    {schedule?.frecuencia === "semanal" && (
                      <div className="flex flex-wrap gap-1" aria-label={`Días ${TURN_LABELS[shift]}`}>
                        {WEEK_DAYS.map(([day, label]) => (
                          <button key={day} type="button" onClick={() => toggleWeekDay(shift, day)} disabled={saving} aria-pressed={schedule.dias_semana?.includes(day)} className={`min-h-8 min-w-8 rounded-lg border px-1 text-xs font-semibold ${schedule.dias_semana?.includes(day) ? "border-teal-500 bg-teal-700 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                    {schedule?.frecuencia === "mensual" && (
                      <label className="block text-xs font-medium text-slate-600">Día del mes<input aria-label={`Día del mes ${TURN_LABELS[shift]}`} type="number" min="1" max="31" value={schedule.dias_mes?.[0] ?? 1} onChange={(event) => updateSchedule(shift, { dias_mes: [Number(event.target.value)] })} disabled={saving} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" /></label>
                    )}
                    {schedule?.frecuencia === "una_vez" && (
                      <label className="block text-xs font-medium text-slate-600">Fecha<input aria-label={`Fecha ${TURN_LABELS[shift]}`} type="date" value={schedule.fecha_unica ?? ""} onChange={(event) => updateSchedule(shift, { fecha_unica: event.target.value })} disabled={saving} required className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" /></label>
                    )}
                    {careScheduleError(schedule) && <p className="text-xs font-semibold text-rose-700">{careScheduleError(schedule)}</p>}
                  </div>
                )}
              </div>
            );})}
          </div>
        </fieldset>

        <TextArea label="Indicación especial" value={activity.instrucciones ?? ""} onChange={(instrucciones) => updateActivity({ instrucciones })} disabled={saving} placeholder="Opcional. Ej.: textura papilla; avisar si rechaza." />

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input type="checkbox" checked={activity.requiere_observacion === true} onChange={(event) => updateActivity({ requiere_observacion: event.target.checked })} disabled={saving} className="mt-0.5 h-4 w-4 accent-teal-700" />
          <span><span className="block text-sm font-semibold text-slate-800">Solicitar registro ante novedades</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">Úsalo cuando un rechazo, dificultad o cambio de condición deba quedar en la evolución.</span></span>
        </label>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
          <button type="submit" disabled={saving || !activity.titulo?.trim() || schedules.length === 0 || scheduleErrors.length > 0} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar cuidado"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, value, onChange, disabled, placeholder }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder={placeholder} maxLength={140} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label>;
}

function TextArea({ label, value, onChange, disabled, placeholder }) {
  return <label className="block text-sm font-medium text-slate-700">{label} <span className="text-xs font-normal text-slate-400">(opcional)</span><textarea value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder={placeholder} rows={3} maxLength={500} className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label>;
}
