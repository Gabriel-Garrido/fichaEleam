import { tone } from "../constants/uiThemes";

export default function ChipGroup({
  options = [],
  value,
  onChange,
  size = "sm",
  ariaLabel,
  className = "",
  wrap = true,
}) {
  const sizeClasses = size === "lg"
    ? "min-h-10 px-3.5 text-sm"
    : size === "md"
      ? "min-h-9 px-3 text-[13px]"
      : "min-h-8 px-2.5 text-xs";

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`flex ${wrap ? "flex-wrap" : "overflow-x-auto"} gap-1.5 ${className}`}
    >
      {options.map((opt) => {
        const optionValue = typeof opt === "string" ? opt : opt.value;
        const optionLabel = typeof opt === "string" ? opt : opt.label;
        const optionTone = typeof opt === "object" ? opt.tone : null;
        const optionCount = typeof opt === "object" ? opt.count : null;
        const optionTitle = typeof opt === "object" ? opt.title : null;
        const isActive = value === optionValue;
        const t = tone(optionTone || "primary");
        const activeClasses = isActive ? t.chipActive : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50";
        return (
          <button
            type="button"
            key={optionValue}
            role="radio"
            aria-checked={isActive}
            title={optionTitle}
            onClick={() => onChange?.(optionValue)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${sizeClasses} ${activeClasses}`}
          >
            <span>{optionLabel}</span>
            {typeof optionCount === "number" && (
              <span className={`ml-0.5 rounded-full px-1.5 py-px text-[10px] tabular-nums ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                {optionCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
