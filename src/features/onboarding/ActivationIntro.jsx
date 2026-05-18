import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import NavIcon from "../../components/NavIcon";
import { useAuth } from "../../context/AuthContext";
import { COLOR_CLASSES } from "./onboardingConfig";
import { useOnboarding } from "./OnboardingContext";

function personalize(text, nombre) {
  return text?.replace("{nombre}", nombre || "bienvenido") ?? "";
}

export default function ActivationIntro() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const onboarding = useOnboarding();

  if (!onboarding?.showIntro || !onboarding.playbook) return null;

  const { playbook, firstPendingStep, markIntroSeen, dismiss, setPanelOpen } = onboarding;
  const colors = COLOR_CLASSES[playbook.color] ?? COLOR_CLASSES.teal;
  const nombre = profile?.nombre?.split(" ")?.[0];

  const start = () => {
    markIntroSeen();
    setPanelOpen(true);
    if (firstPendingStep?.route) navigate(firstPendingStep.route);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:bg-slate-950/30 sm:p-6">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:max-w-md sm:p-5">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colors.bg} ${colors.text}`}>
            <NavIcon id={playbook.icon} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
              {playbook.mission}
            </p>
            <h1 className="mt-1 text-lg font-semibold leading-6 text-slate-950">
              {playbook.introTitle}
            </h1>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-slate-800">
            {personalize(playbook.introGreeting, nombre)}
          </p>
          <p className="text-sm leading-6 text-slate-600">
            {playbook.introBody}
          </p>
          <p className="text-sm leading-6 text-slate-500">
            {playbook.introSupport}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button className={`${colors.btn} flex-1`} onClick={start}>
            {playbook.introCta}
          </Button>
          <Button
            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            onClick={dismiss}
          >
            {playbook.introSkip}
          </Button>
        </div>
      </section>
    </div>
  );
}
