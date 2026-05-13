import { useEffect, useRef, useState } from 'react';
import { useOnboarding } from './OnboardingContext';
import { COLOR_CLASSES } from './onboardingConfig';
import NavIcon from '../../components/NavIcon';

// Slim contextual hint bar shown at the top of a page when the current route
// matches a pending onboarding step. Auto-resets whenever the step changes.
export default function OnboardingBanner() {
  const {
    isActive,
    isComplete,
    currentRouteStep,
    currentRouteStepIndex,
    config,
    totalCount,
    setChecklistOpen,
  } = useOnboarding();

  const [hidden, setHidden] = useState(false);
  const prevStepId = useRef(null);

  // Unhide banner whenever the active step changes (user navigated to a new step's route)
  useEffect(() => {
    if (currentRouteStep?.id === prevStepId.current) return;
    prevStepId.current = currentRouteStep?.id ?? null;
    setHidden(false);
  }, [currentRouteStep?.id]);

  if (!isActive || isComplete || !currentRouteStep || !config || hidden) return null;

  const colors = COLOR_CLASSES[config.color] ?? COLOR_CLASSES.teal;
  // 1-based display index
  const displayIndex = currentRouteStepIndex >= 0 ? currentRouteStepIndex + 1 : '?';

  return (
    <div
      className={`${colors.bg} border-b ${colors.border} px-4 py-3 flex items-center gap-3`}
      role="status"
      aria-live="polite"
    >
      {/* Step icon */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center ${colors.text}`}
        aria-hidden="true"
      >
        <NavIcon id={currentRouteStep.icon} className="w-4 h-4" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${colors.text} opacity-70`}>
          Paso {displayIndex} de {totalCount}
        </p>
        <p className={`text-sm font-semibold ${colors.textStrong} leading-snug`}>
          {currentRouteStep.tip ?? currentRouteStep.description}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setChecklistOpen(true)}
          className={`hidden sm:inline-flex items-center gap-1 text-xs font-bold ${colors.text} hover:opacity-70 transition-opacity`}
        >
          Ver todos
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setHidden(true)}
          className="w-7 h-7 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="Ocultar sugerencia"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
