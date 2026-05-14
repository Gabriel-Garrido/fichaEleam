import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOnboarding } from './OnboardingContext';
import { COLOR_CLASSES } from './onboardingConfig';
import NavIcon from '../../components/NavIcon';

export default function OnboardingWelcomeModal() {
  const { profile, eleam, rol, can } = useAuth();
  const { showWelcome, config, steps, markWelcomeSeen, isMobile } = useOnboarding();
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const [visible, setVisible] = useState(false);

  // Small delay so the CSS transition plays on mount
  useEffect(() => {
    if (!showWelcome) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, [showWelcome]);

  // Keyboard: Escape = skip
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (e.key === 'Escape') handleSkip(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!showWelcome || !config) return null;

  const colors = COLOR_CLASSES[config.color] ?? COLOR_CLASSES.teal;
  const firstName = profile?.nombre?.split(' ')?.[0] ?? '';
  const eleamName = eleam?.nombre ?? '';

  // Filter highlights based on the user's actual permissions.
  // By the time this modal renders, profileLoading is false (see context),
  // so can() reflects the real permission set.
  const visibleHighlights = config.welcomeHighlights.filter(
    (h) => !h.requiredPermission || can(h.requiredPermission),
  );

  // Navigate to the first available (permission-granted) step
  const firstStep = steps[0];

  // Use mobile body if on mobile and config provides it
  const bodyText = isMobile && config.welcomeBodyMobile
    ? config.welcomeBodyMobile
    : config.welcomeBody;

  function handleStart() {
    markWelcomeSeen();
    if (firstStep?.route) navigate(firstStep.route);
  }

  function handleSkip() {
    markWelcomeSeen();
  }

  // ── Mobile: bottom sheet ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-welcome-title"
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity duration-300 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleSkip}
        />

        {/* Bottom sheet card */}
        <div
          ref={dialogRef}
          tabIndex={-1}
          className={`absolute bottom-0 left-0 right-0 outline-none bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transition-transform duration-300 ${
            visible ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
          </div>

          {/* Thin accent bar */}
          <div className={`h-1 shrink-0 ${colors.pill}`} />

          <div className="px-5 pt-5 pb-6 overflow-y-auto flex-1">
            {/* Hero row */}
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${colors.bg} text-3xl flex-shrink-0 shadow-sm select-none`}
                aria-hidden="true"
              >
                {config.welcomeEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <h1
                  id="onboarding-welcome-title"
                  className="text-xl font-black text-slate-900 leading-tight"
                >
                  {firstName ? `Hola, ${firstName}` : 'Bienvenido'}
                </h1>
                {(rol === 'funcionario' || rol === 'admin_eleam') && eleamName && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{eleamName}</p>
                )}
                <p className={`text-sm font-bold mt-1 ${colors.text}`}>
                  {config.welcomeTagline}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              {bodyText}
            </p>

            {/* Permission-filtered highlights — compact on mobile */}
            {visibleHighlights.length > 0 && (
              <div
                className={`rounded-2xl ${colors.bg} border ${colors.border} px-4 py-3 mb-4 space-y-2.5`}
              >
                {visibleHighlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-xl bg-white shadow-sm flex items-center justify-center ${colors.text}`}
                    >
                      <NavIcon id={h.icon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 leading-snug">{h.text}</span>
                  </div>
                ))}
                {/* Module count badge */}
                <p className={`text-[10px] font-bold text-right ${colors.text} opacity-70 pt-0.5`}>
                  {visibleHighlights.length} módulo{visibleHighlights.length !== 1 ? 's' : ''} incluido{visibleHighlights.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Step count hint */}
            {steps.length > 0 && (
              <p className="text-center text-xs text-slate-400 mb-4">
                {steps.length} paso{steps.length !== 1 ? 's' : ''} para comenzar · ~2 min
              </p>
            )}

            {/* Primary CTA */}
            <button
              type="button"
              onClick={handleStart}
              className={`w-full py-3.5 px-6 rounded-2xl text-white font-bold text-base ${colors.btn} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all shadow-lg active:scale-[0.98]`}
            >
              {config.welcomeCta}
              <span className="ml-1.5" aria-hidden="true">→</span>
            </button>

            {/* Secondary: skip */}
            <button
              type="button"
              onClick={handleSkip}
              className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors rounded-xl"
            >
              Ya conozco el sistema, explorar solo
            </button>

            {/* Swipe hint */}
            <p className="text-center text-[10px] text-slate-300 mt-2">
              desliza hacia abajo para cerrar
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop: centered modal ───────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-welcome-title"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleSkip}
      />

      {/* Card */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full max-w-md outline-none rounded-3xl bg-white shadow-2xl overflow-hidden transition-all duration-300 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Thin accent bar at the top */}
        <div className={`h-1.5 ${colors.pill}`} />

        <div className="px-8 pt-8 pb-7">
          {/* Hero */}
          <div className="flex flex-col items-center text-center mb-7">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${colors.bg} text-5xl mb-4 shadow-sm select-none`}
              aria-hidden="true"
            >
              {config.welcomeEmoji}
            </div>

            <h1
              id="onboarding-welcome-title"
              className="text-2xl font-black text-slate-900 leading-tight"
            >
              {firstName ? `Hola, ${firstName}` : 'Bienvenido'}
            </h1>

            {/* Show ELEAM name for funcionarios and admin_eleam */}
            {(rol === 'funcionario' || rol === 'admin_eleam') && eleamName && (
              <p className="text-sm text-slate-400 mt-0.5">{eleamName}</p>
            )}

            <p className={`text-base font-bold mt-3 ${colors.text}`}>
              {config.welcomeTagline}
            </p>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-xs">
              {bodyText}
            </p>
          </div>

          {/* Permission-filtered feature highlights */}
          {visibleHighlights.length > 0 && (
            <div
              className={`rounded-2xl ${colors.bg} border ${colors.border} p-4 mb-6 space-y-3`}
            >
              {visibleHighlights.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center ${colors.text}`}
                  >
                    <NavIcon id={h.icon} className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{h.text}</span>
                </div>
              ))}
              {/* Module count badge */}
              <p className={`text-xs font-bold text-right ${colors.text} opacity-70 pt-1`}>
                {visibleHighlights.length} módulo{visibleHighlights.length !== 1 ? 's' : ''} incluido{visibleHighlights.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Step count hint */}
          {steps.length > 0 && (
            <p className="text-center text-xs text-slate-400 mb-4">
              {steps.length} paso{steps.length !== 1 ? 's' : ''} para configurar tu espacio · ~2 min
            </p>
          )}

          {/* Primary CTA */}
          <button
            type="button"
            onClick={handleStart}
            className={`w-full py-3.5 px-6 rounded-2xl text-white font-bold text-base ${colors.btn} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all shadow-lg active:scale-[0.98]`}
          >
            {config.welcomeCta}
            <span className="ml-1.5" aria-hidden="true">→</span>
          </button>

          {/* Secondary: skip */}
          <button
            type="button"
            onClick={handleSkip}
            className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors rounded-xl"
          >
            Ya conozco el sistema, explorar solo
          </button>
        </div>
      </div>
    </div>
  );
}
