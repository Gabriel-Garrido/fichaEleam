import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function readStored(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return stored === "1";
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
}

export default function CollapsibleGuide({
  storageKey,
  title,
  steps = [],
  defaultCollapsed = true,
  layout = "grid",
}) {
  const { profile } = useAuth();
  const key = storageKey ? `fichaeleam_guide_${storageKey}_${profile?.id ?? "anon"}` : null;
  const [collapsed, setCollapsed] = useState(() =>
    key ? readStored(key, defaultCollapsed) : defaultCollapsed
  );

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (key) writeStored(key, next);
      return next;
    });
  };

  const cols = layout === "stack" ? "lg:grid-cols-1" : "md:grid-cols-2 lg:grid-cols-4";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={!collapsed}
      >
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
      {!collapsed && (
        <ol className={`mt-3 grid gap-3 ${cols}`}>
          {steps.map((step, index) => (
            <li key={step.title} className={`flex gap-3 rounded-xl border p-3 ${step.tone ?? "border-slate-100 bg-slate-50"}`}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700 ring-1 ring-teal-100">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">{step.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-600">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
