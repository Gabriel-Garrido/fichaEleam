import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NavIcon from "../../components/NavIcon";

const STEP_CANDIDATES = [
  {
    feature: "residents",
    permission: "crear_residentes",
    icon: "residents",
    title: "Crea tu primer residente",
    text: "Agrega nombre, RUT y un familiar de contacto. Su ficha clínica queda lista en minutos.",
    cta: "Crear residente",
    route: "/residents/new",
  },
  {
    feature: "team",
    icon: "team",
    title: "Suma a tu equipo",
    text: "Invita a tus funcionarios con su correo: cada uno recibe su acceso y permisos a medida.",
    cta: "Crear funcionario",
    route: "/equipo",
  },
  {
    feature: "accreditation",
    icon: "accreditation",
    title: "Prepara tu Carpeta SEREMI",
    text: "Sube tus documentos del DS 14/2017 y te avisamos 30 días antes de cada vencimiento.",
    cta: "Abrir Carpeta SEREMI",
    route: "/accreditation",
  },
  {
    feature: "beds",
    permission: "asignar_camas",
    icon: "beds",
    title: "Configura camas y habitaciones",
    text: "Crea tus habitaciones y asigna a cada residente su cama, con ocupación en tiempo real.",
    cta: "Configurar camas",
    route: "/camas",
  },
];

export default function OnboardingSteps({ eleamName, isDemo = false }) {
  const navigate = useNavigate();
  const { can, canFeature } = useAuth();

  const steps = STEP_CANDIDATES
    .filter((step) => canFeature(step.feature) && (!step.permission || can(step.permission)))
    .slice(0, 3);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-5 shadow-sm sm:p-7">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-100/50 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Primeros pasos</p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {eleamName ? <>Pongamos en marcha <span className="text-teal-700">{eleamName}</span></> : "Pongamos en marcha tu ELEAM"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Completa estos pasos para empezar a gestionar el día a día. Toma pocos minutos y tu panel se llenará de información útil.
          </p>
          {isDemo && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
              <span aria-hidden="true">★</span> Estás en una cuenta de prueba con 30 días gratis
            </span>
          )}
        </div>
      </section>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li
            key={step.feature}
            className="animate-welcome-rise flex flex-col gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-5"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-700 text-base font-bold text-white tabular-nums">
              {index + 1}
            </span>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
              <NavIcon id={step.icon} className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-slate-900">{step.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{step.text}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(step.route)}
              className="inline-flex w-full min-h-11 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 sm:w-auto sm:min-h-10"
            >
              {step.cta}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </li>
        ))}
      </ol>

      <p className="px-1 text-xs text-slate-400">
        En cada sección encontrarás una <span className="font-semibold text-slate-600">Guía rápida</span> que te explica cómo aprovecharla.
      </p>
    </div>
  );
}
