import { useMemo } from "react";
import Modal from "../../components/Modal";
import { useConfirm } from "../../components/ConfirmDialog";
import useSessionFormDraft from "../../hooks/useSessionFormDraft";
import { CARE_CATEGORIES, CARE_TURNOS } from "./carePlansService";
import {
  INITIAL_CARE_ACTIVITY,
  INITIAL_CARE_SCHEDULE,
  TURN_LABELS,
  buildDailyShiftSchedules,
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
        prioridad: "media",
        activo: true,
      },
      schedules: buildDailyShiftSchedules(source.map((item) => item.turno), source),
    };
  }, [modal]);
  const draftKey = modal
    ? `fichaeleam_careActivity_simple_${modal.activity?.id ?? (carePresetKey(modal.activity) || "new")}`
    : "fichaeleam_careActivity_simple_closed";
  const [draft, setDraft, resetDraft, dirty] = useSessionFormDraft(draftKey, modalSeed);

  if (!modal) return null;

  const activity = draft.activity ?? INITIAL_CARE_ACTIVITY;
  const schedules = draft.schedules ?? [INITIAL_CARE_SCHEDULE];
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
          Promise.resolve(onSubmit({
            activity: { ...activity, prioridad: "media", requiere_observacion: false },
            schedules,
          })).then((ok) => ok && resetDraft());
        }}
      >
        <p className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-900">
          Registra solo lo que el equipo debe hacer todos los días. Las indicaciones especiales van en una frase breve.
        </p>

        <Field label="Cuidado" value={activity.titulo ?? ""} onChange={(titulo) => updateActivity({ titulo })} disabled={saving} placeholder="Ej.: Ayuda en alimentación" />

        <label className="block text-sm font-medium text-slate-700">
          Área
          <select value={activity.categoria} onChange={(event) => updateActivity({ categoria: event.target.value })} disabled={saving} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
            {CARE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Turnos en que se realiza</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {CARE_TURNOS.map((shift) => (
              <label key={shift} className={`rounded-xl border p-3 ${selectedShifts.has(shift) ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"}`}>
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <input type="checkbox" checked={selectedShifts.has(shift)} onChange={() => toggleShift(shift)} disabled={saving || (selectedShifts.size === 1 && selectedShifts.has(shift))} className="h-4 w-4 accent-teal-700" />
                  {TURN_LABELS[shift]}
                </span>
                {selectedShifts.has(shift) && (
                  <input aria-label={`Hora ${TURN_LABELS[shift]}`} type="time" value={schedules.find((item) => item.turno === shift)?.hora ?? DEFAULT_TIME_BY_SHIFT[shift]} onChange={(event) => updateTime(shift, event.target.value)} disabled={saving} className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                )}
              </label>
            ))}
          </div>
        </fieldset>

        <TextArea label="Indicación especial" value={activity.instrucciones ?? ""} onChange={(instrucciones) => updateActivity({ instrucciones })} disabled={saving} placeholder="Opcional. Ej.: textura papilla; avisar si rechaza." />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
          <button type="submit" disabled={saving || !activity.titulo?.trim() || schedules.length === 0 || schedules.some((item) => !item.hora)} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
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
