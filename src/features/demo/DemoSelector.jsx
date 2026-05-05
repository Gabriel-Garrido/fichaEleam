import React from "react";
import { useNavigate } from "react-router-dom";
import { useSEO, faqJsonLd } from "../../utils/seo";

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

  useSEO({
    title: "Demo gratis · prueba FichaEleam por perfil de usuario",
    description:
      "Prueba FichaEleam con datos de ejemplo: como administrador del ELEAM, como personal de turno o como familiar de un residente. Sin registro, sin instalación.",
    path: "/demo",
    keywords: ["demo ELEAM", "prueba software ELEAM", "FichaEleam demo"],
    jsonLd: faqJsonLd([
      {
        q: "¿Necesito registrarme para probar el demo?",
        a: "No. El demo de FichaEleam funciona offline en tu navegador con datos de ejemplo. No hay registro ni tarjeta requerida.",
      },
      {
        q: "¿Qué perfiles puedo probar?",
        a: "Tres perfiles: dueño/director del ELEAM (vista completa), personal del ELEAM (vista de turno) y familiar (vista limitada al residente).",
      },
    ]),
  });

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
            Demo gratuito · sin registro
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-800 mt-4 mb-3">
            En 3 minutos vas a entender por qué un ELEAM digital cambia el día a día
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Elige el perfil más parecido al tuyo y explora la app con datos de
            ejemplo. Sin registro, sin instalación. Verás cómo se gestiona la
            ficha clínica, los signos vitales, las observaciones de turno y la
            <strong> Carpeta SEREMI lista para fiscalización</strong>.
          </p>
        </div>

        {/* Antes/Después rápido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10 text-sm">
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-2">Sin FichaEleam</p>
            <ul className="space-y-1.5 text-rose-800">
              <li>· Cuadernos por turno que se pierden o se mojan.</li>
              <li>· Buscar certificados a medianoche antes de la SEREMI.</li>
              <li>· Familias llamando porque no saben cómo está su mamá.</li>
              <li>· Observaciones que nadie sabe quién registró.</li>
            </ul>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-2">Con FichaEleam</p>
            <ul className="space-y-1.5 text-emerald-900">
              <li>✓ Registro digital firmado por funcionario y turno.</li>
              <li>✓ Carpeta SEREMI con 14 ámbitos y alertas de vencimiento.</li>
              <li>✓ Portal del familiar con datos del residente al día.</li>
              <li>✓ Trazabilidad: quién hizo qué, cuándo y para qué residente.</li>
            </ul>
          </div>
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
