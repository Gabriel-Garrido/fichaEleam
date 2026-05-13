import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from './OnboardingContext';
import { COLOR_CLASSES } from './onboardingConfig';
import NavIcon from '../../components/NavIcon';

// ─── SVG progress ring ────────────────────────────────────────────────────────

function ProgressRing({ percent, stroke, size = 40, trackWidth = 3 }) {
  const r = (size - trackWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (percent / 100) * circumference;
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90 shrink-0"
      aria-hidden="true"
    >
      <circle
        cx={center} cy={center} r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={trackWidth}
      />
      <circle
        cx={center} cy={center} r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={trackWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingChecklist() {
  const {
    config,
    steps,
    state,
    doneCount,
    totalCount,
    progress,
    isComplete,
    isActive,
    checklistOpen,
    setChecklistOpen,
    markStepDone,
    dismiss,
  } = useOnboarding();

  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [panelMounted, setPanelMounted] = useState(false);
  const prevIsComplete = useRef(false);

  // Keep panel in the DOM during the close animation (200 ms)
  useEffect(() => {
    if (checklistOpen) {
      setPanelMounted(true);
    } else {
      const t = setTimeout(() => setPanelMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [checklistOpen]);

  // Auto-open checklist the first time all steps are completed
  useEffect(() => {
    if (isComplete && !prevIsComplete.current) {
      setChecklistOpen(true);
    }
    prevIsComplete.current = isComplete;
  }, [isComplete, setChecklistOpen]);

  // Close on Escape
  useEffect(() => {
    if (!checklistOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setChecklistOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [checklistOpen, setChecklistOpen]);

  if (!isActive || !config) return null;

  const colors = COLOR_CLASSES[config.color] ?? COLOR_CLASSES.teal;
  // The first pending step in availableSteps order
  const nextPending = steps.find((s) => !state?.steps[s.id]) ?? null;

  function handleStepClick(step) {
    markStepDone(step.id);
    navigate(step.route);
    setChecklistOpen(false);
  }

  return (
    <div
      className="fixed bottom-24 right-4 z-40 lg:bottom-8 lg:right-6 flex flex-col items-end"
      // Keep above mobile bottom-nav (pb-28 on mobile → ~112px)
    >
      {/* ── Expanded panel ─────────────────────────────────────────────── */}
      {panelMounted && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Guía de primeros pasos"
          className={`mb-3 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden
            transition-all duration-200 origin-bottom-right
            ${checklistOpen
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
            }`}
        >
          {/* Header */}
          <div className={`${colors.bg} px-4 py-3 flex items-center justify-between border-b border-slate-100`}>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <ProgressRing percent={progress} stroke={colors.progressColor} />
                <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black ${colors.text}`}>
                  {progress}%
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Primeros pasos
                </p>
                <p className={`text-sm font-black ${colors.text}`}>
                  {isComplete
                    ? '¡Completado! 🎉'
                    : `${doneCount} de ${totalCount} listo${doneCount !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <button
              type="button"

              onClick={() => setChecklistOpen(false)}
              className="w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Cerrar panel"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Steps list */}
          <ul className="p-3 space-y-1" role="list">
            {steps.map((step, index) => {
              const done = state?.steps[step.id] ?? false;
              const isNext = step.id === nextPending?.id;

              return (
                <li key={step.id}>
                  <button
                    type="button"

                    onClick={() => !done && handleStepClick(step)}
                    disabled={done}
                    aria-label={done ? `${step.label} — completado` : `Ir a: ${step.label}`}
                    className={`w-full text-left rounded-xl p-3 flex items-center gap-3 transition-colors ${
                      done
                        ? 'cursor-default'
                        : isNext
                        ? `${colors.bg} border ${colors.border} hover:opacity-90 active:opacity-80`
                        : 'hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    {/* Status indicator */}
                    {done ? (
                      <div className={`w-8 h-8 rounded-full ${colors.bgStrong} flex items-center justify-center shrink-0`}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${
                        isNext
                          ? `border-current ${colors.text}`
                          : 'border-slate-300 text-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                    )}

                    {/* Label + description */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold leading-snug ${
                        done
                          ? 'text-slate-400 line-through decoration-1'
                          : isNext
                          ? colors.textStrong
                          : 'text-slate-700'
                      }`}>
                        {step.label}
                      </p>
                      {!done && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {step.description}
                        </p>
                      )}
                    </div>

                    {/* Chevron for pending steps */}
                    {!done && (
                      <svg
                        className={`w-4 h-4 shrink-0 ${isNext ? colors.text : 'text-slate-300'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          <div className="px-4 pb-4 pt-1 border-t border-slate-100">
            {isComplete ? (
              <p className={`text-xs font-semibold text-center ${colors.text} mb-2`}>
                Ya tienes todo configurado. ¡Buen trabajo!
              </p>
            ) : null}
            <button
              type="button"

              onClick={dismiss}
              className="w-full text-xs text-slate-400 hover:text-slate-600 text-center py-1.5 transition-colors rounded-xl hover:bg-slate-50"
            >
              {isComplete ? 'Cerrar guía' : 'Omitir guía de inicio'}
            </button>
          </div>
        </div>
      )}

      {/* ── Floating trigger ───────────────────────────────────────────── */}
      {isComplete ? (
        <button
          type="button"

          onClick={() => setChecklistOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full px-4 py-2.5 text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 border border-white/20 transition-all active:scale-[0.97]"
          aria-label="Guía completada — abrir resumen"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-black">¡Completado!</span>
        </button>
      ) : (
        <button
          type="button"

          onClick={() => setChecklistOpen((v) => !v)}
          className={`flex items-center gap-2.5 rounded-full pl-2 pr-4 py-2 text-white shadow-lg shadow-slate-900/20 border border-white/20 transition-all hover:opacity-95 active:scale-[0.97] ${colors.pill}`}
          aria-label={`Guía de inicio — ${progress}% completado`}
        >
          {/* Mini progress ring inside button */}
          <div className="relative w-9 h-9 shrink-0">
            <ProgressRing percent={progress} stroke="rgba(255,255,255,0.85)" size={36} trackWidth={2.5} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">
              {doneCount}/{totalCount}
            </span>
          </div>
          <div className="text-left leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              Primeros pasos
            </p>
            <p className="text-xs font-black">{progress}% completado</p>
          </div>
        </button>
      )}
    </div>
  );
}
