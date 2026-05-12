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
        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
      >
        ?
      </button>
    </Tooltip>
  );
}
