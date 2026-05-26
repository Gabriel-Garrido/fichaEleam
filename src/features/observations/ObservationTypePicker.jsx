import { OBSERVATION_TYPE_GROUPS, OBSERVATION_TYPES } from "./observationFormSchema";

const TYPE_LABEL = Object.fromEntries(OBSERVATION_TYPES);

export default function ObservationTypePicker({ value, onChange, error, disabled, id = "tipo" }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1">
        <span className="text-sm font-semibold text-slate-700">Tipo de observación</span>
        <span className="text-xs text-rose-500">*</span>
      </label>
      <div
        id={id}
        role="radiogroup"
        aria-label="Tipo de observación"
        aria-describedby={error ? `${id}-err` : undefined}
        className="space-y-3"
      >
        {OBSERVATION_TYPE_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {group.types.map((typeValue) => {
                const isActive = value === typeValue;
                return (
                  <button
                    key={typeValue}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    disabled={disabled}
                    onClick={() => onChange?.({ target: { name: "tipo", value: typeValue } })}
                    className={`tap-highlight-none min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      isActive
                        ? "border-teal-600 bg-teal-50 text-teal-800 ring-1 ring-teal-200"
                        : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/40"
                    }`}
                  >
                    <span className="block truncate">{TYPE_LABEL[typeValue]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1.5 flex items-start gap-1 text-xs leading-tight text-rose-600">
          <span className="mt-px inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">!</span>
          {error}
        </p>
      )}
    </div>
  );
}
