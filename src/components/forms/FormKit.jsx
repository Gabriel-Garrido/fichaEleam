import Button from "../Button";

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
  const messages = Object.values(errors).filter(Boolean);
  if (messages.length === 0) return null;
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
      <p className="font-semibold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {messages.slice(0, 4).map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
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
}) {
  const fieldId = id ?? name;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-err` : undefined;
  return (
    <div>
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
        aria-invalid={error ? "true" : "false"}
        aria-describedby={errorId || hintId}
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
}) {
  const fieldId = id ?? name;
  const currentLength = value?.length ?? 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <Label htmlFor={fieldId} label={label} required={required} />
        {maxLength && currentLength > 0 && (
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
        aria-describedby={error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined}
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
}) {
  const fieldId = id ?? name;
  return (
    <div>
      <Label htmlFor={fieldId} label={label} required={required} />
      <select
        id={fieldId}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined}
        className={`${fieldClasses(error)} appearance-none`}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>{labelText}</option>
        ))}
      </select>
      {hint && !error && <p id={`${fieldId}-hint`} className="mt-1.5 text-xs leading-tight text-slate-500">{hint}</p>}
      <FieldError id={`${fieldId}-err`} message={error} />
    </div>
  );
}

export function SubmitBar({ cancelLabel = "Cancelar", submitLabel, busyLabel = "Guardando...", busy = false, disabled = false, onCancel }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-slate-100 bg-slate-50/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:py-0">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" disabled={busy} onClick={onCancel}
            className="w-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto">
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" disabled={busy || disabled}
          className="w-full bg-teal-700 text-white hover:bg-teal-800 sm:w-auto">
          {busy ? busyLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
