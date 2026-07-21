import CoachBulbIcon from "./CoachBulbIcon";
import useFeatureCoach from "./useFeatureCoach";

export default function FeatureCoachTrigger({ featureId, controller, className = "" }) {
  const fallback = useFeatureCoach(featureId);
  const state = controller ?? fallback;
  const { open, enabled } = state;

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={open}
      title="Abrir ayuda de esta pantalla"
      aria-label="Abrir ayuda de esta pantalla"
      className={`inline-flex min-h-11 sm:min-h-10 items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${className}`}
    >
      <CoachBulbIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Ayuda</span>
    </button>
  );
}
