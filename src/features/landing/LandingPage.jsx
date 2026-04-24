import React from "react";
import { useNavigate } from "react-router-dom";

/* ── Íconos SVG inline (sin dependencias) ─────────────── */
function Icon({ d, className = "w-6 h-6" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

const PAINS = [
  "Fiscalización SEREMI y no sabes dónde están todos los documentos.",
  "Registros en papel que se pierden, mojan o simplemente no se encuentran.",
  "Turnos sin información clara de lo que hizo el turno anterior.",
  "Imposible saber quién modificó qué registro y cuándo.",
  "Cada vez que llega una inspección, hay que correr a ordenar carpetas.",
];

const BENEFITS = [
  {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Cumplimiento DS 14/2017",
    text: "Toda la documentación exigida por la SEREMI organizada por categoría, lista para mostrar en una fiscalización.",
  },
  {
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    title: "Ficha clínica digital",
    text: "Historial de signos vitales, observaciones de turno y diagnósticos en un solo lugar, accesible desde cualquier dispositivo.",
  },
  {
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    title: "Trabajo en equipo",
    text: "Médicos, enfermeras y técnicos registran en tiempo real. El turno siguiente sabe exactamente qué pasó.",
  },
  {
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    title: "Sin papeles, sin carpetas",
    text: "Registros diarios de alimentación, higiene, medicamentos y más — todos digitales, con fecha, hora y responsable.",
  },
  {
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    title: "Trazabilidad total",
    text: "Cada acción queda registrada. Sabe exactamente quién hizo qué, cuándo y para qué residente.",
  },
  {
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    title: "Seguridad y privacidad",
    text: "Datos clínicos protegidos con acceso por roles. Cada funcionario ve solo lo que necesita ver.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Activa tu ELEAM",
    text: "Crea tu cuenta, registra tu establecimiento y activa el plan mensual. Listo en menos de 5 minutos.",
  },
  {
    step: "2",
    title: "Agrega a tu equipo y residentes",
    text: "Invita a tus funcionarios y carga las fichas de tus residentes. Los datos migran fácilmente.",
  },
  {
    step: "3",
    title: "Opera con orden desde el primer día",
    text: "Registros de turno, signos vitales, documentos SEREMI — todo en un solo lugar, desde cualquier dispositivo.",
  },
];

const TESTIMONIALS = [
  {
    name: "Verónica R.",
    role: "Directora, ELEAM Los Aromos — La Serena",
    text: "Antes de FichaEleam teníamos carpetas por todos lados. Hoy la fiscalizadora llega y en dos minutos le muestro todo. La diferencia es brutal.",
  },
  {
    name: "Carlos M.",
    role: "Enfermero, Residencia El Mirador — Concepción",
    text: "Ya no pierdo tiempo buscando quién registró qué. Todo está ahí, con nombre, fecha y hora. Y el turno siguiente sabe exactamente qué pasó.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-white text-gray-800 overflow-x-hidden">

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-[var(--color-primary)] tracking-tight">
            FichaEleam
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/demo")}
              className="hidden sm:inline-flex text-sm text-gray-600 hover:text-[var(--color-primary)] transition-colors px-3 py-1.5"
            >
              Ver demo
            </button>
            <button
              onClick={() => navigate("/login")}
              className="text-sm border border-[var(--color-primary)] text-[var(--color-primary)] px-4 py-1.5 rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-all"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => navigate("/pago")}
              className="hidden sm:inline-flex text-sm bg-[var(--color-primary)] text-white px-4 py-1.5 rounded-lg hover:bg-[var(--color-button-hover)] transition-all font-medium"
            >
              Comenzar
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-accent)] to-teal-900 text-white pt-24 pb-28 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[url('/grid.svg')] bg-repeat" />
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            Plataforma para ELEAM — Chile
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6">
            El desorden administrativo<br className="hidden sm:block" />
            <span className="text-[var(--color-secondary)]"> ya no es excusa</span>
            <br className="hidden sm:block" /> en una fiscalización.
          </h1>
          <p className="text-lg sm:text-xl text-teal-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            FichaEleam digitaliza fichas clínicas, registros de turno y documentación
            SEREMI. Tu ELEAM siempre listo para una inspección.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/pago")}
              className="bg-white text-[var(--color-primary)] font-bold py-3.5 px-8 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-base"
            >
              Activar mi ELEAM →
            </button>
            <button
              onClick={() => navigate("/demo")}
              className="border-2 border-white/60 text-white font-semibold py-3.5 px-8 rounded-xl hover:bg-white/10 transition-all text-base"
            >
              Explorar sin registrarme
            </button>
          </div>
          <p className="mt-5 text-sm text-teal-200">
            Sin tarjeta de crédito para el demo · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── DOLOR ────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-3 text-center">
            ¿Te suena familiar?
          </p>
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">
            Esto pasa en la mayoría de los ELEAM hoy
          </h2>
          <ul className="space-y-4">
            {PAINS.map((pain, i) => (
              <li key={i} className="flex items-start gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="text-gray-700 text-sm leading-relaxed">{pain}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate("/demo")}
              className="text-[var(--color-primary)] text-sm font-medium underline underline-offset-2 hover:text-[var(--color-accent)] transition-colors"
            >
              Ver cómo FichaEleam lo resuelve →
            </button>
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS ───────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-3 text-center">
            Solución concreta
          </p>
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Todo lo que tu ELEAM necesita, en un solo lugar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map(({ icon, title, text }, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-100 hover:border-[var(--color-secondary)] hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-[var(--color-secondary)]/30 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[var(--color-secondary)]/50 transition-colors">
                  <Icon d={icon} className="w-5 h-5 text-[var(--color-accent)]" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-br from-teal-50 to-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-3 text-center">
            Simple y rápido
          </p>
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Operativo en menos de 10 minutos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            {/* línea conectora */}
            <div className="hidden sm:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-[var(--color-secondary)]" />
            {HOW_IT_WORKS.map(({ step, title, text }, i) => (
              <div key={i} className="text-center relative">
                <div className="w-16 h-16 bg-[var(--color-primary)] text-white rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-4 shadow-lg relative z-10">
                  {step}
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANES ───────────────────────────────────────── */}
      <section id="planes" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-3 text-center">
            Precios
          </p>
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
            Un precio mensual por tu ELEAM
          </h2>
          <p className="text-center text-gray-500 mb-12 text-sm">
            Sin cobros por usuario. Paga según el tamaño de tu establecimiento.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { residentes: "Hasta 14",  precio: "$50.000",  popular: false },
              { residentes: "15 a 24",   precio: "$80.000",  popular: true  },
              { residentes: "25 a 34",   precio: "$120.000", popular: false },
              { residentes: "35 o más",  precio: "Consultar",popular: false },
            ].map(({ residentes, precio, popular }, i) => (
              <div
                key={i}
                className={`rounded-2xl p-5 border-2 text-center relative ${
                  popular
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xl"
                    : "border-gray-200 bg-white"
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-accent)] text-white text-xs px-3 py-0.5 rounded-full font-semibold">
                    Más elegido
                  </span>
                )}
                <p className={`text-xs font-semibold mb-1 ${popular ? "text-teal-200" : "text-gray-400"}`}>
                  {residentes} residentes
                </p>
                <p className={`text-2xl font-black mb-0.5 ${popular ? "text-white" : "text-gray-800"}`}>
                  {precio}
                </p>
                {precio !== "Consultar" && (
                  <p className={`text-xs ${popular ? "text-teal-200" : "text-gray-400"}`}>CLP / mes</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">
            + $5.000 CLP por cada residente adicional sobre 34
          </p>
          <div className="text-center mt-10">
            <button
              onClick={() => navigate("/pago")}
              className="bg-[var(--color-primary)] text-white font-bold py-3.5 px-10 rounded-xl hover:bg-[var(--color-button-hover)] transition-all shadow-md hover:shadow-lg text-base"
            >
              Activar mi plan →
            </button>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ──────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-3 text-center">
            Testimonios
          </p>
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Lo que dicen quienes ya lo usan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {TESTIMONIALS.map(({ name, role, text }, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, s) => (
                    <svg key={s} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed italic mb-4">"{text}"</p>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{name}</p>
                  <p className="text-xs text-gray-400">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Tu próxima fiscalización puede ser tranquila.
          </h2>
          <p className="text-teal-100 mb-8 text-base">
            Únete a los ELEAM que ya operan con orden, trazabilidad y cumplimiento normativo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/pago")}
              className="bg-white text-[var(--color-primary)] font-bold py-3.5 px-8 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Activar mi ELEAM →
            </button>
            <button
              onClick={() => navigate("/demo")}
              className="border-2 border-white/60 text-white font-semibold py-3.5 px-8 rounded-xl hover:bg-white/10 transition-all"
            >
              Ver demo primero
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8 text-sm">
          <div>
            <h4 className="font-bold text-white mb-3">FichaEleam</h4>
            <p className="leading-relaxed">
              Digitalización de fichas clínicas y documentación SEREMI para ELEAM en Chile.
              DS 14/2017.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">Accesos</h4>
            <ul className="space-y-2">
              <li><button onClick={() => navigate("/login")} className="hover:text-white transition-colors">Iniciar sesión</button></li>
              <li><button onClick={() => navigate("/demo")} className="hover:text-white transition-colors">Ver demo</button></li>
              <li><button onClick={() => navigate("/pago")} className="hover:text-white transition-colors">Planes y precios</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">Contacto</h4>
            <p>contacto@fichaeleam.cl</p>
            <p className="mt-1">Santiago, Chile</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-800 text-xs text-center">
          © {new Date().getFullYear()} FichaEleam. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
