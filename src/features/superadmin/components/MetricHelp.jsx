import React from "react";

export default function MetricHelp({ title, description, source, action }) {
  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        aria-label={`Ayuda: ${title}`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-bold text-slate-500 hover:border-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-7 z-30 w-64 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xl opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:w-72"
      >
        <span className="block text-xs font-semibold text-slate-800">{title}</span>
        {description && (
          <span className="mt-1 block text-xs leading-relaxed text-slate-600">
            {description}
          </span>
        )}
        {source && (
          <span className="mt-2 block text-[11px] leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-600">Fuente:</span> {source}
          </span>
        )}
        {action && (
          <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-600">Uso:</span> {action}
          </span>
        )}
      </span>
    </span>
  );
}
