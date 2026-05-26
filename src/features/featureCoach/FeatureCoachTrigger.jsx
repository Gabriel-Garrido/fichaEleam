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
      title="Ver guía rápida de esta sección"
      aria-label="Ver guía rápida"
      className={`inline-flex min-h-11 sm:min-h-10 items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${className}`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.354a15.998 15.998 0 01-3 0M9.75 21.75H14.25M15.75 8.25a3.75 3.75 0 10-7.5 0c0 1.31.67 2.46 1.68 3.13.3.2.485.535.485.9V12.75a.75.75 0 00.75.75h2.25a.75.75 0 00.75-.75v-.47c0-.365.184-.7.485-.9A3.75 3.75 0 0015.75 8.25z" />
      </svg>
      <span className="hidden sm:inline">Guía</span>
    </button>
  );
}
