import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import NavIcon from "../../components/NavIcon";
import { useAuth } from "../../context/AuthContext";
import { COLOR_CLASSES } from "./onboardingConfig";
import { useOnboarding } from "./OnboardingContext";

function firstName(name) {
  return String(name ?? "").trim().split(/\s+/)[0] || "";
}

function GuideStep({ step, index, status, active, colors, onGo, onDone }) {
  const completed = status?.completed === true;
  return (
    <li
      className={`rounded-xl border px-3 py-3 transition-colors ${
        active
          ? `${colors.border} bg-white shadow-sm`
          : completed
            ? "border-slate-200 bg-slate-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex gap-3">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
            completed
              ? `${colors.bgStrong} border-transparent text-white`
              : active
                ? `${colors.bg} ${colors.text} ${colors.border}`
                : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          {completed ? <NavIcon id="tasks" className="h-4 w-4" /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <NavIcon
              id={step.icon}
              className={`h-4 w-4 ${completed ? "text-slate-400" : colors.text}`}
            />
            <h3 className="text-sm font-semibold text-slate-950">{step.title}</h3>
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-600">{step.body}</p>
          {active && step.help && (
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
              {step.help}
            </p>
          )}

          {!completed && active && (
            <div className="mt-3 grid gap-2 sm:flex">
              <Button
                className={`${colors.btn} min-h-10 px-3 py-2 text-sm`}
                onClick={() => onGo(step)}
              >
                {step.cta}
              </Button>
              {step.manual && (
                <Button
                  className="min-h-10 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => onDone(step.id)}
                >
                  Marcar hecho
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export default function ActivationGuide() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const onboarding = useOnboarding();

  const {
    isActive,
    showIntro,
    playbook,
    steps = [],
    statuses = {},
    doneCount = 0,
    totalCount = 0,
    progress = 0,
    firstPendingStep,
    panelOpen,
    setPanelOpen,
    markIntroSeen,
    markStepDone,
    dismiss,
    refresh,
    isComplete,
  } = onboarding ?? {};

  useEffect(() => {
    if (showIntro && playbook) setPanelOpen?.(true);
  }, [playbook, setPanelOpen, showIntro]);

  const colors = COLOR_CLASSES[playbook?.color] ?? COLOR_CLASSES.teal;
  const activeStep = firstPendingStep ?? steps[steps.length - 1] ?? null;
  const name = firstName(profile?.nombre);

  const sortedSteps = useMemo(() => {
    if (!activeStep) return steps;
    return [...steps].sort((a, b) => {
      if (a.id === activeStep.id) return -1;
      if (b.id === activeStep.id) return 1;
      return steps.findIndex((step) => step.id === a.id) - steps.findIndex((step) => step.id === b.id);
    });
  }, [activeStep, steps]);

  if (!isActive || !playbook || totalCount === 0) return null;

  const openGuide = () => {
    markIntroSeen?.();
    setPanelOpen?.(true);
  };

  const goToStep = (step) => {
    markIntroSeen?.();
    if (step?.route) navigate(step.route);
    setPanelOpen?.(false);
    refresh?.({ force: true });
  };

  const skip = () => {
    dismiss?.();
  };

  const primaryTitle = showIntro
    ? `Hola${name ? `, ${name}` : ""}. Empecemos por lo esencial.`
    : isComplete
      ? playbook.completionTitle
      : playbook.mission;

  const primaryBody = showIntro
    ? "Te guiamos con pocos pasos reales. Puedes cerrar la guía y volver cuando quieras."
    : isComplete
      ? playbook.completionBody
      : activeStep?.body;

  return (
    <>
      {!panelOpen && (
        <button
          type="button"
          onClick={openGuide}
          className="fixed inset-x-3 bottom-20 z-40 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xl transition hover:border-teal-200 hover:shadow-2xl lg:inset-x-auto lg:bottom-5 lg:right-5 lg:w-80"
          aria-label="Abrir guía de inicio"
        >
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${colors.bg} ${colors.text}`}>
              <NavIcon id={playbook.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-950">
                {isComplete ? playbook.completedBadge : activeStep?.title ?? playbook.mission}
              </span>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                <span
                  className={`block h-full rounded-full ${colors.bgStrong}`}
                  style={{ width: `${progress}%` }}
                />
              </span>
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              {doneCount}/{totalCount}
            </span>
          </div>
        </button>
      )}

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/30 p-0 backdrop-blur-[2px] lg:items-stretch lg:justify-end lg:bg-slate-950/20">
          <aside className="flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl lg:h-full lg:max-h-none lg:w-[420px] lg:rounded-none">
            <header className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${colors.bg} ${colors.text}`}>
                    <NavIcon id={playbook.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>
                      Guía de inicio
                    </p>
                    <h2 className="mt-1 text-lg font-semibold leading-6 text-slate-950">
                      {primaryTitle}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPanelOpen?.(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Cerrar guía"
                >
                  <span aria-hidden>×</span>
                </button>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">{primaryBody}</p>

              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${colors.bgStrong} transition-all duration-300`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">
                  {progress}%
                </span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {isComplete ? (
                <div className="space-y-4">
                  <div className={`inline-flex items-center gap-2 rounded-full ${colors.bgSoft} px-3 py-1 text-xs font-semibold ${colors.text}`}>
                    <NavIcon id="tasks" className="h-4 w-4" />
                    {playbook.completedBadge}
                  </div>
                  {playbook.afterComplete?.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Siguientes mejoras
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-5 text-slate-600">
                        {playbook.afterComplete.slice(0, 3).map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${colors.bgStrong}`} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <ol className="space-y-3">
                  {sortedSteps.map((step) => (
                    <GuideStep
                      key={step.id}
                      step={step}
                      index={steps.findIndex((item) => item.id === step.id)}
                      status={statuses[step.id]}
                      active={step.id === activeStep?.id}
                      colors={colors}
                      onGo={goToStep}
                      onDone={markStepDone}
                    />
                  ))}
                </ol>
              )}
            </div>

            <footer className="border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
              {isComplete ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    className={`${colors.btn}`}
                    onClick={() => {
                      navigate(playbook.completionRoute || "/dashboard");
                      dismiss?.();
                    }}
                  >
                    {playbook.completionCta}
                  </Button>
                  {playbook.secondaryCta ? (
                    <Button
                      className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        navigate(playbook.secondaryRoute);
                        dismiss?.();
                      }}
                    >
                      {playbook.secondaryCta}
                    </Button>
                  ) : (
                    <Button
                      className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      onClick={dismiss}
                    >
                      Cerrar
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Button
                    className={`${colors.btn}`}
                    onClick={() => goToStep(activeStep)}
                  >
                    {showIntro ? playbook.introCta : activeStep?.cta ?? "Continuar"}
                  </Button>
                  <button
                    type="button"
                    onClick={skip}
                    className="min-h-10 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showIntro ? playbook.introSkip : "Ocultar guía"}
                  </button>
                </div>
              )}
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
