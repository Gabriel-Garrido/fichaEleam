import { customerHealth, HEALTH_STYLES } from "../utils/customerHealth";

export default function CustomerHealthBadge({ eleam, tasksOverdue = 0, showReasons = false, size = "sm" }) {
  const health = customerHealth(eleam, { tasksOverdue });
  const s = HEALTH_STYLES[health.state] ?? HEALTH_STYLES.unknown;
  const padding = size === "lg" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <div className="inline-flex flex-col items-start">
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${s.cls} ${padding}`}
        title={health.reasons.join(" · ")}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {health.label}
      </span>
      {showReasons && health.reasons.length > 0 && (
        <ul className="text-[11px] text-slate-500 mt-1 list-disc list-inside max-w-xs">
          {health.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}
