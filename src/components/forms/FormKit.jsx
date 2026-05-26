import Button from "../Button";
import { FeatureCoach } from "../../features/featureCoach";

export function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1 text-xs leading-tight text-rose-600">
      <span className="mt-px inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">
        !
      </span>
      {message}
    </p>
  );
}

export function ErrorSummary({ errors = {}, title = "Revisa los campos marcados" }) {
  // `_form` y `__general` son claves reservadas para errores que no
  // pertenecen a un campo específico (ej: rechazo de la BD que no se pudo
  // mapear a una columna). Se renderizan arriba con énfasis.
  const generalMessage = errors._form || errors.__general;
  const fieldEntries = Object.entries(errors).filter(
    ([key, message]) => key !== "_form" && key !== "__general" && Boolean(message),
  );
  if (!generalMessage && fieldEntries.length === 0) return null;
  return (
    <div
      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
      role="alert"
      aria-live="polite"
    >
      {generalMessage && (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-200 text-xs font-bold text-rose-800">
            !
          </span>
          <p className="font-semibold leading-snug">{generalMessage}</p>
        </div>
      )}
      {fieldEntries.length > 0 && (
        <>
          <p className={generalMessage ? "mt-2 text-xs font-semibold uppercase tracking-wide text-rose-700/80" : "font-semibold"}>
            {generalMessage ? "Campos a revisar" : title}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {fieldEntries.slice(0, 5).map(([field, message]) => (
              <li key={`${field}-${message}`}>
                <a
                  href={`#${String(field).replace(/\./g, "_")}`}
                  className="rounded underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function FormPage({ children, className = "", size = "lg", coachFeatureId }) {
  const sizes = {
    md: "max-w-2xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };
  return (
    <div className={`${sizes[size] ?? sizes.lg} mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 ${className}`}>
      {coachFeatureId && <FeatureCoach featureId={coachFeatureId} standalone />}
      {children}
    </div>
  );
}

export function FormHeader({ eyebrow, title, description, onBack, backLabel = "Volver", actions }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="tap-highlight-none mt-0.5 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          <span aria-hidden="true">←</span>
          <span className="hidden sm:inline">{backLabel}</span>
        </button>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-700">{eyebrow}</p>}
        <h1 className="text-xl font-semibold leading-tight text-slate-950 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function FormSection({ title, description, icon, children, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          {icon && <span className="mt-0.5 text-teal-700">{icon}</span>}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function FormGrid({ children, columns = 2, className = "" }) {
  const gridCols = columns === 3 ? "md:grid-cols-3" : "sm:grid-cols-2";
  return <div className={`grid grid-cols-1 gap-4 ${gridCols} ${className}`}>{children}</div>;
}

export function FieldGroup({ children, tone = "slate", className = "" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50",
    amber: "border-amber-200 bg-amber-50",
    teal: "border-teal-100 bg-teal-50",
    rose: "border-rose-200 bg-rose-50",
  };
  return <div className={`rounded-2xl border p-4 ${tones[tone] ?? tones.slate} ${className}`}>{children}</div>;
}

export function Notice({ title, children, tone = "slate", action }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    teal: "border-teal-100 bg-teal-50 text-teal-900",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone] ?? tones.slate}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1 text-xs leading-5 opacity-90" : "text-xs leading-5"}>{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function fieldClasses(error) {
  return [
    "w-full min-h-11 sm:min-h-10 rounded-xl border px-3 py-2.5 sm:py-2 text-base sm:text-sm text-slate-900",
    "transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
    error
      ? "border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
      : "border-slate-300 bg-white hover:border-slate-400 focus:border-teal-500 focus:ring-teal-100",
  ].join(" ");
}

function Label({ htmlFor, label, required }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-1">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {required && <span className="text-xs text-rose-500">*</span>}
    </label>
  );
}

function describedBy(fieldId, error, hint) {
  return [error ? `${fieldId}-err` : null, hint ? `${fieldId}-hint` : null].filter(Boolean).join(" ") || undefined;
}

export function TextField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  error,
  hint,
  required = false,
  maxLength,
  inputMode,
  autoComplete,
  disabled = false,
  min,
  max,
  step,
  className = "",
}) {
  const fieldId = id ?? name;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-err`;
  return (
    <div className={className}>
      <Label htmlFor={fieldId} label={label} required={required} />
      <input
        id={fieldId}
        name={name}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={fieldClasses(error)}
      />
      {hint && !error && <p id={hintId} className="mt-1.5 text-xs leading-tight text-slate-500">{hint}</p>}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function TextareaField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  required = false,
  maxLength,
  rows = 3,
  disabled = false,
  className = "",
}) {
  const fieldId = id ?? name;
  const currentLength = value?.length ?? 0;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <Label htmlFor={fieldId} label={label} required={required} />
        {maxLength && (
          <span className={`text-[11px] tabular-nums ${currentLength > maxLength * 0.85 ? "text-amber-600" : "text-slate-400"}`}>
            {currentLength}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        id={fieldId}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={`${fieldClasses(error)} resize-y`}
      />
      {hint && !error && <p id={`${fieldId}-hint`} className="mt-1.5 text-xs leading-tight text-slate-500">{hint}</p>}
      <FieldError id={`${fieldId}-err`} message={error} />
    </div>
  );
}

export function SelectField({
  id,
  name,
  label,
  value,
  onChange,
  options,
  error,
  hint,
  required = false,
  disabled = false,
  placeholder = "Seleccionar...",
  className = "",
}) {
  const fieldId = id ?? name;
  return (
    <div className={className}>
      <Label htmlFor={fieldId} label={label} required={required} />
      <select
        id={fieldId}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={`${fieldClasses(error)} appearance-none`}
      >
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>{labelText}</option>
        ))}
      </select>
      {hint && !error && <p id={`${fieldId}-hint`} className="mt-1.5 text-xs leading-tight text-slate-500">{hint}</p>}
      <FieldError id={`${fieldId}-err`} message={error} />
    </div>
  );
}

export function CheckboxField({
  id,
  name,
  label,
  description,
  checked,
  onChange,
  error,
  disabled = false,
  className = "",
}) {
  const fieldId = id ?? name;
  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
          error ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50 hover:border-teal-200"
        } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <input
          id={fieldId}
          name={name}
          type="checkbox"
          checked={Boolean(checked)}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={describedBy(fieldId, error, description)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-teal-700 focus:ring-2 focus:ring-teal-200"
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-800">{label}</span>
          {description && <span id={`${fieldId}-hint`} className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>}
        </span>
      </label>
      <FieldError id={`${fieldId}-err`} message={error} />
    </div>
  );
}

export function ToggleField({
  id,
  name,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  error,
  className = "",
}) {
  const fieldId = id ?? name;
  return (
    <div className={className}>
      <button
        type="button"
        role="switch"
        id={fieldId}
        name={name}
        aria-checked={Boolean(checked)}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy(fieldId, error, description)}
        disabled={disabled}
        onClick={() => onChange?.({ target: { name, type: "checkbox", checked: !checked } })}
        className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-70 ${
          error ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50 hover:border-teal-200"
        }`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-800">{label}</span>
          {description && <span id={`${fieldId}-hint`} className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>}
        </span>
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
            checked ? "bg-teal-700" : "bg-slate-300"
          }`}
          aria-hidden="true"
        >
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
        </span>
      </button>
      <FieldError id={`${fieldId}-err`} message={error} />
    </div>
  );
}

export function SubmitBar({
  cancelLabel = "Cancelar",
  submitLabel,
  busyLabel = "Guardando...",
  busy = false,
  disabled = false,
  onCancel,
  helperText,
  destructive = false,
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-slate-100 bg-slate-50/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:py-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {helperText && <p className="text-xs leading-5 text-slate-500 sm:mr-auto">{helperText}</p>}
        {onCancel && (
          <Button type="button" disabled={busy} onClick={onCancel}
            className="w-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto">
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" disabled={busy || disabled}
          className={`w-full text-white sm:w-auto ${destructive ? "bg-rose-700 hover:bg-rose-800" : "bg-teal-700 hover:bg-teal-800"}`}>
          {busy ? busyLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
