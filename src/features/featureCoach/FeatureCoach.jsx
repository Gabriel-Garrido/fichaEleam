import { useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import NavIcon from "../../components/NavIcon";
import CoachBulbIcon from "./CoachBulbIcon";
import { getCoach } from "./coachCatalog";
import useFeatureCoach from "./useFeatureCoach";

// Columnas estáticas para que Tailwind incluya las clases en el bundle.
function stepsGridClass(count) {
  if (count === 2) return "sm:grid-cols-2";
  if (count === 3) return "sm:grid-cols-3";
  if (count >= 4) return "sm:grid-cols-2";
  return "";
}

export default function FeatureCoach({ featureId, controller, standalone = false }) {
  const auth = useAuth();
  const fallback = useFeatureCoach(featureId);
  const state = controller ?? fallback;
  const { isOpen, dismiss, open, enabled } = state;
  const panelRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const panel = panelRef.current;
    const node = ctaRef.current;
    window.requestAnimationFrame(() => {
      panel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      node?.focus({ preventScroll: true });
    });
    const handleKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, dismiss]);

  if (!enabled) return null;

  if (!isOpen) {
    if (!standalone) return null;
    return (
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={open}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          aria-label="Abrir ayuda de esta pantalla"
        >
          <CoachBulbIcon className="h-3.5 w-3.5" />
          Ayuda de esta pantalla
        </button>
      </div>
    );
  }

  const coach = getCoach(featureId, auth?.rol);
  if (!coach) return null;

  const titleId = `feature-coach-${featureId}-title`;
  const steps = Array.isArray(coach.steps) ? coach.steps : [];
  return (
    <section
      ref={panelRef}
      role="region"
      aria-labelledby={titleId}
      className="relative mb-5 overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-lg ring-1 ring-teal-100/60 animate-slide-in"
    >
      <header className="flex items-start gap-3 bg-gradient-to-br from-teal-700 to-teal-600 px-4 py-3.5 text-white sm:px-5 sm:py-4">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
          {coach.icon ? <NavIcon id={coach.icon} className="h-5 w-5" /> : <CoachBulbIcon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-100">
            Ayuda contextual{coach.eyebrow ? ` · ${coach.eyebrow}` : ""}
          </p>
          <h2 id={titleId} className="mt-0.5 text-lg font-semibold leading-tight sm:text-xl">
            {coach.title}
          </h2>
          {coach.description && (
            <p className="mt-1 hidden text-sm leading-snug text-teal-50/90 sm:block">{coach.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar ayuda"
          className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/80 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18 18 6" />
          </svg>
        </button>
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        {coach.description && (
          <p className="text-sm leading-relaxed text-slate-600 sm:hidden">{coach.description}</p>
        )}

        {steps.length > 0 && (
          <ol className={`grid gap-2.5 ${stepsGridClass(steps.length)}`}>
            {steps.map((step, index) => (
              <li
                key={`${featureId}-step-${index}`}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:flex-col sm:gap-2.5 sm:p-4"
              >
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-700 text-xs font-bold text-white shadow-sm tabular-nums"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-slate-900">{step.title}</p>
                  {step.text && (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{step.text}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {coach.benefit && (
          <div className="flex items-start gap-2.5 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 px-3.5 py-3 ring-1 ring-teal-100">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-sm leading-relaxed text-teal-900">
              <span className="font-semibold">Resultado: </span>
              {coach.benefit}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            ref={ctaRef}
            type="button"
            onClick={dismiss}
            className="inline-flex w-full min-h-11 items-center justify-center rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 sm:w-auto sm:min-h-10"
          >
            Entendido
          </button>
        </div>
      </div>
    </section>
  );
}
