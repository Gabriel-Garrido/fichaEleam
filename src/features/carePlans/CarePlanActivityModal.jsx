import { useMemo, useState } from "react";
import Modal from "../../components/Modal";
import useSessionFormDraft from "../../hooks/useSessionFormDraft";
import {
  CARE_CATEGORIES,
  CARE_TURNOS,
} from "./carePlansService";
import {
  INITIAL_CARE_ACTIVITY,
  INITIAL_CARE_SCHEDULE,
  TURN_LABELS,
  WEEK_DAYS,
  carePresetKey,
  cloneCareSchedule,
  formatCareSchedule,
} from "./carePlanUi";

export default function CarePlanActivityModal({ modal, saving, onClose, onSubmit }) {
  const modalSeed = useMemo(() => {
    if (!modal) {
      return { activity: INITIAL_CARE_ACTIVITY, schedules: [INITIAL_CARE_SCHEDULE] };
    }
    const sourceSchedules = modal.schedules?.length
      ? modal.schedules
      : modal.schedule
        ? [modal.schedule]
        : [INITIAL_CARE_SCHEDULE];
    return {
      activity: { ...INITIAL_CARE_ACTIVITY, ...modal.activity, activo: modal.activity?.activo !== false },
      schedules: sourceSchedules.map(cloneCareSchedule),
    };
  }, [modal]);

  const activityDraftKey = modal
    ? `fichaeleam_careActivity_${modal.activity?.id ?? (carePresetKey(modal.activity) || "new")}`
    : "fichaeleam_careActivity_closed";
  const [draft, setDraft, resetDraft, dirty] = useSessionFormDraft(activityDraftKey, modalSeed);
  const activity = draft.activity ?? INITIAL_CARE_ACTIVITY;
  const schedules = draft.schedules ?? [INITIAL_CARE_SCHEDULE];

  if (!modal) return null;

  const setActivity = (updater) => {
    setDraft((prev) => ({
      ...prev,
      activity: typeof updater === "function" ? updater(prev.activity ?? INITIAL_CARE_ACTIVITY) : updater,
    }));
  };

  const setSchedules = (updater) => {
    setDraft((prev) => ({
      ...prev,
      schedules: typeof updater === "function" ? updater(prev.schedules ?? [INITIAL_CARE_SCHEDULE]) : updater,
    }));
  };

  const updateSchedule = (index, patch) => {
    setSchedules((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };
  const addSchedule = () => setSchedules((prev) => [...prev, cloneCareSchedule({ ...prev[prev.length - 1], id: undefined })]);
  const removeSchedule = (index) => setSchedules((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  const familySummaryMissing = activity.visible_familiar && !activity.resumen_familiar?.trim();
  const handleClose = () => {
    if (dirty && !window.confirm("Hay cambios sin guardar en esta rutina. ¿Quieres descartarlos?")) return;
    if (dirty) resetDraft();
    onClose();
  };

  return (
    <Modal
      isOpen={!!modal}
      onClose={handleClose}
      title={activity.id ? "Editar rutina" : "Nueva rutina"}
      panelClassName="max-w-2xl p-4 sm:p-6"
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          Promise.resolve(onSubmit({ activity, schedules }))
            .then((ok) => {
              if (ok) resetDraft();
            });
        }}
      >
        <Section title="Qué cuidado se hará">
          <Field label="Nombre de la rutina" value={activity.titulo} onChange={(value) => setActivity((prev) => ({ ...prev, titulo: value }))} disabled={saving} placeholder="Ej: Hidratación asistida" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Categoría
              <select
                value={activity.categoria}
                onChange={(e) => setActivity((prev) => ({ ...prev, categoria: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {CARE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Prioridad
              <select
                value={activity.prioridad}
                onChange={(e) => setActivity((prev) => ({ ...prev, prioridad: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </label>
          </div>
          <TextArea
            label="Instrucciones para el turno"
            optional
            value={activity.instrucciones ?? ""}
            onChange={(value) => setActivity((prev) => ({ ...prev, instrucciones: value }))}
            disabled={saving}
            rows={3}
            placeholder="Cómo realizar el cuidado, qué observar y cuándo avisar."
          />
        </Section>

        <Section
          title="Cuándo se debe ejecutar"
          action={(
            <button
              type="button"
              onClick={addSchedule}
              className="rounded-xl border border-teal-200 bg-white px-3 py-1.5 text-sm font-semibold text-teal-800 hover:bg-teal-50"
            >
              Agregar horario
            </button>
          )}
        >
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
        </Section>

        <Section title="Visibilidad y continuidad">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={activity.requiere_observacion}
                onChange={(e) => setActivity((prev) => ({ ...prev, requiere_observacion: e.target.checked }))}
                className="mt-0.5 h-4 w-4 accent-teal-700"
              />
              <span>
                Exigir seguimiento al cerrar
                <span className="block text-xs text-slate-500">
                  El turno debe dejar continuidad clínica al completarla.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={activity.visible_familiar}
                disabled={saving}
                onChange={(e) => setActivity((prev) => ({
                  ...prev,
                  visible_familiar: e.target.checked,
                  resumen_familiar: e.target.checked ? prev.resumen_familiar ?? "" : "",
                }))}
                className="mt-0.5 h-4 w-4 accent-teal-700"
              />
              <span>
                Publicar en portal familiar
                <span className="block text-xs text-slate-500">
                  Solo se publicará el resumen escrito abajo.
                </span>
              </span>
            </label>
          </div>

          {activity.visible_familiar && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-slate-700">Resumen para familia</label>
                <span className={`text-xs font-semibold tabular-nums ${(activity.resumen_familiar?.length ?? 0) > 180 ? "text-amber-600" : "text-slate-400"}`}>
                  {activity.resumen_familiar?.length ?? 0} / 200
                </span>
              </div>
              <textarea
                value={activity.resumen_familiar ?? ""}
                onChange={(e) => setActivity((prev) => ({ ...prev, resumen_familiar: e.target.value.slice(0, 200) }))}
                disabled={saving}
                rows={2}
                maxLength={200}
                placeholder="Ej: Asistencia en alimentación con supervisión de tolerancia"
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
              />
              {familySummaryMissing && (
                <p className="text-xs text-rose-600">Es obligatorio para publicar la rutina.</p>
              )}
            </div>
          )}
        </Section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !activity.titulo?.trim() || schedules.length === 0 || familySummaryMissing} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar rutina"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ScheduleEditor({ index, schedule, canRemove, saving, onChange, onRemove }) {
  const [advanced, setAdvanced] = useState(Number(schedule.tolerancia_min ?? 60) !== 60);

  const toggleDay = (day) => {
    const set = new Set(schedule.dias_semana ?? []);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    onChange({ dias_semana: Array.from(set).sort((a, b) => a - b) });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Horario {index + 1}</p>
          <p className="mt-0.5 text-xs text-slate-500">{formatCareSchedule(schedule)}</p>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} disabled={saving} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
            Quitar
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700">
          Turno
          <select
            value={schedule.turno}
            onChange={(e) => onChange({ turno: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            {CARE_TURNOS.map((item) => <option key={item} value={item}>{TURN_LABELS[item] ?? item}</option>)}
          </select>
        </label>
        <Field label="Hora" type="time" value={schedule.hora} onChange={(value) => onChange({ hora: value })} disabled={saving} />
        <label className="block text-sm font-medium text-slate-700">
          Repetir
          <select
            value={schedule.frecuencia}
            onChange={(e) => onChange({ frecuencia: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            <option value="diaria">Todos los días</option>
            <option value="semanal">Días específicos</option>
            <option value="mensual">Una vez al mes</option>
            <option value="una_vez">Una sola vez</option>
          </select>
        </label>
      </div>

      {schedule.frecuencia === "semanal" && (
        <div className="mt-3">
          <div className="mb-2 text-sm font-medium text-slate-700">Días de la semana</div>
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

      <div className="mt-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setAdvanced((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          <Chevron open={advanced} />
          Opciones avanzadas
        </button>
        {advanced && (
          <div className="mt-3 max-w-xs">
            <Field
              label="Ventana de tolerancia (min)"
              type="number"
              min="0"
              max="720"
              step="5"
              value={schedule.tolerancia_min}
              onChange={(value) => onChange({ tolerancia_min: Number(value) })}
              disabled={saving}
            />
            <p className="mt-1 text-xs text-slate-400">Minutos antes de marcar la tarea como vencida.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Chevron({ open }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
      className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function Field({ label, value, onChange, disabled, type = "text", min, max, step, placeholder, optional }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {optional && <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, disabled, rows = 3, placeholder, optional }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {optional && <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      />
    </label>
  );
}
