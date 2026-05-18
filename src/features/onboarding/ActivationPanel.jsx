import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import NavIcon from "../../components/NavIcon";
import { COLOR_CLASSES } from "./onboardingConfig";
import { useOnboarding } from "./OnboardingContext";
import ActivationComplete from "./ActivationComplete";
import ConfettiCelebration from "./ConfettiCelebration";

function StepStateIcon({ done, colors }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
        done
          ? `${colors.bgStrong} border-transparent text-white`
          : "border-slate-200 bg-white text-slate-500"
      }`}
    >
      {done ? <NavIcon id="tasks" className="h-4 w-4" /> : ""}
    </span>
  );
}

export default function ActivationPanel() {
  const navigate = useNavigate();
  const onboarding = useOnboarding();
  const [celebrate, setCelebrate] = useState(false);
  const wasComplete = useRef(false);
  const complete = onboarding?.isComplete ?? false;

  useEffect(() => {
    if (complete && !wasComplete.current) {
      setCelebrate(true);
      const timerId = window.setTimeout(() => setCelebrate(false), 1800);
      wasComplete.current = true;
      return () => window.clearTimeout(timerId);
    }

    if (!complete) wasComplete.current = false;
    return undefined;
  }, [complete]);

  if (!onboarding?.isActive || onboarding.showIntro || !onboarding.playbook) {
    return null;
  }

  const {
    playbook,
    steps,
    statuses,
    doneCount,
    totalCount,
    progress,
    isComplete,
    firstPendingStep,
    panelOpen,
    setPanelOpen,
    markStepDone,
    dismiss,
    refresh,
  } = onboarding;

  const colors = COLOR_CLASSES[playbook.color] ?? COLOR_CLASSES.teal;
  const currentIndex = firstPendingStep
    ? Math.max(0, steps.findIndex((step) => step.id === firstPendingStep.id))
    : Math.max(0, steps.length - 1);
  const visibleStart = Math.max(0, currentIndex - 1);
  const visibleSteps = steps.slice(visibleStart, visibleStart + 3);

  const goToStep = (step) => {
    if (step.route) navigate(step.route);
    setPanelOpen(false);
  };

  const stepNumber = Math.min(doneCount + 1, totalCount);

  return (
    <>
      <ConfettiCelebration active={celebrate} />

      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className={`fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full border border-white/80 ${colors.bgStrong} px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:brightness-95 lg:bottom-5 lg:right-5`}
        >
          <NavIcon id={playbook.icon} className="h-4 w-4" />
          <span className="hidden sm:inline">Misión</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {doneCount}/{totalCount}
          </span>
        </button>
      )}

      {panelOpen && (
        <aside className="fixed inset-x-3 bottom-24 z-40 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl lg:inset-x-auto lg:bottom-5 lg:right-5 lg:w-[380px]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
                {playbook.activeLabel}
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-950">
                {playbook.mission}
              </h2>
              {!isComplete && (
                <p className="mt-1 text-sm text-slate-500">
                  Paso {stepNumber} de {totalCount}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Cerrar misión"
            >
              x
            </button>
          </div>

          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${colors.bgStrong} transition-all duration-300`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {isComplete ? (
            <ActivationComplete playbook={playbook} onDismiss={dismiss} />
          ) : (
            <div className="space-y-3">
              {visibleSteps.map((step) => {
                const done = statuses[step.id]?.completed;
                return (
                  <div
                    key={step.id}
                    className={`rounded-xl border p-3 ${
                      done ? "border-slate-200 bg-slate-50" : `${colors.border} bg-white`
                    }`}
                  >
                    <div className="flex gap-3">
                      <StepStateIcon done={done} colors={colors} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <NavIcon id={step.icon} className={`h-4 w-4 ${done ? "text-slate-400" : colors.text}`} />
                          <h3 className="text-sm font-semibold text-slate-900">
                            {step.title}
                          </h3>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-slate-600">
                          {step.body}
                        </p>

                        {!done && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              className={`${colors.btn} min-h-9 px-3 py-1.5 text-xs`}
                              onClick={() => goToStep(step)}
                            >
                              {step.cta}
                            </Button>
                            {step.manual && (
                              <Button
                                className="min-h-9 border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                onClick={() => markStepDone(step.id)}
                              >
                                Marcar como hecho
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  className={`text-sm font-semibold ${colors.text} hover:underline`}
                  onClick={refresh}
                >
                  Revisar avance
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-slate-500 hover:text-slate-700"
                  onClick={dismiss}
                >
                  Omitir por ahora
                </button>
              </div>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
