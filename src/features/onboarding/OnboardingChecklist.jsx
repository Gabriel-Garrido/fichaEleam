import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from './OnboardingContext';
import { COLOR_CLASSES } from './onboardingConfig';
import NavIcon from '../../components/NavIcon';

// SVG ring progress indicator
function ProgressRing({ percent, stroke, size = 44, trackWidth = 3.5 }) {
  const r = (size - trackWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0">
      <circle cx={center} cy={center} r={r} fill="none" stroke="#e2e8f0" strokeWidth={trackWidth} />
      <circle
        cx={center} cy={center} r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={trackWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.7s ease' }}
      />
    </svg>
  );
}


export default function OnboardingChecklist() {
  const { config, steps, state, doneCount, totalCount, progress, isComplete, isActive, checklistOpen, setChecklistOpen, markStepDone, dismiss } = useOnboarding();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [panelMounted, setPanelMounted] = useState(false);
  const prevComplete = useRef(false);

  // Animate panel open/close
  useEffect(() => {
    if (checklistOpen) {
      setPanelMounted(true);
    } else {
      const t = setTimeout(() => setPanelMounted(false), 250);
      return () => clearTimeout(t);
    }
  }, [checklistOpen]);

  // Open checklist panel automatically when all steps are done for the first time
  useEffect(() => {
    if (isComplete && !prevComplete.current) {
      setChecklistOpen(true);
      prevComplete.current = true;
    }
    if (!isComplete) prevComplete.current = false;
  }, [isComplete, setChecklistOpen]);

  // Close panel on Escape
  useEffect(() => {
    if (!checklistOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setChecklistOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checklistOpen, setChecklistOpen]);

  if (!isActive || !config) return null;

  const colors = COLOR_CLASSES[config.color] ?? COLOR_CLASSES.teal;

  function handleStepClick(step) {
    markStepDone(step.id);
    navigate(step.route);
    setChecklistOpen(false);
  }

  const pendingSteps = steps.filter((s) => !state?.steps[s.id]);
  const nextStep = pendingSteps[0] ?? null;

  return (
    <div className="fixed bottom-24 right-4 z-40 lg:bottom-8 lg:right-6 flex flex-col items-end">
      {/* Expanded checklist panel */}
      {panelMounted && (
        <div
          ref={panelRef}
          className={`mb-3 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transition-all duration-200 origin-bottom-right ${
            checklistOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          }`}
        >
          {/* Panel header */}
          <div className={`${colors.bg} px-4 py-3 flex items-center justify-between border-b border-slate-100`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <ProgressRing percent={progress} stroke={colors.progressColor} size={40} trackWidth={3} />
                <span className={`absolute inset-0 flex items-center justify-center text-[11px] font-black ${colors.text}`}>
                  {progress}%
                </span>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Primeros pasos
                </div>
                <div className={`text-sm font-black ${colors.text}`}>
                  {isComplete ? '¡Completado! 🎉' : `${doneCount} de ${totalCount} listo${doneCount !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
            <button
              onClick={() => setChecklistOpen(false)}
              className="w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Steps list */}
          <div className="p-3 space-y-1">
            {steps.map((step, i) => {
              const done = state?.steps[step.id] ?? false;
              const isNext = step.id === nextStep?.id;
              return (
                <button
                  key={step.id}
                  onClick={() => !done && handleStepClick(step)}
                  disabled={done}
                  className={`w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all ${
                    done
                      ? 'cursor-default'
                      : isNext
                      ? `${colors.bg} border ${colors.border} hover:opacity-90`
                      : 'hover:bg-slate-50 active:bg-slate-100'
                  }`}
                >
                  {/* Step number / check */}
                  {done ? (
                    <div className={`w-8 h-8 rounded-full ${colors.bgStrong} flex items-center justify-center shrink-0 shadow-sm`}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className={`w-8 h-8 rounded-full border-2 ${isNext ? `border-current ${colors.text}` : 'border-slate-300 text-slate-400'} flex items-center justify-center shrink-0 font-bold text-xs`}>
                      {i + 1}
                    </div>
                  )}

                  {/* Label + description */}
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold leading-snug ${done ? 'text-slate-400 line-through decoration-1' : isNext ? colors.textStrong : 'text-slate-700'}`}>
                      {step.label}
                    </div>
                    {!done && (
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {step.description}
                      </div>
                    )}
                  </div>

                  {/* Arrow for pending steps */}
                  {!done && (
                    <svg className={`w-4 h-4 shrink-0 ${isNext ? colors.text : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {!isComplete && (
            <div className={`px-4 pb-4 pt-1 border-t border-slate-100`}>
              <button
                onClick={dismiss}
                className="w-full text-xs text-slate-400 hover:text-slate-600 text-center py-1.5 transition-colors rounded-lg hover:bg-slate-50"
              >
                Omitir guía de inicio
              </button>
            </div>
          )}

          {isComplete && (
            <div className={`px-4 pb-5 pt-2 text-center`}>
              <p className={`text-xs font-semibold ${colors.text}`}>
                Ya tienes todo configurado. ¡Buen trabajo!
              </p>
              <button
                onClick={dismiss}
                className="mt-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Cerrar guía
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating trigger button */}
      {!isComplete ? (
        <button
          onClick={() => setChecklistOpen((v) => !v)}
          className={`flex items-center gap-2.5 rounded-full pl-2 pr-4 py-2 text-white shadow-xl shadow-slate-900/20 border border-white/20 transition-all hover:opacity-95 active:scale-[0.97] ${colors.pill}`}
          aria-label="Primeros pasos"
        >
          <div className="relative w-9 h-9 shrink-0">
            <ProgressRing percent={progress} stroke="rgba(255,255,255,0.9)" size={36} trackWidth={2.5} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">
              {doneCount}/{totalCount}
            </span>
          </div>
          <div className="text-left leading-tight">
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              Primeros pasos
            </div>
            <div className="text-xs font-black">{progress}% completado</div>
          </div>
        </button>
      ) : (
        /* Completion state — show briefly, then hide */
        <button
          onClick={() => setChecklistOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full px-4 py-2.5 text-white shadow-xl bg-emerald-600 border border-white/20 transition-all hover:bg-emerald-700 active:scale-[0.97]"
          aria-label="Guía completada"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-black">¡Completado!</span>
        </button>
      )}
    </div>
  );
}
