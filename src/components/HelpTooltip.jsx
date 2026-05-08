import React from "react";

function HelpTooltip({ label = "Ayuda", children, className = "" }) {
  return (
    <span className={`relative inline-flex align-middle group ${className}`}>
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-bold text-slate-500 shadow-sm transition-colors hover:border-teal-400 hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-7 z-40 hidden w-64 max-w-[calc(100vw-2rem)] rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-normal leading-relaxed text-white shadow-lg group-hover:block group-focus-within:block"
      >
        {children}
      </span>
    </span>
  );
}

export default HelpTooltip;
