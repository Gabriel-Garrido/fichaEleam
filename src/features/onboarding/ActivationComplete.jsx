import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import NavIcon from "../../components/NavIcon";
import { COLOR_CLASSES } from "./onboardingConfig";

export default function ActivationComplete({ playbook, onDismiss }) {
  const navigate = useNavigate();
  const colors = COLOR_CLASSES[playbook.color] ?? COLOR_CLASSES.teal;

  const goToPrimary = () => {
    navigate(playbook.completionRoute || "/dashboard");
    onDismiss?.();
  };

  const goToSecondary = () => {
    if (!playbook.secondaryRoute) return;
    navigate(playbook.secondaryRoute);
    onDismiss?.();
  };

  return (
    <div className="space-y-4">
      <div className={`inline-flex items-center gap-2 rounded-full ${colors.bgSoft} px-3 py-1 text-xs font-semibold ${colors.text}`}>
        <NavIcon id="tasks" className="h-4 w-4" />
        {playbook.completedBadge}
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-950">
          {playbook.completionTitle}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {playbook.completionBody}
        </p>
      </div>

      {playbook.afterComplete?.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Después puedes
          </p>
          <ul className="mt-2 space-y-2 text-sm text-slate-600">
            {playbook.afterComplete.slice(0, 3).map((item) => (
              <li key={item} className="flex gap-2">
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${colors.bgStrong}`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className={`${colors.btn} flex-1`} onClick={goToPrimary}>
          {playbook.completionCta}
        </Button>
        {playbook.secondaryCta && (
          <Button
            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            onClick={goToSecondary}
          >
            {playbook.secondaryCta}
          </Button>
        )}
      </div>
    </div>
  );
}
