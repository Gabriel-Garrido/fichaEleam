import React from "react";
import { useNavigate } from "react-router-dom";

const PROFILES = [
  {
    key: "admin",
    titulo: "Soy dueño/director del ELEAM",
    bajada: "Mira cómo gestionarías toda la residencia: residentes, signos vitales, observaciones de turno, equipo, acreditación SEREMI.",
    icon: "🏥",
    bg: "from-teal-500 to-emerald-600",
    cta: "Probar como administrador",
    path: "/demo/admin",
  },
  {
    key: "funcionario",
    titulo: "Trabajo en un ELEAM",
    bajada: "Mira la experiencia del personal de turno: registrar signos vitales, dejar observaciones y consultar la ficha de cada residente.",
    icon: "👩‍⚕️",
    bg: "from-sky-500 to-indigo-500",
    cta: "Probar como personal",
    path: "/demo/funcionario",
  },
  {
    key: "familiar",
    titulo: "Tengo un familiar en un ELEAM",
    bajada: "Mira lo que verías como familiar: el estado de tu ser querido, sus signos vitales recientes y registro de visitas.",
    icon: "👵",
    bg: "from-rose-400 to-amber-400",
    cta: "Probar como familiar",
    path: "/demo/familiar",
  },
];

export default function DemoSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-xl font-black text-[var(--color-primary)] tracking-tight"
          >
            FichaEleam
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => navigate("/register")}
              className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
              Crear cuenta
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Demo gratuito
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-800 mt-4 mb-3">
            ¿Cómo se ve FichaEleam para ti?
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Elige el perfil que más se parece al tuyo y explora la app con datos
            de ejemplo. Puedes volver y probar otros perfiles cuando quieras.
            Los datos del demo se guardan solo en tu navegador.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {PROFILES.map((p) => (
            <button
              key={p.key}
              onClick={() => navigate(p.path)}
              className="group text-left bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col"
            >
              <div className={`bg-gradient-to-br ${p.bg} p-6 text-white text-4xl`}>
                {p.icon}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h2 className="font-bold text-gray-800 text-lg mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                  {p.titulo}
                </h2>
                <p className="text-sm text-gray-500 flex-1">
                  {p.bajada}
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-[var(--color-primary)]">
                  {p.cta}
                  <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
          <h3 className="font-bold text-gray-800 mb-1">¿Listo para usar la versión real?</h3>
          <p className="text-sm text-gray-500 mb-4">
            Crea tu cuenta y activa la suscripción de tu ELEAM. Tu equipo y
            los familiares de los residentes acceden incluidos.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate("/register")}
              className="bg-[var(--color-primary)] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--color-button-hover)]"
            >
              Crear cuenta gratis
            </button>
            <button
              onClick={() => navigate("/pago")}
              className="border border-gray-200 text-gray-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50"
            >
              Ver planes y precios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
