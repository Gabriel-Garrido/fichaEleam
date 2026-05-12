import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOnboarding } from './OnboardingContext';
import { COLOR_CLASSES } from './onboardingConfig';
import NavIcon from '../../components/NavIcon';

export default function OnboardingWelcomeModal() {
  const { profile, eleam, rol } = useAuth();
  const { showWelcome, config, steps, markWelcomeSeen } = useOnboarding();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef(null);

  // Slight delay so the entrance animation is visible
  useEffect(() => {
    if (showWelcome) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [showWelcome]);

  // Trap focus inside the modal
  useEffect(() => {
    if (!visible) return;
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!showWelcome || !config) return null;

  const colors = COLOR_CLASSES[config.color] ?? COLOR_CLASSES.teal;
  const firstName = profile?.nombre?.split(' ')?.[0] ?? '';
  const eleamName = eleam?.nombre ?? '';
  const firstStep = steps?.[0];

  function handleStart() {
    markWelcomeSeen();
    if (firstStep?.route) navigate(firstStep.route);
  }

  function handleSkip() {
    markWelcomeSeen();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
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
        {/* Colored accent bar */}
        <div className={`h-1.5 ${colors.pill}`} />

        {/* Content */}
        <div className="px-8 pt-8 pb-7">
          {/* Emoji hero */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${colors.bg} text-5xl mb-4 shadow-sm`}>
              {config.welcomeEmoji}
            </div>

            <h1 id="onboarding-title" className="text-2xl font-black text-slate-900 leading-tight">
              {firstName ? `Hola, ${firstName}` : 'Bienvenido'}
            </h1>

            {rol === 'funcionario' && eleamName && (
              <p className="text-sm text-slate-400 mt-0.5">{eleamName}</p>
            )}

            <p className={`text-base font-bold mt-2.5 ${colors.text}`}>
              {config.welcomeTagline}
            </p>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-xs">
              {config.welcomeBody}
            </p>
          </div>

          {/* Feature highlights */}
          <div className={`rounded-2xl ${colors.bg} border ${colors.border} p-4 mb-6 space-y-3`}>
            {config.welcomeHighlights.map((h, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center ${colors.text}`}>
                  <NavIcon id={h.icon} className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-700">{h.text}</span>
              </div>
            ))}
          </div>

          {/* Step count hint */}
          <p className="text-center text-xs text-slate-400 mb-4">
            {steps.length} paso{steps.length !== 1 ? 's' : ''} para configurar tu espacio · ~2 min
          </p>

          {/* CTAs */}
          <button
            onClick={handleStart}
            className={`w-full py-3.5 px-6 rounded-2xl text-white font-bold text-base ${colors.btn} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all shadow-lg active:scale-[0.98]`}
          >
            {config.welcomeCta}
            <span className="ml-2">→</span>
          </button>
          <button
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
