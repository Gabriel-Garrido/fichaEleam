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
    doneCount,
    isMobile,
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
  const displayIndex = currentRouteStepIndex >= 0 ? currentRouteStepIndex + 1 : '?';
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const tipText = isMobile
    ? (currentRouteStep.mobileTip ?? currentRouteStep.desktopTip ?? currentRouteStep.description)
    : (currentRouteStep.desktopTip ?? currentRouteStep.description);

  return (
    <div role="status" aria-live="polite" className="flex flex-col">
      {/* Main row */}
      <div className={`${colors.bg} border-b ${colors.border} px-4 py-2.5 flex items-center gap-3`}>

        {/* Step badge: colored pill with icon + step number */}
        <div className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${colors.bgStrong} text-white`}>
          <NavIcon id={currentRouteStep.icon} className="w-3 h-3" aria-hidden="true" />
          <span className="text-[10px] font-black tabular-nums leading-none">
            {displayIndex}/{totalCount}
          </span>
        </div>

        {/* Tip text */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${colors.textStrong} leading-snug line-clamp-1`}>
            {tipText}
          </p>
          {currentRouteStep.estimatedMinutes && (
            <p className={`text-[10px] ${colors.text} opacity-60 hidden sm:block mt-0.5`}>
              ~{currentRouteStep.estimatedMinutes} min · Paso {displayIndex} de {totalCount}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setChecklistOpen(true)}
            className={`inline-flex items-center gap-1 text-xs font-bold ${colors.text} hover:opacity-70 transition-opacity px-2 py-1 rounded-lg hover:bg-white/40`}
            aria-label="Ver todos los pasos de la guía"
          >
            <span className="hidden sm:inline">Ver guía</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
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

      {/* Progress strip at the bottom edge of the banner */}
      <div className="h-0.5 bg-black/5">
        <div
          className={`h-full ${colors.bgStrong} transition-all duration-700 ease-out`}
          style={{ width: `${progressPercent}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
