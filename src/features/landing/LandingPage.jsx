import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO, faqJsonLd } from "../../utils/seo";
import DemoRequestModal from "./DemoRequestModal";
import { trackEvent, useScrollDepth, useSectionView } from "./landingAnalytics";

/* ─── primitives ─────────────────────────────────────────────── */
function Icon({ d, className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}
function Check({ className = "w-4 h-4 text-teal-400 shrink-0" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

/* ─── data ───────────────────────────────────────────────────── */
const PLAN_FEATURES = [
  "Carpeta SEREMI · 14 ámbitos DS 14/2017",
  "Fichas clínicas digitales ilimitadas",
  "Signos vitales con alertas clínicas",
  "Observaciones por turno (12 tipos)",
  "Portal para familias incluido",
  "Funcionarios y usuarios ilimitados",
  "Soporte en español incluido",
];

const PAINS = [
  { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", text: "Fiscalización SEREMI y no encuentras la mitad de los documentos requeridos." },
  { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", text: "Registros en papel que se pierden o no aparecen cuando más los necesitas." },
  { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", text: "El turno siguiente llega sin saber qué pasó. El equipo pierde tiempo y comete errores." },
  { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2", text: "Imposible rastrear quién hizo qué cambio y cuándo. Sin trazabilidad no hay defensa." },
  { icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", text: "Cada visita de la SEREMI genera caos: carpetas desordenadas, tiempo perdido, estrés." },
];

const COMPARISON_ROWS = [
  { antes: "Buscar un documento entre carpetas físicas consume horas del equipo",               despues: "Documentación digital organizada, accesible por ámbito o residente en segundos" },
  { antes: "El turno siguiente llega sin saber qué ocurrió con cada residente",                despues: "Signos y observaciones del turno anterior visibles al instante" },
  { antes: "Nadie sabe quién modificó un registro ni cuándo — sin trazabilidad",               despues: "Auditoría completa: acción, usuario, fecha y hora de cada cambio" },
  { antes: "Una visita SEREMI implica correr a ordenar lo que debería estar siempre listo",    despues: "70+ requisitos organizados con estado y alertas automáticas de vencimiento" },
  { antes: "Las familias llaman para saber cómo está su familiar",                             despues: "Portal propio con estado actualizado, historial y registro de visitas" },
];

const BENEFITS = [
  { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",        title: "Carpeta SEREMI siempre organizada",   metric: "14 ámbitos · 70+ requisitos DS 14/2017",           text: "Todos los requisitos pre-cargados con estados, evidencias versionadas y alertas de vencimiento." },
  { icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", title: "Signos vitales con alertas",            metric: "Rangos clínicos para adultos mayores",               text: "Si un valor está fuera del rango seguro, el equipo lo ve de inmediato, turno a turno." },
  { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", title: "Ficha clínica digital completa",        metric: "Historial 100% trazable",                           text: "Diagnóstico, alergias, índice Barthel, observaciones y signos. Todo con fecha y responsable." },
  { icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z", title: "Observaciones por turno",              metric: "12 tipos de observación disponibles",               text: "Cada turno registra en su portal. El siguiente llega informado: qué pasó, quién y cuándo." },
  { icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197",                    title: "Portal para familias",                 metric: "Comunicación transparente, sin llamadas",            text: "Cada familiar consulta el estado de su ser querido, historial de visitas y observaciones." },
  { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", title: "Seguridad y privacidad",               metric: "Datos aislados por establecimiento",                text: "Cada ELEAM ve solo sus datos. Roles y permisos granulares para cada miembro del equipo." },
];

const TRUST_SIGNALS = [
  { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", title: "DS 14/2017 completo",        text: "14 ámbitos y 70+ requisitos del catálogo oficial SEREMI, pre-cargados.",     color: "text-emerald-400" },
  { icon: "M13 10V3L4 14h7v7l9-11h-7z",                                                                          title: "Operativo en < 10 min",     text: "Sin instalaciones ni configuración técnica. El equipo accede desde el día uno.", color: "text-sky-400" },
  { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", title: "Soporte en español",        text: "Especialistas que entienden la operación diaria de los ELEAM en Chile.",      color: "text-violet-400" },
  { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", title: "Datos aislados por ELEAM",  text: "Seguridad nivel fila: cada establecimiento accede solo a su información.",     color: "text-amber-400" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Solicita tu demo",       text: "Completa el formulario. En menos de 24 horas te enviamos tu acceso personalizado." },
  { step: "02", title: "Explora sin límites",    text: "Ve las vistas de admin, funcionario y familiar con datos de ejemplo. Un especialista te acompaña." },
  { step: "03", title: "Activa y digitaliza",    text: "Elige tu plan, activa con MercadoPago y el equipo te ayuda a cargar los datos iniciales sin costo." },
];

const PERSONAS = [
  { rol: "Director/a o Administrador/a",                icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2",                        color: "bg-sky-500",     ring: "ring-sky-100",    wins: ["Panel unificado: residentes, equipo y Carpeta SEREMI", "Control de pagos y suscripción integrado", "Carpeta SEREMI organizada sin depender del equipo clínico"] },
  { rol: "Equipo clínico",                              icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", color: "bg-teal-500",    ring: "ring-teal-100",   wins: ["Registra signos y observaciones en segundos por turno", "Alertas automáticas si un valor está fuera de rango", "Ve el historial completo del residente en un vistazo"] },
  { rol: "Familia del residente",                       icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197",                                                color: "bg-violet-500",  ring: "ring-violet-100", wins: ["Portal propio con el estado actualizado de su familiar", "Historial de visitas y observaciones recientes", "Comunicación transparente con el establecimiento"] },
];

const FAQ_ITEMS = [
  { q: "¿Qué es FichaEleam?",                                     a: "FichaEleam es un software diseñado exclusivamente para ELEAM en Chile que cubre los 14 ámbitos del DS 14/2017. Incluye ficha clínica digital, signos vitales con alertas, observaciones de turno, Carpeta SEREMI y portal para familias — todo en una sola plataforma." },
  { q: "¿FichaEleam cumple con el DS 14/2017?",                   a: "Sí. La sección Carpeta SEREMI implementa los 14 ámbitos con más de 70 requisitos pre-cargados, evidencias versionadas, estados de cumplimiento y alertas de documentos vencidos." },
  { q: "¿Cuánto cuesta?",                                         a: "La suscripción es mensual por establecimiento, sin cobros por usuario. Los planes parten desde $50.000 CLP/mes para hasta 14 residentes. Todos tus funcionarios y familiares acceden incluidos." },
  { q: "¿Cómo funciona el demo?",                                 a: "Solicitas el demo, un especialista te envía un enlace personalizado en menos de 24 horas. Puedes explorar la plataforma completa con datos de ejemplo, sin compromiso." },
  { q: "¿Cuánto tarda el equipo en aprender a usarla?",           a: "La interfaz está diseñada para equipos sin experiencia técnica previa. Cada rol accede solo a lo que le corresponde, lo que simplifica el aprendizaje. La mayoría opera con fluidez desde el primer día." },
  { q: "¿Qué pasa si tengo datos en papel o Excel?",              a: "Te acompañamos en la migración inicial sin costo adicional. Cargamos los datos básicos de tus residentes para que el equipo parta con la plataforma al día desde el primer momento." },
  { q: "¿Puedo exportar mis datos si decido salir?",              a: "Sí. Tus datos son tuyos. Puedes exportar fichas, registros clínicos y documentación en cualquier momento desde el panel, sin depender de nuestro equipo." },
  { q: "¿Qué pasa si tengo una fiscalización próxima?",           a: "Nuestros especialistas pueden ayudarte a organizar tu documentación con prioridad. Contáctanos directamente y te asignamos atención preferente." },
  { q: "¿Los datos quedan en Chile?",                             a: "Usamos Supabase con servidores en la región de São Paulo (AWS), que cumple con las regulaciones de datos de América Latina. Los datos de cada ELEAM están aislados por seguridad de nivel fila (RLS)." },
  { q: "¿Puedo cancelar cuando quiera?",                          a: "Sí. Puedes cancelar en cualquier momento desde el panel. Mantendrás el acceso hasta el final del período pagado, sin penalidades." },
  { q: "¿Cuánto tarda la implementación?",                        a: "La plataforma está operativa en menos de 10 minutos. Si tienes datos en Excel o fichas en papel, el equipo te ayuda con la migración inicial sin costo adicional." },
];

const PLANS = [
  { residentes: "Hasta 14",  precio: "$50.000",  tag: null,          sub: "menos de $1.700 / día" },
  { residentes: "15 a 24",   precio: "$80.000",  tag: "Más elegido", sub: "menos de $2.700 / día" },
  { residentes: "25 a 34",   precio: "$120.000", tag: null,          sub: "menos de $4.000 / día" },
];

const DEMO_STEPS = [
  { n: "01", text: "Completas el formulario con los datos de tu ELEAM" },
  { n: "02", text: "Un especialista te contacta en menos de 24 horas" },
  { n: "03", text: "Exploras la plataforma completa, sin compromiso" },
];

/* ─── main component ─────────────────────────────────────────── */
export default function LandingPage() {
  const navigate  = useNavigate();
  const [modal, setModal]     = useState(false);
  const [modalCta, setModalCta] = useState(null);

  const painRef     = useRef(null);
  const benefitsRef = useRef(null);
  const howRef      = useRef(null);
  const pricingRef  = useRef(null);
  const faqRef      = useRef(null);

  useScrollDepth();
  useSectionView(painRef,     "pain_points");
  useSectionView(benefitsRef, "benefits");
  useSectionView(howRef,      "how_it_works");
  useSectionView(pricingRef,  "pricing");
  useSectionView(faqRef,      "faq");

  const openModal = (cta) => { setModalCta(cta); setModal(true); trackEvent("cta_click", cta); };

  useSEO({
    title: "FichaEleam · Software para ELEAM en Chile | DS 14/2017",
    description: "FichaEleam es el software diseñado para ELEAM en Chile. Carpeta SEREMI con los 14 ámbitos del DS 14/2017, ficha clínica digital, signos vitales con alertas y portal para familias. 30 días de prueba gratuita.",
    path: "/",
    keywords: ["software ELEAM Chile", "DS 14/2017", "fiscalización SEREMI", "ficha clínica adulto mayor", "residencia adulto mayor", "acreditación ELEAM", "Carpeta SEREMI", "establecimiento larga estadía"],
    jsonLd: faqJsonLd(FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a }))),
  });

  return (
    <div className="bg-white text-slate-800 overflow-x-hidden">

      {/* ═══ NAV ════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-white tracking-tight">
            Ficha<span className="text-teal-400">Eleam</span>
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => { navigate("/blog"); trackEvent("nav_click", "blog"); }}
              className="hidden sm:inline-flex text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
              Blog
            </button>
            <button onClick={() => { document.getElementById("precios")?.scrollIntoView({ behavior: "smooth" }); trackEvent("nav_click", "precios"); }}
              className="hidden sm:inline-flex text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
              Precios
            </button>
            <button onClick={() => { navigate("/login"); trackEvent("nav_click", "login"); }}
              className="text-sm text-slate-300 border border-white/20 px-4 py-1.5 rounded-lg hover:border-white/40 hover:text-white transition-all ml-1">
              Iniciar sesión
            </button>
            <button onClick={() => openModal("nav_demo_cta")}
              className="hidden sm:inline-flex text-sm bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-400 transition-all font-semibold shadow-lg shadow-teal-500/20 ml-1">
              Solicitar Demo
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ════════════════════════════════════════════════ */}
      <section className="relative bg-slate-950 text-white overflow-hidden min-h-[92vh] flex items-center">
        {/* Background layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_-20%,rgba(20,184,166,0.25),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_100%_80%,rgba(16,185,129,0.08),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        {/* Decorative blobs */}
        <div className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-48 rounded-full bg-emerald-500/8 blur-2xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-5 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold px-4 py-2 rounded-full mb-8 tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Diseñado exclusivamente para ELEAM en Chile
              </div>

              <h1 className="text-5xl sm:text-6xl font-black leading-[1.05] tracking-tight mb-6">
                La documentación
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">
                  DS 14/2017
                </span>
                <br />
                siempre al día.
              </h1>

              <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-xl">
                70+ requisitos SEREMI pre-cargados, fichas clínicas digitales y alertas automáticas — todo en una plataforma construida sobre la normativa chilena.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <button onClick={() => openModal("hero_primary")}
                  className="bg-teal-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-teal-500/30 hover:bg-teal-400 hover:-translate-y-0.5 transition-all text-base">
                  Solicitar Demo Gratuito
                </button>
                <button onClick={() => { document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" }); trackEvent("cta_click", "hero_secondary_how"); }}
                  className="border border-white/20 text-slate-300 font-semibold py-4 px-8 rounded-xl hover:bg-white/5 hover:border-white/30 transition-all text-base">
                  Ver cómo funciona
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-6">
                Sin tarjeta de crédito · 30 días gratis · Respuesta en menos de 24 h
              </p>

              <div className="flex flex-wrap gap-4">
                {["14 ámbitos DS 14/2017", "Soporte en español", "< 10 min para empezar"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Mockup */}
            <div className="hidden lg:block">
              <AppMockup />
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />
      </section>

      {/* ═══ PAIN POINTS ════════════════════════════════════════ */}
      <section ref={painRef} className="py-24 px-5 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3">¿Te suena familiar?</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
              Esto pasa en la mayoría
              <br className="hidden sm:block" /> de los ELEAM hoy
            </h2>
          </div>

          <ul className="space-y-3">
            {PAINS.map((pain, i) => (
              <li key={i} className="group flex items-start gap-5 bg-white rounded-2xl p-5 border border-slate-100 hover:border-red-100 hover:shadow-md transition-all duration-200">
                <div className="mt-0.5 w-9 h-9 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
                  <Icon d={pain.icon} className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-slate-700 text-sm leading-relaxed pt-1.5">{pain.text}</p>
              </li>
            ))}
          </ul>

          {/* Consecuencia */}
          <div className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/50 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="relative flex gap-4 items-start">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <Icon d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-sm text-red-800 leading-relaxed">
                <strong>Una observación SEREMI no resuelta puede escalar a objeción formal.</strong> La documentación dispersa no solo genera incomodidad — compromete la acreditación y la continuidad del establecimiento.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => openModal("pain_cta")}
              className="text-teal-600 text-sm font-semibold hover:text-teal-500 transition-colors inline-flex items-center gap-1.5">
              ¿Te suena familiar? Agenda tu demo gratuito
              <Icon d="M17 8l4 4m0 0l-4 4m4-4H3" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ ANTES VS. AHORA ════════════════════════════════════ */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3">La diferencia en la práctica</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Sin FichaEleam vs. Con FichaEleam
            </h2>
            <p className="mt-3 text-slate-500 text-sm">La misma situación. Dos resultados completamente distintos.</p>
          </div>

          {/* Comparison table */}
          <div className="grid grid-cols-2 rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
            {/* Headers */}
            <div className="bg-slate-100 px-6 py-4 flex items-center gap-3 border-b border-slate-200">
              <span className="w-6 h-6 rounded-lg bg-slate-300 flex items-center justify-center text-slate-600 text-xs font-black">✕</span>
              <span className="text-sm font-bold text-slate-500">Sin FichaEleam</span>
            </div>
            <div className="bg-teal-600 px-6 py-4 flex items-center gap-3 border-b border-teal-500">
              <span className="w-6 h-6 rounded-lg bg-teal-400/30 flex items-center justify-center text-white text-xs font-black">✓</span>
              <span className="text-sm font-bold text-white">Con FichaEleam</span>
            </div>

            {COMPARISON_ROWS.map(({ antes, despues }, i) => (
              <React.Fragment key={i}>
                <div className={`flex items-start gap-3 px-6 py-5 text-sm text-slate-500 leading-relaxed border-b border-slate-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}>
                  <span className="text-red-300 shrink-0 mt-0.5 font-bold text-base">✕</span>
                  <span>{antes}</span>
                </div>
                <div className={`flex items-start gap-3 px-6 py-5 text-sm text-teal-800 leading-relaxed border-b border-teal-100/60 last:border-0 ${i % 2 === 0 ? "bg-teal-50/40" : "bg-teal-50/70"}`}>
                  <span className="text-teal-500 shrink-0 mt-0.5 font-bold text-base">✓</span>
                  <span>{despues}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => openModal("comparison_cta")}
              className="bg-teal-600 text-white font-bold py-3.5 px-10 rounded-xl hover:bg-teal-500 transition-all shadow-lg shadow-teal-600/20">
              Quiero ver el demo en vivo
            </button>
            <p className="text-xs text-slate-400 mt-2">Sin tarjeta de crédito · 30 días gratis</p>
          </div>
        </div>
      </section>

      {/* ═══ URGENCIA SEREMI ════════════════════════════════════ */}
      <div className="bg-amber-50 border-y border-amber-200 px-5 py-5">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-amber-900">
              ¿Fiscalización SEREMI próxima?{" "}
              <span className="font-normal text-amber-800">Te ayudamos a organizar tu documentación con prioridad.</span>
            </p>
          </div>
          <button onClick={() => openModal("urgencia_seremi")}
            className="shrink-0 bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-700 transition-all whitespace-nowrap shadow-sm">
            Hablar con un especialista
          </button>
        </div>
      </div>

      {/* ═══ BENEFICIOS (BENTO GRID) ════════════════════════════ */}
      <section ref={benefitsRef} className="py-24 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3">Solución completa</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Todo lo que tu ELEAM necesita,
              <br className="hidden sm:block" /> en un solo lugar
            </h2>
            <p className="mt-4 text-slate-500 text-sm max-w-lg mx-auto">
              Construido sobre la normativa DS 14/2017. Sin adaptaciones genéricas — cada módulo refleja la operación real de un establecimiento de larga estadía.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Card 0: Carpeta SEREMI — featured, spans 2 cols */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-slate-800 text-white p-8 flex flex-col justify-between min-h-56">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
              <div className="absolute bottom-0 left-1/4 w-32 h-32 rounded-full bg-teal-400/10 translate-y-1/2 pointer-events-none" />
              <div className="relative">
                <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center mb-4">
                  <Icon d={BENEFITS[0].icon} className="w-5 h-5 text-white" />
                </div>
                <p className="text-teal-300 text-xs font-bold uppercase tracking-widest mb-1.5">{BENEFITS[0].metric}</p>
                <h3 className="text-xl font-bold mb-2">{BENEFITS[0].title}</h3>
                <p className="text-teal-100/80 text-sm leading-relaxed max-w-md">{BENEFITS[0].text}</p>
              </div>
              <div className="relative mt-6 flex gap-2 flex-wrap">
                {["Evidencias versionadas", "Alertas de vencimiento", "Estados por requisito"].map((tag) => (
                  <span key={tag} className="text-[11px] bg-white/15 px-3 py-1 rounded-full text-teal-100">{tag}</span>
                ))}
              </div>
            </div>

            {/* Card 1: Signos Vitales */}
            <div className="group relative overflow-hidden rounded-3xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:shadow-lg p-7 flex flex-col transition-all duration-200">
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                <Icon d={BENEFITS[1].icon} className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-1.5">{BENEFITS[1].metric}</p>
              <h3 className="font-bold text-slate-800 mb-2">{BENEFITS[1].title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{BENEFITS[1].text}</p>
            </div>

            {/* Cards 2–4: uniform */}
            {BENEFITS.slice(2, 5).map(({ icon, title, metric, text }, i) => (
              <div key={i} className="group relative overflow-hidden rounded-3xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:shadow-lg p-7 flex flex-col transition-all duration-200">
                <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
                  <Icon d={icon} className="w-5 h-5 text-teal-600" />
                </div>
                <p className="text-teal-600 text-xs font-bold uppercase tracking-widest mb-1.5">{metric}</p>
                <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
              </div>
            ))}

            {/* Card 5: Seguridad — dark accent */}
            <div className="group relative overflow-hidden rounded-3xl bg-slate-900 text-white p-7 flex flex-col transition-all duration-200 hover:bg-slate-800">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-teal-500/10 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative">
                <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon d={BENEFITS[5].icon} className="w-5 h-5 text-teal-400" />
                </div>
                <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-1.5">{BENEFITS[5].metric}</p>
                <h3 className="font-bold text-white mb-2">{BENEFITS[5].title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{BENEFITS[5].text}</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <button onClick={() => openModal("benefits_cta")}
              className="bg-slate-900 text-white font-bold py-3.5 px-10 rounded-xl hover:bg-slate-800 transition-all shadow-lg">
              Ver demo personalizado
            </button>
          </div>
        </div>
      </section>

      {/* ═══ PARA QUIÉN ES ══════════════════════════════════════ */}
      <section className="py-24 px-5 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3">Para cada rol del ELEAM</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Una plataforma que sirve a todo el equipo
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PERSONAS.map(({ rol, icon, color, ring, wins }) => (
              <div key={rol} className={`bg-white rounded-3xl border-2 ${ring} border-transparent hover:border-current p-7 shadow-sm hover:shadow-md transition-all duration-200`}>
                <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-5`}>
                  <Icon d={icon} className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-800 mb-4 text-sm leading-snug">{rol}</h3>
                <ul className="space-y-2.5">
                  {wins.map((w) => (
                    <li key={w} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SEÑALES DE CONFIANZA (DARK) ════════════════════════ */}
      <section className="py-20 px-5 bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-10">Por qué confiar en FichaEleam</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {TRUST_SIGNALS.map(({ icon, title, text, color }) => (
              <div key={title} className="group text-center">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-white/10 transition-colors">
                  <Icon d={icon} className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="font-bold text-white text-sm mb-2">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CÓMO FUNCIONA ══════════════════════════════════════ */}
      <section id="como-funciona" ref={howRef} className="py-24 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3">Simple y rápido</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Tres pasos para digitalizar tu ELEAM
            </h2>
            <p className="mt-4 text-slate-500 text-sm">
              Tu equipo accede según su rol: el admin gestiona todo, los funcionarios registran y las familias consultan.
            </p>
          </div>

          {/* Steps */}
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Connector line (desktop) */}
            <div className="hidden sm:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-teal-200 via-teal-300 to-teal-200 pointer-events-none" />

            {HOW_IT_WORKS.map(({ step, title, text }, i) => (
              <div key={i} className="relative text-center group">
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 text-white text-xl font-black mb-5 shadow-lg shadow-teal-600/30 group-hover:bg-teal-500 transition-colors">
                  {step}
                  <div className="absolute inset-0 rounded-2xl bg-teal-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* Role pills */}
          <div className="flex justify-center mt-12 gap-4 flex-wrap">
            {[
              { letter: "A", label: "Vista Admin",      sub: "Gestión total del ELEAM",     bg: "bg-sky-100",    text: "text-sky-700" },
              { letter: "F", label: "Vista Funcionario", sub: "Registros clínicos del turno", bg: "bg-teal-100",   text: "text-teal-700" },
              { letter: "Fa", label: "Vista Familiar",   sub: "Portal de seguimiento",       bg: "bg-violet-100", text: "text-violet-700" },
            ].map(({ letter, label, sub, bg, text }) => (
              <div key={label} className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 flex items-center gap-3">
                <span className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center text-xs font-bold ${text}`}>{letter}</span>
                <div>
                  <p className={`font-semibold ${text} text-sm`}>{label}</p>
                  <p className="text-slate-400 text-xs">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRECIOS ════════════════════════════════════════════ */}
      <section id="precios" ref={pricingRef} className="py-24 px-5 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3">Precios</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Un precio mensual por tu ELEAM
            </h2>
            <p className="mt-4 text-slate-500 text-sm">
              Sin cobros por usuario. Todos tus funcionarios y familiares incluidos en cualquier plan.
            </p>
          </div>

          {/* Features incluidas */}
          <div className="bg-white border border-slate-100 rounded-2xl p-7 mb-8 shadow-sm max-w-3xl mx-auto">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 text-center">Todos los planes incluyen</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PLAN_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-teal-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            {PLANS.map(({ residentes, precio, tag, sub }, i) => (
              <div key={i} className={`relative rounded-2xl p-7 flex flex-col text-center ${
                tag ? "bg-teal-600 text-white shadow-2xl shadow-teal-600/30 ring-2 ring-teal-500 ring-offset-2" : "bg-white border border-slate-200"
              }`}>
                {tag && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-800 text-white text-[11px] px-3 py-0.5 rounded-full font-bold whitespace-nowrap">
                    {tag}
                  </span>
                )}
                <p className={`text-xs font-semibold mb-3 ${tag ? "text-teal-200" : "text-slate-400"}`}>
                  {residentes} residentes
                </p>
                <p className={`text-3xl font-black mb-0.5 ${tag ? "text-white" : "text-slate-800"}`}>{precio}</p>
                <p className={`text-xs mb-1 ${tag ? "text-teal-200" : "text-slate-400"}`}>CLP / mes</p>
                <p className={`text-[11px] mb-6 ${tag ? "text-teal-300" : "text-slate-400"}`}>{sub}</p>
                <div className="mt-auto">
                  <button onClick={() => openModal(`pricing_cta_plan${i + 1}`)}
                    className={`w-full font-semibold py-2.5 rounded-xl text-sm transition-all ${
                      tag ? "bg-white text-teal-700 hover:bg-teal-50" : "border border-teal-600 text-teal-700 hover:bg-teal-50"
                    }`}>
                    Comenzar demo
                  </button>
                </div>
              </div>
            ))}

            {/* Institucional */}
            <div className="rounded-2xl p-7 border border-slate-200 bg-white flex flex-col text-center">
              <p className="text-xs font-semibold text-slate-400 mb-3">35 o más residentes</p>
              <p className="text-xl font-black text-slate-800 mb-0.5">Institucional</p>
              <p className="text-xs text-slate-400 mb-6">Cotización a medida</p>
              <div className="mt-auto">
                <button onClick={() => openModal("pricing_institucional")}
                  className="w-full font-semibold py-2.5 rounded-xl text-sm border border-teal-600 text-teal-700 hover:bg-teal-50 transition-all">
                  Solicitar cotización
                </button>
              </div>
            </div>
          </div>

          {/* Garantía */}
          <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-7 max-w-2xl mx-auto text-center text-white">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(20,184,166,0.2),transparent)] pointer-events-none" />
            <div className="relative">
              <p className="font-bold text-base mb-1">30 días de prueba gratuita en todos los planes</p>
              <p className="text-sm text-slate-400 mb-1">Sin tarjeta de crédito. Sin compromiso.</p>
              <p className="text-xs text-slate-500 mb-5">Si en 30 días no es para tu ELEAM, cancelas sin preguntas.</p>
              <button onClick={() => openModal("pricing_trial_banner")}
                className="bg-teal-500 text-white font-semibold text-sm px-8 py-2.5 rounded-xl hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/30">
                Empezar prueba gratuita
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ════════════════════════════════════════════════ */}
      <section ref={faqRef} className="py-24 px-5 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3">Preguntas frecuentes</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Todo lo que necesitas saber</h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map(({ q, a }, i) => <FaqItem key={i} q={q} a={a} />)}
          </div>
          <div className="mt-12 text-center">
            <p className="text-sm text-slate-500 mb-4">¿Tienes otra pregunta?</p>
            <button onClick={() => openModal("faq_cta")}
              className="bg-teal-600 text-white font-semibold px-8 py-3 rounded-xl text-sm hover:bg-teal-500 transition-all shadow-sm">
              Contactar a un especialista
            </button>
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-slate-950 py-28 px-5 text-white text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(20,184,166,0.15),transparent)] pointer-events-none" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border border-teal-500/10 pointer-events-none" />
        <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full border border-teal-500/10 pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full border border-teal-500/10 pointer-events-none" />

        <div className="relative max-w-2xl mx-auto">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-[0.2em] mb-4">Empieza hoy</p>
          <h2 className="text-4xl sm:text-5xl font-black mb-5 leading-tight">
            Tu ELEAM con la documentación
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">
              siempre organizada.
            </span>
          </h2>
          <p className="text-slate-400 mb-3 text-base">
            30 días gratis · Sin tarjeta de crédito · Sin compromiso
          </p>
          <p className="text-slate-500 text-sm mb-10">
            Un especialista te envía tu acceso y te acompaña durante la exploración.
          </p>

          <button onClick={() => openModal("final_cta")}
            className="bg-teal-500 text-white font-bold py-4 px-12 rounded-2xl shadow-2xl shadow-teal-500/30 hover:bg-teal-400 hover:-translate-y-0.5 transition-all text-base">
            Solicitar Demo Gratuito
          </button>

          {/* Demo steps */}
          <div className="mt-14 grid sm:grid-cols-3 gap-6 text-left max-w-lg mx-auto">
            {DEMO_STEPS.map(({ n, text }) => (
              <div key={n} className="flex gap-3.5 items-start">
                <span className="text-2xl font-black text-white/20 leading-none tabular-nums">{n}</span>
                <p className="text-sm text-slate-400 leading-relaxed pt-0.5">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
            <span className="text-slate-500">¿Prefiere contacto directo?</span>
            <a href="mailto:contacto@fichaeleam.cl"
              className="text-teal-400 font-semibold hover:text-teal-300 transition-colors"
              onClick={() => trackEvent("cta_click", "final_email")}>
              contacto@fichaeleam.cl
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═════════════════════════════════════════════ */}
      <footer className="bg-slate-950 border-t border-white/5 text-slate-500 py-14 px-5">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-10 text-sm">
          <div>
            <span className="text-lg font-bold text-white tracking-tight block mb-3">
              Ficha<span className="text-teal-400">Eleam</span>
            </span>
            <p className="leading-relaxed text-xs text-slate-600">
              Digitalización de fichas clínicas y documentación SEREMI para Establecimientos de Larga Estadía para Adultos Mayores en Chile. DS 14/2017.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-widest">Accesos</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Iniciar sesión", onClick: () => navigate("/login") },
                { label: "Solicitar demo", onClick: () => openModal("footer_demo") },
                { label: "Precios", onClick: () => document.getElementById("precios")?.scrollIntoView({ behavior: "smooth" }) },
                { label: "Blog", onClick: () => navigate("/blog") },
              ].map(({ label, onClick }) => (
                <li key={label}>
                  <button onClick={onClick} className="hover:text-white transition-colors text-sm">
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-widest">Contacto</h4>
            <p className="text-sm">contacto@fichaeleam.cl</p>
            <p className="text-sm mt-1.5">Santiago, Chile</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/5 text-xs text-center text-slate-700">
          © {new Date().getFullYear()} FichaEleam. Todos los derechos reservados.
        </div>
      </footer>

      <DemoRequestModal isOpen={modal} onClose={() => setModal(false)} defaultCta={modalCta} />
    </div>
  );
}

/* ─── FaqItem ────────────────────────────────────────────────── */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${open ? "border-teal-200 shadow-sm" : "border-slate-100 bg-white"}`}>
      <button onClick={() => setOpen((p) => !p)}
        className="w-full text-left px-6 py-5 flex justify-between items-center gap-4">
        <span className="font-semibold text-slate-800 text-sm">{q}</span>
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${open ? "bg-teal-100 rotate-180" : "bg-slate-100"}`}>
          <Icon d="M19 9l-7 7-7-7" className={`w-3.5 h-3.5 ${open ? "text-teal-600" : "text-slate-400"}`} />
        </div>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

/* ─── AppMockup ──────────────────────────────────────────────── */
function AppMockup() {
  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute inset-0 bg-teal-500/20 blur-3xl scale-75 rounded-3xl pointer-events-none" />

      {/* Browser frame */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-800/80 backdrop-blur">
        {/* Title bar */}
        <div className="bg-slate-900/90 border-b border-white/5 px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-400/60" />
            <span className="w-3 h-3 rounded-full bg-amber-400/60" />
            <span className="w-3 h-3 rounded-full bg-emerald-400/60" />
          </div>
          <div className="flex-1 bg-white/5 rounded-md px-3 py-1 flex items-center gap-2">
            <Icon d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" className="w-3 h-3 text-teal-400 shrink-0" />
            <span className="text-[10px] text-white/30 font-mono">fichaeleam.cl/dashboard</span>
          </div>
        </div>

        {/* App content */}
        <div className="p-4 space-y-3">
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Alertas críticas",    value: "2",   dot: "bg-rose-500",    ring: "bg-rose-500/10" },
              { label: "Cobertura hoy",       value: "87%", dot: "bg-emerald-400", ring: "bg-emerald-400/10" },
              { label: "Sin control",         value: "3",   dot: "bg-amber-400",   ring: "bg-amber-400/10" },
              { label: "Cumplimiento SEREMI", value: "91%", dot: "bg-teal-400",    ring: "bg-teal-400/10" },
            ].map(({ label, value, dot, ring }) => (
              <div key={label} className={`${ring} rounded-xl p-3 border border-white/5`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  <span className="text-[9px] text-white/50 uppercase tracking-wide">{label}</span>
                </div>
                <span className="text-xl font-black text-white">{value}</span>
              </div>
            ))}
          </div>

          {/* Residents */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[9px] text-white/40 uppercase tracking-widest mb-2.5">Residentes · estado clínico</p>
            {[
              { name: "Residente A", estado: "Normal",   color: "bg-emerald-400" },
              { name: "Residente B", estado: "Atención", color: "bg-amber-400" },
              { name: "Residente C", estado: "Crítico",  color: "bg-rose-400" },
            ].map(({ name, estado, color }) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-[8px] text-white/60 font-bold">{name[10]}</span>
                  </div>
                  <span className="text-xs text-white/70">{name}</span>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full text-white font-semibold ${color}`}>{estado}</span>
              </div>
            ))}
          </div>

          {/* SEREMI progress */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5">
                <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-3 h-3 text-teal-400" />
                <span className="text-[9px] text-white/40 uppercase tracking-widest">Carpeta SEREMI</span>
              </div>
              <span className="text-xs font-bold text-teal-300">91%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 mb-1.5">
              <div className="bg-gradient-to-r from-teal-400 to-emerald-400 h-1.5 rounded-full" style={{ width: "91%" }} />
            </div>
            <p className="text-[9px] text-white/30">64 de 70 requisitos al día</p>
          </div>
        </div>
      </div>
    </div>
  );
}
