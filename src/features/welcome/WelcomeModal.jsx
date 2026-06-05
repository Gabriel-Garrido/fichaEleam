import { useState } from "react";
import Modal from "../../components/Modal";
import NavIcon from "../../components/NavIcon";
import {
  WELCOME_VALUE,
  WELCOME_PILLARS,
  WELCOME_HIGHLIGHTS,
  WELCOME_START_STEPS,
} from "./welcomeContent";

const STEP_COUNT = 3;

export default function WelcomeModal({ open, onClose, adminName, eleamName, isDemo = false }) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const firstName = (adminName || "").trim().split(/\s+/)[0] || "";
  const next = () => setStep((value) => Math.min(STEP_COUNT - 1, value + 1));
  const back = () => setStep((value) => Math.max(0, value - 1));
  const isLast = step === STEP_COUNT - 1;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      ariaLabel="Bienvenida a FichaEleam"
      closeOnBackdrop={false}
      showCloseButton={false}
      panelClassName="max-w-2xl p-0 overflow-hidden"
    >
      <div className="relative">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 px-5 py-3 text-white">
          <span aria-hidden="true" className="welcome-sheen" />
          <div className="relative flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15 ring-1 ring-white/25">
              <NavIcon id="home" className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">FichaEleam</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar bienvenida"
            className="relative grid h-8 w-8 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18 18 6" />
            </svg>
          </button>
        </div>

        <div key={step} className="animate-slide-in px-5 py-6 sm:px-7 sm:py-7">
          {step === 0 && <StepWelcome firstName={firstName} eleamName={eleamName} isDemo={isDemo} />}
          {step === 1 && <StepFeatures />}
          {step === 2 && <StepStart isDemo={isDemo} />}
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur-sm sm:px-7">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: STEP_COUNT }).map((_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === step ? "w-5 bg-teal-600" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={back}
                className="inline-flex min-h-10 items-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Atrás
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-10 items-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Saltar
              </button>
            )}
            <button
              type="button"
              onClick={isLast ? onClose : next}
              data-autofocus
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 sm:min-h-10"
            >
              {isLast ? "Comenzar a usar FichaEleam" : "Continuar"}
              {!isLast && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function StepWelcome({ firstName, eleamName, isDemo }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center">
        <span aria-hidden="true" className="welcome-sparkle absolute -left-1 -top-1 text-amber-400" style={{ animationDelay: "120ms" }}>✦</span>
        <span aria-hidden="true" className="welcome-sparkle absolute -right-1 top-1 text-teal-400" style={{ animationDelay: "420ms" }}>✦</span>
        <span aria-hidden="true" className="welcome-sparkle absolute bottom-0 left-2 text-emerald-400" style={{ animationDelay: "700ms" }}>✦</span>
        <span className="animate-home-pop grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white shadow-lg ring-1 ring-teal-200">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </span>
      </div>

      <p className="animate-welcome-rise text-xs font-semibold uppercase tracking-[0.16em] text-teal-700" style={{ animationDelay: "60ms" }}>
        Bienvenido a bordo
      </p>
      <h2 className="animate-welcome-rise mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl" style={{ animationDelay: "120ms" }}>
        {firstName ? `¡Hola, ${firstName}!` : "¡Te damos la bienvenida!"}
      </h2>
      <p className="animate-welcome-rise mt-2 text-sm leading-relaxed text-slate-600 sm:text-base" style={{ animationDelay: "180ms" }}>
        {eleamName ? <>Tu ELEAM <span className="font-semibold text-slate-800">{eleamName}</span> ya está en FichaEleam. </> : null}
        {WELCOME_VALUE}
      </p>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
        {WELCOME_PILLARS.map((pillar, index) => (
          <div
            key={pillar.title}
            className="animate-welcome-rise rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-left"
            style={{ animationDelay: `${260 + index * 90}ms` }}
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
              <NavIcon id={pillar.icon} className="h-5 w-5" />
            </span>
            <p className="mt-2.5 text-sm font-semibold text-slate-900">{pillar.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{pillar.text}</p>
          </div>
        ))}
      </div>

      {isDemo && (
        <p className="animate-welcome-rise mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200" style={{ animationDelay: "560ms" }}>
          <span aria-hidden="true">★</span> Estás en una cuenta de prueba con 30 días gratis
        </p>
      )}
    </div>
  );
}

function StepFeatures() {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
        Todo lo que tu ELEAM necesita
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        Una sola plataforma para la operación clínica, el equipo y la acreditación. Esto es lo que harás cada día:
      </p>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {WELCOME_HIGHLIGHTS.map((item, index) => (
          <div
            key={item.title}
            className="animate-welcome-rise flex gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:flex-col sm:gap-2"
            style={{ animationDelay: `${index * 55}ms` }}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
              <NavIcon id={item.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepStart({ isDemo }) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
        Empieza en 3 pasos
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        En cada pantalla encontrarás una <span className="font-semibold text-teal-700">Guía rápida</span> que te muestra cómo sacarle provecho. Para arrancar:
      </p>

      <ol className="mt-4 space-y-2.5">
        {WELCOME_START_STEPS.map((item, index) => (
          <li
            key={item.title}
            className="animate-welcome-rise flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-700 text-xs font-bold text-white tabular-nums">
              {index + 1}
            </span>
            <p className="min-w-0 text-sm leading-relaxed text-slate-700">
              <span className="font-semibold text-slate-900">{item.title}.</span>
              <span className="text-slate-600"> {item.text}</span>
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 p-4 ring-1 ring-teal-100">
        <p className="text-sm font-semibold text-teal-900">
          {isDemo ? "Tu prueba gratuita está activa por 30 días" : "Tu ELEAM está listo para operar"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-teal-800">
          {isDemo
            ? "Explora con datos reales y, cuando quieras, activa tu plan sin perder nada de lo cargado. ¿Dudas? Te acompañamos por WhatsApp."
            : "Carga tus residentes y tu equipo, y empieza a registrar el día a día con trazabilidad completa."}
        </p>
      </div>
    </div>
  );
}
