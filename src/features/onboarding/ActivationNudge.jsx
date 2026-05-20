import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import NavIcon from "../../components/NavIcon";
import { COLOR_CLASSES } from "./onboardingConfig";
import { useOnboarding } from "./OnboardingContext";

export default function ActivationNudge() {
  const navigate = useNavigate();
  const onboarding = useOnboarding();

  if (!onboarding?.isActive || onboarding.showIntro || onboarding.isComplete) return null;

  const {
    playbook,
    currentRouteStep,
    currentRouteStepIndex,
    state,
    panelOpen,
    setPanelOpen,
    hideNudge,
    markStepDone,
    refresh,
  } = onboarding;

  if (!currentRouteStep || panelOpen || state?.hiddenNudges?.[currentRouteStep.id]) {
    return null;
  }

  const colors = COLOR_CLASSES[playbook.color] ?? COLOR_CLASSES.teal;

  const goToAction = () => {
    if (currentRouteStep.route) navigate(currentRouteStep.route);
    refresh();
  };

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur lg:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colors.bg} ${colors.text}`}>
            <NavIcon id={currentRouteStep.icon} className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
              Paso {currentRouteStepIndex + 1} de {onboarding.totalCount}
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {currentRouteStep.title}
            </p>
            <p className="mt-0.5 text-sm leading-5 text-slate-600">
              {currentRouteStep.help}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Button
            className={`${colors.btn} min-h-9 px-3 py-1.5 text-xs`}
            onClick={goToAction}
          >
            {currentRouteStep.cta}
          </Button>
          {currentRouteStep.manual && (
            <Button
              className="min-h-9 border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => markStepDone(currentRouteStep.id)}
            >
              Marcar como hecho
            </Button>
          )}
          <button
            type="button"
            className="min-h-9 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            onClick={() => hideNudge(currentRouteStep.id)}
          >
            Ocultar
          </button>
          <button
            type="button"
            className="min-h-9 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            onClick={() => setPanelOpen(true)}
          >
            Ver misión
          </button>
        </div>
      </div>
    </div>
  );
}
