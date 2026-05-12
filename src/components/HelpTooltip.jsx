import Tooltip from "./Tooltip";

export default function HelpTooltip({ label = "Ayuda", children, className = "" }) {
  return (
    <Tooltip
      content={
        <p className="whitespace-pre-line text-[11.5px] leading-relaxed text-white/90">
          {children}
        </p>
      }
      variant="dark"
      maxWidth={280}
      wrapperClass={`align-middle ${className}`}
    >
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-400 transition-colors hover:border-teal-500 hover:text-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
      >
        ?
      </button>
    </Tooltip>
  );
}
