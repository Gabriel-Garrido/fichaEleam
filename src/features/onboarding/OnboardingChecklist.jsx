import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from './OnboardingContext';
import { COLOR_CLASSES } from './onboardingConfig';
import NavIcon from '../../components/NavIcon';
import ConfettiCelebration from './ConfettiCelebration';

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
      <circle cx={center} cy={center} r={r} fill="none" stroke="#e2e8f0" strokeWidth={trackWidth} />
      <circle
        cx={center} cy={center} r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={trackWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
}

// ─── Step row ─────────────────────────────────────────────────────────────────

function StepRow({ step, index, done, isNext, isJustDone, colors, onClick }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={done}
        aria-label={done ? `${step.label} — completado` : `Ir a: ${step.label}`}
        className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3
          transition-all duration-200
          ${done
            ? 'cursor-default opacity-60'
            : isNext
            ? `${colors.bg} border ${colors.border} hover:opacity-90 active:scale-[0.98]`
            : 'hover:bg-slate-50 active:bg-slate-100'
          }`}
      >
        {/* Status indicator */}
        <div className="relative w-8 h-8 shrink-0">
          {done ? (
            <>
              {isJustDone && (
                <span className={`absolute inset-0 rounded-full ${colors.bgStrong} opacity-40 animate-ping`} />
              )}
              <div className={`w-8 h-8 rounded-full ${colors.bgStrong} flex items-center justify-center`}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </>
          ) : (
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold
              ${isNext ? `border-current ${colors.text}` : 'border-slate-200 text-slate-400'}`}>
              {index + 1}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={`text-sm font-semibold leading-snug ${
              done
                ? 'text-slate-400 line-through decoration-1'
                : isNext ? colors.textStrong : 'text-slate-700'
            }`}>
              {step.label}
            </p>
            {isNext && !done && (
              <span className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full ${colors.bgStrong} text-white`}>
                Siguiente
              </span>
            )}
          </div>
          {!done && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[11px] text-slate-400 truncate leading-snug">
                {step.description}
              </p>
              {step.estimatedMinutes && (
                <span className="shrink-0 text-[10px] text-slate-300 font-medium">
                  · {step.estimatedMinutes} min
                </span>
              )}
            </div>
          )}
        </div>

        {/* Chevron */}
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [justCompletedId, setJustCompletedId] = useState(null);
  const [showPulse, setShowPulse] = useState(false);
  const prevIsComplete = useRef(false);
  const prevStepsRef = useRef({});
  const justCompletedTimer = useRef(null);
  const pulseTimer = useRef(null);

  // Keep panel in DOM during close animation (300 ms)
  useEffect(() => {
    if (checklistOpen) {
      setPanelMounted(true);
    } else {
      const t = setTimeout(() => setPanelMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [checklistOpen]);

  // Pulse FAB briefly when onboarding first becomes active
  useEffect(() => {
    if (!isActive || showPulse) return;
    setShowPulse(true);
    pulseTimer.current = setTimeout(() => setShowPulse(false), 5000);
    return () => clearTimeout(pulseTimer.current);
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect newly completed steps to trigger checkmark animation
  useEffect(() => {
    if (!state?.steps) return;
    const newlyDone = Object.entries(state.steps)
      .filter(([id, done]) => done && !prevStepsRef.current[id])
      .map(([id]) => id);
    if (newlyDone.length > 0) {
      clearTimeout(justCompletedTimer.current);
      setJustCompletedId(newlyDone[0]);
      justCompletedTimer.current = setTimeout(() => setJustCompletedId(null), 2200);
    }
    prevStepsRef.current = { ...state.steps };
  }, [state?.steps]);

  // Confetti + auto-open on full completion
  useEffect(() => {
    if (isComplete && !prevIsComplete.current) {
      setChecklistOpen(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4500);
    }
    prevIsComplete.current = isComplete;
  }, [isComplete, setChecklistOpen]);

  // Escape to close
  useEffect(() => {
    if (!checklistOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setChecklistOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [checklistOpen, setChecklistOpen]);

  // Cleanup timers
  useEffect(() => () => {
    clearTimeout(justCompletedTimer.current);
    clearTimeout(pulseTimer.current);
  }, []);

  if (!isActive || !config) return null;

  const colors = COLOR_CLASSES[config.color] ?? COLOR_CLASSES.teal;
  const nextPending = steps.find((s) => !state?.steps[s.id]) ?? null;
  const minutesLeft = steps
    .filter((s) => !state?.steps[s.id])
    .reduce((sum, s) => sum + (s.estimatedMinutes ?? 2), 0);

  function handleStepClick(step) {
    markStepDone(step.id);
    navigate(step.route);
    setChecklistOpen(false);
  }

  return (
    <>
      <ConfettiCelebration active={showConfetti} />

      <div className="fixed bottom-24 right-4 z-40 lg:bottom-8 lg:right-6 flex flex-col items-end">

        {/* ── Expanded panel ─────────────────────────────────────────────── */}
        {panelMounted && (
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Guía de primeros pasos"
            className={`mb-3 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden
              transition-all duration-300 origin-bottom-right
              ${checklistOpen
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
              }`}
          >
            {isComplete ? (
              /* ── Completion celebration ───────────────────────────────── */
              <div className="p-6 text-center">
                <div className="text-5xl mb-3 select-none" aria-hidden="true">🎉</div>
                <h3 className="text-base font-black text-slate-900 mb-1">
                  ¡Todo configurado!
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-5">
                  Completaste los {totalCount} pasos. Tu ELEAM está listo para operar de forma digital.
                </p>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${colors.bg} ${colors.text} text-xs font-bold mb-5`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {totalCount} paso{totalCount !== 1 ? 's' : ''} completado{totalCount !== 1 ? 's' : ''}
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  className={`w-full py-2.5 rounded-xl text-white text-sm font-bold ${colors.btn} transition-all active:scale-[0.98] shadow-sm`}
                >
                  Cerrar guía
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className={`${colors.bg} px-4 pt-3 pb-2`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 shrink-0">
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
                          {doneCount} de {totalCount} listo{doneCount !== 1 ? 's' : ''}
                        </p>
                        {minutesLeft > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            ~{minutesLeft} min restante{minutesLeft !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChecklistOpen(false)}
                      className="w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                      aria-label="Cerrar panel"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Linear progress track */}
                  <div className="h-1.5 rounded-full bg-white/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors.bgStrong} transition-all duration-700 ease-out`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Steps list */}
                <ul className="px-2 py-2 space-y-0.5 max-h-[60vh] overflow-y-auto" role="list">
                  {steps.map((step, index) => {
                    const done = state?.steps[step.id] ?? false;
                    const isNext = step.id === nextPending?.id;
                    return (
                      <StepRow
                        key={step.id}
                        step={step}
                        index={index}
                        done={done}
                        isNext={isNext}
                        isJustDone={step.id === justCompletedId}
                        colors={colors}
                        onClick={() => !done && handleStepClick(step)}
                      />
                    );
                  })}
                </ul>

                {/* Footer */}
                <div className="px-4 pb-3 pt-1.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={dismiss}
                    className="w-full text-xs text-slate-400 hover:text-slate-600 text-center py-1.5 transition-colors rounded-xl hover:bg-slate-50"
                  >
                    Omitir guía de inicio
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Floating trigger ───────────────────────────────────────────── */}
        {isComplete ? (
          <>
            {/* Mobile: checkmark circle */}
            <button
              type="button"
              onClick={() => setChecklistOpen((v) => !v)}
              className="flex sm:hidden w-12 h-12 items-center justify-center rounded-full text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 border border-white/20 transition-all active:scale-[0.97]"
              aria-label="Guía completada — abrir resumen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            {/* Desktop: pill */}
            <button
              type="button"
              onClick={() => setChecklistOpen((v) => !v)}
              className="hidden sm:flex items-center gap-2 rounded-full px-4 py-2.5 text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 border border-white/20 transition-all active:scale-[0.97]"
              aria-label="Guía completada — abrir resumen"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-black">¡Completado!</span>
            </button>
          </>
        ) : (
          <>
            {/* Mobile: progress ring circle */}
            <div className="flex sm:hidden relative">
              {showPulse && doneCount === 0 && (
                <span className={`absolute inset-0 rounded-full ${colors.pill} opacity-40 animate-ping pointer-events-none`} />
              )}
              <button
                type="button"
                onClick={() => setChecklistOpen((v) => !v)}
                className={`relative w-12 h-12 flex items-center justify-center rounded-full text-white shadow-lg shadow-slate-900/20 border border-white/20 transition-all hover:opacity-95 active:scale-[0.97] ${colors.pill}`}
                aria-label={`Guía de inicio — ${progress}% completado`}
              >
                <div className="relative w-9 h-9 shrink-0">
                  <ProgressRing percent={progress} stroke="rgba(255,255,255,0.85)" size={36} trackWidth={2.5} />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black">
                    {doneCount}/{totalCount}
                  </span>
                </div>
              </button>
            </div>

            {/* Desktop: progress pill */}
            <div className="hidden sm:flex relative">
              {showPulse && doneCount === 0 && (
                <span className={`absolute inset-0 rounded-full ${colors.pill} opacity-30 animate-ping pointer-events-none`} />
              )}
              <button
                type="button"
                onClick={() => setChecklistOpen((v) => !v)}
                className={`relative flex items-center gap-2.5 rounded-full pl-2 pr-4 py-2 text-white shadow-lg shadow-slate-900/20 border border-white/20 transition-all hover:opacity-95 active:scale-[0.97] ${colors.pill}`}
                aria-label={`Guía de inicio — ${progress}% completado`}
              >
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
            </div>
          </>
        )}
      </div>
    </>
  );
}
