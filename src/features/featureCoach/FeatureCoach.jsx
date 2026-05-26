import { useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import NavIcon from "../../components/NavIcon";
import { getCoach } from "./coachCatalog";
import useFeatureCoach from "./useFeatureCoach";

export default function FeatureCoach({ featureId, controller, standalone = false }) {
  const auth = useAuth();
  const fallback = useFeatureCoach(featureId);
  const state = controller ?? fallback;
  const { isOpen, dismiss, open, hasSeen, enabled } = state;
  const panelRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const node = ctaRef.current;
    if (node) {
      window.requestAnimationFrame(() => node.focus({ preventScroll: true }));
    }
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
    if (!standalone || !hasSeen) return null;
    return (
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={open}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          aria-label="Ver guía rápida"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.354a15.998 15.998 0 01-3 0M9.75 21.75H14.25M15.75 8.25a3.75 3.75 0 10-7.5 0c0 1.31.67 2.46 1.68 3.13.3.2.485.535.485.9V12.75a.75.75 0 00.75.75h2.25a.75.75 0 00.75-.75v-.47c0-.365.184-.7.485-.9A3.75 3.75 0 0015.75 8.25z" />
          </svg>
          Ver guía rápida
        </button>
      </div>
    );
  }

  const coach = getCoach(featureId, auth?.rol);
  if (!coach) return null;

  const titleId = `feature-coach-${featureId}-title`;

  return (
    <section
      ref={panelRef}
      role="region"
      aria-labelledby={titleId}
      className="relative mb-5 overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-lg ring-1 ring-teal-100/60 animate-slide-in"
    >
      <header className="flex items-start gap-3 bg-gradient-to-br from-teal-700 to-teal-600 px-4 py-3.5 text-white sm:px-5 sm:py-4">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
          {coach.icon ? <NavIcon id={coach.icon} className="h-5 w-5" /> : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.354a15.998 15.998 0 01-3 0M9.75 21.75H14.25M15.75 8.25a3.75 3.75 0 10-7.5 0c0 1.31.67 2.46 1.68 3.13.3.2.485.535.485.9V12.75a.75.75 0 00.75.75h2.25a.75.75 0 00.75-.75v-.47c0-.365.184-.7.485-.9A3.75 3.75 0 0015.75 8.25z" />
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          {coach.eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-100">
              Guía rápida · {coach.eyebrow}
            </p>
          )}
          <h2 id={titleId} className="mt-0.5 text-lg font-semibold leading-tight sm:text-xl">
            {coach.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar guía"
          className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/80 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18 18 6" />
          </svg>
        </button>
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        {coach.description && (
          <p className="text-sm leading-relaxed text-slate-700">{coach.description}</p>
        )}

        {Array.isArray(coach.steps) && coach.steps.length > 0 && (
          <ol className="space-y-2.5">
            {coach.steps.map((step, index) => (
              <li key={`${featureId}-step-${index}`} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-700 text-xs font-bold text-white tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  {step.text && (
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600 sm:text-sm">{step.text}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {coach.benefit && (
          <div className="rounded-xl bg-teal-50 px-4 py-3 ring-1 ring-teal-100">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              Beneficio para tu equipo
            </p>
            <p className="mt-1 text-sm leading-relaxed text-teal-900">{coach.benefit}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-500">
            Puedes volver a abrir esta guía con el botón <span className="font-semibold text-slate-700">Guía</span> del encabezado.
          </p>
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
