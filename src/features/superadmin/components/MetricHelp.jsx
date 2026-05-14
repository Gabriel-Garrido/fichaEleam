import Tooltip from "../../../components/Tooltip";

export default function MetricHelp({ title, description, source, action }) {
  return (
    <Tooltip
      content={
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold leading-tight text-slate-900">{title}</p>
          {description && (
            <p className="text-[11.5px] leading-relaxed text-slate-600 whitespace-pre-line">
              {description}
            </p>
          )}
          {source && (
            <p className="text-[11px] leading-relaxed text-slate-500 whitespace-pre-line">
              <span className="font-semibold text-slate-700">Fuente:</span> {source}
            </p>
          )}
          {action && (
            <p className="text-[11px] leading-relaxed text-slate-500 whitespace-pre-line">
              <span className="font-semibold text-slate-700">Uso:</span> {action}
            </p>
          )}
        </div>
      }
      variant="light"
      maxWidth={304}
    >
      <button
        type="button"
        aria-label={`Ayuda: ${title}`}
        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
      >
        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </button>
    </Tooltip>
  );
}
