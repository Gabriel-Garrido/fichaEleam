import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOnboarding } from './OnboardingContext';
import { COLOR_CLASSES } from './onboardingConfig';
import NavIcon from '../../components/NavIcon';

// Numbered step preview list shown in both modal variants.
function StepPreview({ steps, colors, compact = false }) {
  if (!steps.length) return null;
  const totalMinutes = steps.reduce((sum, s) => sum + (s.estimatedMinutes ?? 2), 0);

  return (
    <div className={`rounded-2xl border ${colors.border} overflow-hidden`}>
      {/* Header */}
      <div className={`${colors.bg} px-4 py-2.5 flex items-center justify-between`}>
        <p className={`text-[10px] font-black uppercase tracking-wider ${colors.text}`}>
          Lo que harás hoy
        </p>
        <p className={`text-[10px] font-bold ${colors.text} opacity-60`}>
          ~{totalMinutes} min en total
        </p>
      </div>

      {/* Steps */}
      <ul className="divide-y divide-slate-100 bg-white">
        {steps.map((step, i) => (
          <li key={step.id} className={`flex items-center gap-3 ${compact ? 'px-3 py-2' : 'px-4 py-2.5'}`}>
            {/* Number badge */}
            <div className={`w-5 h-5 rounded-full ${colors.bgStrong} text-white flex items-center justify-center shrink-0 text-[9px] font-black`}>
              {i + 1}
            </div>
            {/* Icon */}
            <div className={`shrink-0 w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center ${colors.text}`}>
              <NavIcon id={step.icon} className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            {/* Label */}
            <p className={`flex-1 min-w-0 ${compact ? 'text-xs' : 'text-sm'} font-semibold text-slate-700 truncate`}>
              {step.label}
            </p>
            {/* Time */}
            {step.estimatedMinutes && (
              <p className="shrink-0 text-[10px] text-slate-400 font-medium">
                {step.estimatedMinutes} min
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OnboardingWelcomeModal() {
  const { profile, eleam, rol, can } = useAuth();
  const { showWelcome, config, steps, markWelcomeSeen, isMobile } = useOnboarding();
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const [visible, setVisible] = useState(false);

  // Small delay so the CSS transition plays on mount
  useEffect(() => {
    if (!showWelcome) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), 40);
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

  // Filter highlights based on actual permissions
  const visibleHighlights = config.welcomeHighlights.filter(
    (h) => !h.requiredPermission || can(h.requiredPermission),
  );

  const firstStep = steps[0];
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

          {/* Accent bar */}
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

            {/* Step preview replaces the vague "N pasos · ~2 min" hint */}
            {steps.length > 0 && (
              <div className="mb-4">
                <StepPreview steps={steps} colors={colors} compact />
              </div>
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
        {/* Gradient header with emoji — replaces the flat accent bar */}
        <div className={`${colors.bg} px-8 pt-8 pb-6 text-center border-b ${colors.border}`}>
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm text-4xl mb-4 select-none`}
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

          {(rol === 'funcionario' || rol === 'admin_eleam') && eleamName && (
            <p className="text-sm text-slate-400 mt-0.5">{eleamName}</p>
          )}

          <p className={`text-sm font-bold mt-2 ${colors.text}`}>
            {config.welcomeTagline}
          </p>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            {bodyText}
          </p>
        </div>

        <div className="px-6 py-5">
          {/* Step preview — concrete "what you'll do" list */}
          {steps.length > 0 && (
            <div className="mb-5">
              <StepPreview steps={steps} colors={colors} />
            </div>
          )}

          {/* Permission-filtered highlights, shown only when no step preview */}
          {steps.length === 0 && visibleHighlights.length > 0 && (
            <div className={`rounded-2xl ${colors.bg} border ${colors.border} p-4 mb-5 space-y-3`}>
              {visibleHighlights.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center ${colors.text}`}>
                    <NavIcon id={h.icon} className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{h.text}</span>
                </div>
              ))}
            </div>
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
