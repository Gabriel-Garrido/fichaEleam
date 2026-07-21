import Button from "./Button";

export default function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "slate",
  className = "",
  compact = false,
}) {
  const toneClasses = {
    slate: "border-slate-200 bg-slate-50/50 text-slate-700",
    teal: "border-teal-100 bg-teal-50/50 text-teal-800",
    amber: "border-amber-100 bg-amber-50/50 text-amber-900",
    emerald: "border-emerald-100 bg-emerald-50/50 text-emerald-800",
    rose: "border-rose-100 bg-rose-50/50 text-rose-800",
  }[tone] ?? "border-slate-200 bg-slate-50/50 text-slate-700";

  const iconWrapClasses = {
    slate: "bg-slate-100 text-slate-500",
    teal: "bg-teal-100 text-teal-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
  }[tone] ?? "bg-slate-100 text-slate-500";

  return (
    <div
      className={`ui-empty-state flex flex-col items-center rounded-2xl border border-dashed text-center ${toneClasses} ${compact ? "px-4 py-6" : "px-6 py-10"} ${className}`}
      role="status"
    >
      {icon && (
        <span className={`ui-empty-state-icon mb-3 grid h-12 w-12 place-items-center rounded-2xl ${iconWrapClasses}`} aria-hidden="true">
          {icon}
        </span>
      )}
      {title && <p className="text-sm font-semibold text-slate-900">{title}</p>}
      {description && <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-600 sm:text-sm">{description}</p>}
      {action && (
        <div className="mt-4">
          {typeof action === "object" && action.label ? (
            <Button
              type="button"
              onClick={action.onClick}
              className="bg-teal-700 text-white hover:bg-teal-800"
            >
              {action.label}
            </Button>
          ) : (
            action
          )}
        </div>
      )}
    </div>
  );
}
