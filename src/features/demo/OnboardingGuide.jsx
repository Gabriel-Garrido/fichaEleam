import React from "react";

export const ADMIN_STEPS = [
  {
    id: 1,
    panel: "dashboard",
    titulo: "Dashboard operativo",
    descripcion: "Aquí ves el estado de tu ELEAM en tiempo real: residentes activos, alertas clínicas y actividad del turno.",
    icono: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    id: 2,
    panel: "residents",
    titulo: "Fichas de residentes",
    descripcion: "Cada residente tiene su ficha digital completa: diagnóstico, historial, índice Barthel y nivel de dependencia.",
    icono: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    id: 3,
    panel: "vitals",
    titulo: "Signos vitales",
    descripcion: "Registra y visualiza signos por turno con alertas automáticas cuando un valor está fuera del rango clínico.",
    icono: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    callout: "¿Tu ELEAM tiene fiscalización próxima? Un especialista puede ayudarte a organizarla en 24h.",
  },
  {
    id: 4,
    panel: "observations",
    titulo: "Observaciones de turno",
    descripcion: "12 tipos de observaciones diarias. Todo queda con firma digital y timestamp para tu trazabilidad.",
    icono: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    id: 5,
    panel: "accreditation",
    titulo: "Carpeta SEREMI",
    descripcion: "14 ámbitos del DS 14/2017 organizados. Sube evidencias, gestiona estados y genera la carpeta lista para fiscalización.",
    icono: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    callout: "¿Tu ELEAM tiene fiscalización próxima? Un especialista puede ayudarte a organizarla en 24h.",
  },
  {
    id: 6,
    panel: "team",
    titulo: "Gestión de equipo",
    descripcion: "Invita funcionarios y familiares. Define permisos granulares para que cada rol vea exactamente lo que le corresponde.",
    icono: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
];

export const FUNCIONARIO_STEPS = [
  {
    id: 1,
    panel: "dashboard",
    titulo: "Tu turno de hoy",
    descripcion: "Al ingresar ves el resumen del turno: alertas activas, residentes a monitorear y las últimas observaciones.",
    icono: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    id: 2,
    panel: "vitals",
    titulo: "Registrar signos vitales",
    descripcion: "Formulario rápido con validación en vivo. Si un valor está fuera del rango clínico, la alerta aparece de inmediato.",
    icono: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  },
  {
    id: 3,
    panel: "observations",
    titulo: "Escribir observación",
    descripcion: "Selecciona el tipo de observación, escribe tu nota y queda registrada con tu firma digital y la hora exacta.",
    icono: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  },
  {
    id: 4,
    panel: "residents",
    titulo: "Ver historial del residente",
    descripcion: "Accede al historial completo: signos, observaciones, diagnósticos y todo lo que el turno anterior registró.",
    icono: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
];

export const FAMILIAR_STEPS = [
  {
    id: 1,
    panel: "portal",
    titulo: "Estado de tu familiar",
    descripcion: "En tu portal ves el resumen de salud de tu familiar: signos recientes, observaciones y si requiere seguimiento.",
    icono: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  },
  {
    id: 2,
    panel: "vitals_view",
    titulo: "Últimos signos vitales",
    descripcion: "Consulta los últimos registros de presión, temperatura, saturación y otros. Con semáforo visual para entender el estado.",
    icono: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    id: 3,
    panel: "obs_view",
    titulo: "Observaciones recientes",
    descripcion: "Lee las últimas observaciones del equipo de salud sobre tu familiar: alimentación, bienestar, rehabilitación y más.",
    icono: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    id: 4,
    panel: "visitas",
    titulo: "Registrar una visita",
    descripcion: "Anota cuándo visitaste a tu familiar, cuánto tiempo estuviste y cómo fue la visita. Queda en el historial del establecimiento.",
    icono: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
];

const STEPS_BY_ROLE = {
  admin:      ADMIN_STEPS,
  funcionario: FUNCIONARIO_STEPS,
  familiar:   FAMILIAR_STEPS,
};

function CheckIcon({ done }) {
  if (done) {
    return (
      <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full border-2 border-slate-300 shrink-0" />
  );
}

export default function OnboardingGuide({
  role,
  activePanel,
  completedSteps,
  onGoToStep,
  onNext,
  onDismiss,
  totalProgress,
}) {
  const steps = STEPS_BY_ROLE[role] ?? ADMIN_STEPS;
  const currentIndex = steps.findIndex((s) => s.panel === activePanel);

  return (
    <aside className="w-72 shrink-0 bg-white border-r border-slate-100 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Guía del demo</span>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Explorar libre
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full h-2">
            <div
              className="bg-teal-500 h-2 rounded-full transition-all"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-teal-600 shrink-0">{totalProgress}%</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">Progreso total (todos los roles)</p>
      </div>

      {/* Steps list */}
      <div className="flex-1 p-3 space-y-1">
        {steps.map((step, i) => {
          const done    = completedSteps.includes(step.panel);
          const active  = step.panel === activePanel;
          return (
            <button
              type="button"
              key={step.id}
              onClick={() => onGoToStep(step.panel)}
              className={`w-full text-left rounded-xl p-3 transition-all flex items-start gap-3 ${
                active
                  ? "bg-teal-50 border border-teal-200"
                  : done
                  ? "hover:bg-slate-50"
                  : "hover:bg-slate-50"
              }`}
            >
              <CheckIcon done={done} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${active ? "text-teal-700" : done ? "text-slate-500" : "text-slate-700"}`}>
                    {i + 1}. {step.titulo}
                  </span>
                  {!done && !active && (
                    <span className="bg-sky-100 text-sky-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">Nuevo</span>
                  )}
                </div>
                {active && (
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.descripcion}</p>
                )}
                {active && step.callout && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2">
                    <p className="text-[11px] text-amber-800 leading-snug">{step.callout}</p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <div className="p-4 border-t border-slate-100">
        {currentIndex < steps.length - 1 ? (
          <button
            type="button"
            onClick={onNext}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            Siguiente paso
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="text-center">
            <p className="text-xs text-teal-600 font-semibold mb-2">¡Completaste esta vista!</p>
            <p className="text-xs text-slate-500">Prueba las otras vistas (Funcionario, Familiar) para ver el 100%.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
