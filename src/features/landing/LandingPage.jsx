import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO, faqJsonLd } from "../../utils/seo";
import DemoRequestModal from "./DemoRequestModal";
import { trackEvent, useScrollDepth, useSectionView } from "./landingAnalytics";

function Icon({ d, className = "w-6 h-6" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}


const PLAN_FEATURES = [
  "Carpeta SEREMI · 14 ámbitos DS 14/2017",
  "Fichas clínicas digitales ilimitadas",
  "Signos vitales con alertas clínicas",
  "Observaciones por turno (12 tipos)",
  "Portal para familias",
  "Funcionarios y usuarios ilimitados",
  "Soporte en español incluido",
];

const PAINS = [
  { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", text: "Fiscalización SEREMI y no encuentras la mitad de los documentos requeridos." },
  { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", text: "Registros en papel que se pierden, mojan o simplemente no aparecen cuando más los necesitas." },
  { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", text: "El turno siguiente no sabe qué pasó: falta información, hay errores y el equipo pierde tiempo." },
  { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2", text: "Imposible rastrear quién hizo qué cambio y cuándo. Sin trazabilidad, sin defensa ante fiscalización." },
  { icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", text: "Cada visita de la SEREMI genera caos: hay que correr a ordenar carpetas que deberían estar siempre listas." },
];

const BENEFITS = [
  { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", title: "Carpeta SEREMI siempre lista", metric: "14 ámbitos DS 14/2017", text: "Todos los requisitos pre-cargados con estados, evidencias versionadas y alertas de vencimiento. La fiscalización no te sorprende." },
  { icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", title: "Signos vitales con alertas", metric: "Alertas automáticas en tiempo real", text: "Rangos clínicos para adultos mayores. Si un valor está fuera del rango, el equipo lo ve de inmediato." },
  { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", title: "Ficha clínica digital completa", metric: "Historial 100% trazable", text: "Diagnóstico, alergias, índice Barthel, observaciones y signos. Todo con fecha y responsable." },
  { icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z", title: "Observaciones por turno", metric: "12 tipos de observaciones", text: "Cada turno registra en su portal. El turno siguiente llega informado: qué pasó, quién lo registró y cuándo." },
  { icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197", title: "Portal para familias", metric: "Comunicación transparente", text: "Cada familiar tiene su propio portal para ver el estado de su ser querido, historial de visitas y observaciones." },
  { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", title: "Seguridad y privacidad", metric: "Datos aislados por establecimiento", text: "Cada ELEAM ve solo sus datos. Roles y permisos granulares para cada miembro del equipo." },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Solicita tu demo", text: "Completa el formulario y en menos de 24 horas te enviamos tu enlace personal de acceso al demo guiado." },
  { step: "2", title: "Explora la plataforma", text: "Ve las vistas del administrador, del funcionario y del familiar. Un especialista te guía si lo necesitas." },
  { step: "3", title: "Activa tu ELEAM", text: "Elige tu plan, paga con MercadoPago y el equipo te ayuda a migrar los datos de tus residentes." },
];

const FAQ_ITEMS = [
  { q: "¿Qué es FichaEleam?", a: "FichaEleam es el único software diseñado exclusivamente para ELEAM en Chile que cubre los 14 ámbitos del DS 14/2017. Incluye ficha clínica digital, signos vitales con alertas, observaciones de turno, Carpeta SEREMI y portal para familias." },
  { q: "¿FichaEleam cumple con el DS 14/2017?", a: "Sí. La sección Carpeta SEREMI implementa los 14 ámbitos exigidos por la SEREMI con más de 70 requisitos pre-cargados, evidencias versionadas, estados de cumplimiento y alertas de documentos vencidos." },
  { q: "¿Cuánto cuesta?", a: "La suscripción es mensual por establecimiento, sin cobros por usuario. Los planes parten desde $50.000 CLP/mes para hasta 14 residentes. Todos tus funcionarios y familiares acceden incluidos." },
  { q: "¿Cómo funciona el demo?", a: "Solicitas el demo, un especialista te envía un enlace personalizado en menos de 24 horas. Puedes explorar la plataforma completa (vistas de admin, funcionario y familiar) con datos de ejemplo." },
  { q: "¿Qué pasa si tengo una fiscalización próxima?", a: "Nuestros especialistas pueden ayudarte a organizar tu Carpeta SEREMI en 24 horas. Contáctanos directamente y te asignamos prioridad." },
  { q: "¿Los datos quedan en Chile?", a: "Sí. Usamos Supabase con servidores en la región de São Paulo (AWS), que cumple con las regulaciones de datos de América Latina. Los datos de cada ELEAM están aislados por seguridad de nivel fila (RLS)." },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Puedes cancelar tu suscripción en cualquier momento desde el panel. Mantendrás el acceso hasta el final del período pagado, sin penalidades." },
  { q: "¿Cuánto tarda la implementación?", a: "La plataforma está operativa en menos de 10 minutos. Si tienes datos en Excel o fichas en papel, nuestro equipo te ayuda con la migración inicial sin costo adicional." },
];

const PLANS = [
  { residentes: "Hasta 14",  precio: "$50.000",    tag: null,          sub: "menos de $1.700/día" },
  { residentes: "15 a 24",   precio: "$80.000",    tag: "Más elegido", sub: "menos de $2.700/día" },
  { residentes: "25 a 34",   precio: "$120.000",   tag: null,          sub: "menos de $4.000/día" },
];

export default function LandingPage() {
  const navigate   = useNavigate();
  const [modal, setModal] = useState(false);
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

  const openModal = (cta) => {
    setModalCta(cta);
    setModal(true);
    trackEvent("cta_click", cta);
  };

  useSEO({
    title: "FichaEleam · Software para ELEAM en Chile | DS 14/2017",
    description:
      "FichaEleam es el único software diseñado exclusivamente para ELEAM en Chile. Carpeta SEREMI con los 14 ámbitos del DS 14/2017, ficha clínica digital, signos vitales con alertas y portal para familias. Solicita tu demo gratuito.",
    path: "/",
    keywords: [
      "software ELEAM Chile", "DS 14/2017", "fiscalización SEREMI",
      "ficha clínica adulto mayor", "residencia adulto mayor",
      "acreditación ELEAM", "Carpeta SEREMI", "establecimiento larga estadía",
    ],
    jsonLd: faqJsonLd(FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a }))),
  });

  return (
    <div className="bg-white text-gray-800 overflow-x-hidden">

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-[var(--color-primary)] tracking-tight">FichaEleam</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { navigate("/blog"); trackEvent("nav_click", "blog"); }}
              className="hidden sm:inline-flex text-sm text-gray-600 hover:text-[var(--color-primary)] px-3 py-1.5"
            >
              Blog
            </button>
            <button
              onClick={() => {
                document.getElementById("precios")?.scrollIntoView({ behavior: "smooth" });
                trackEvent("nav_click", "precios");
              }}
              className="hidden sm:inline-flex text-sm text-gray-600 hover:text-[var(--color-primary)] px-3 py-1.5"
            >
              Precios
            </button>
            <button
              onClick={() => { navigate("/login"); trackEvent("nav_click", "login"); }}
              className="text-sm border border-[var(--color-primary)] text-[var(--color-primary)] px-4 py-1.5 rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-all"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => openModal("nav_demo_cta")}
              className="hidden sm:inline-flex text-sm bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-all font-semibold shadow-sm"
            >
              Solicitar Demo
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-accent)] to-teal-900 text-white pt-20 pb-16 px-4 overflow-hidden">
        <div className="relative max-w-6xl mx-auto">
          <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left">
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
              El software diseñado exclusivamente para ELEAM en Chile
            </span>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-6">
              Digitaliza tu ELEAM y gestiona la documentación{" "}
              <span className="text-[var(--color-secondary)]">SEREMI con orden</span>
            </h1>
            <p className="text-lg text-teal-100 mb-8 leading-relaxed">
              Carpeta DS 14/2017 completa, fichas clínicas digitales y gestión de equipo — todo en una plataforma pensada para Establecimientos de Larga Estadía.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={() => openModal("hero_primary")}
                className="bg-white text-[var(--color-primary)] font-bold py-3.5 px-8 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-base"
              >
                Solicitar Demo Gratuito
              </button>
              <button
                onClick={() => {
                  document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });
                  trackEvent("cta_click", "hero_secondary_how");
                }}
                className="border-2 border-white/60 text-white font-semibold py-3.5 px-8 rounded-xl hover:bg-white/10 transition-all text-base"
              >
                Ver cómo funciona
              </button>
            </div>
            <p className="mt-5 text-sm text-teal-200 text-center lg:text-left">
              Acceso personalizado · Sin compromiso · Respuesta en menos de 24 horas
            </p>

            <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
              {[
                "Cumple DS 14/2017 · 14 ámbitos",
                "Soporte en español",
                "30 días de prueba gratuita",
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-sm text-teal-100/90">
                  <svg className="w-4 h-4 text-emerald-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* App mockup */}
          <div className="hidden lg:block absolute right-0 top-0 w-[480px] xl:w-[540px]">
            <AppMockup />
          </div>
        </div>

        <div className="mt-10 max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs sm:text-sm text-teal-100/90 lg:hidden">
          {[
            "Cumple DS 14/2017 · 14 ámbitos",
            "Datos en Chile",
            "Soporte en español",
            "Funcionarios y familias incluidos",
          ].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── PAIN POINTS ──────────────────────────────────── */}
      <section ref={painRef} className="py-20 px-4 bg-gray-50">
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
                  <Icon d={pain.icon} className="w-3.5 h-3.5 text-red-500" />
                </div>
                <span className="text-gray-700 text-sm leading-relaxed">{pain.text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 text-center">
            <button
              onClick={() => openModal("pain_section_cta")}
              className="text-[var(--color-primary)] text-sm font-semibold underline underline-offset-2 hover:text-[var(--color-accent)] transition-colors"
            >
              ¿Te suena familiar? Agenda tu demo gratuito →
            </button>
          </div>
        </div>
      </section>

      {/* ── URGENCIA SEREMI ──────────────────────────────── */}
      <section className="py-6 px-4 bg-amber-50 border-y border-amber-200">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" className="w-5 h-5 text-amber-600" />
            </span>
            <p className="text-sm font-semibold text-amber-900">
              ¿Tienes una fiscalización SEREMI próxima?{" "}
              <span className="font-normal text-amber-800">Te ayudamos a organizar tu documentación con prioridad.</span>
            </p>
          </div>
          <button
            onClick={() => openModal("urgencia_seremi")}
            className="shrink-0 bg-amber-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-amber-700 transition-all whitespace-nowrap"
          >
            Hablar con un especialista
          </button>
        </div>
      </section>

      {/* ── BENEFICIOS ───────────────────────────────────── */}
      <section ref={benefitsRef} className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-3 text-center">
            Solución concreta
          </p>
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
            Todo lo que tu ELEAM necesita, en un solo lugar
          </h2>
          <p className="text-center text-gray-500 text-sm mb-12">
            Diseñado por personas que conocen la realidad de los ELEAM en Chile.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map(({ icon, title, metric, text }, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                  <Icon d={icon} className="w-5 h-5 text-teal-600" />
                </div>
                <p className="text-xs font-bold text-teal-600 mb-1">{metric}</p>
                <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button
              onClick={() => openModal("benefits_cta")}
              className="bg-teal-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-teal-700 transition-all shadow-sm"
            >
              Quiero una demo personalizada
            </button>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ────────────────────────────────── */}
      <section id="como-funciona" ref={howRef} className="py-20 px-4 bg-gradient-to-br from-teal-50 to-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-3 text-center">
            Simple y rápido
          </p>
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
            Tres pasos para digitalizar tu ELEAM
          </h2>
          <p className="text-center text-gray-500 text-sm mb-12">
            Tu equipo accede según su rol: el admin gestiona todo, los funcionarios registran y las familias consultan.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ step, title, text }, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-[var(--color-primary)] text-white rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-4 shadow-lg">
                  {step}
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-10 gap-3 flex-wrap">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 text-sm">
              <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-xs font-bold text-blue-600">A</span>
              <div><p className="font-semibold text-gray-700">Vista Admin</p><p className="text-gray-400 text-xs">Gestión total del ELEAM</p></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 text-sm">
              <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-xs font-bold text-green-600">F</span>
              <div><p className="font-semibold text-gray-700">Vista Funcionario</p><p className="text-gray-400 text-xs">Registros clínicos del turno</p></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 text-sm">
              <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-xs font-bold text-purple-600">Fa</span>
              <div><p className="font-semibold text-gray-700">Vista Familiar</p><p className="text-gray-400 text-xs">Portal de seguimiento</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRECIOS ──────────────────────────────────────── */}
      <section id="precios" ref={pricingRef} className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-3 text-center">
            Precios
          </p>
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
            Un precio mensual por tu ELEAM
          </h2>
          <p className="text-center text-gray-500 mb-10 text-sm">
            Sin cobros por usuario. Todos tus funcionarios y familiares incluidos.
          </p>

          {/* Features incluidas en todos los planes */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-8 shadow-sm max-w-3xl mx-auto">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">Todos los planes incluyen</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PLAN_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            {PLANS.map(({ residentes, precio, tag, sub }, i) => (
              <div
                key={i}
                className={`rounded-2xl p-6 border-2 text-center relative flex flex-col ${
                  tag
                    ? "border-teal-600 bg-teal-600 text-white shadow-xl"
                    : "border-gray-200 bg-white"
                }`}
              >
                {tag && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-800 text-white text-xs px-3 py-0.5 rounded-full font-semibold whitespace-nowrap">
                    {tag}
                  </span>
                )}
                <p className={`text-xs font-semibold mb-2 ${tag ? "text-teal-200" : "text-gray-400"}`}>
                  {residentes} residentes
                </p>
                <p className={`text-2xl font-black mb-0.5 ${tag ? "text-white" : "text-gray-800"}`}>
                  {precio}
                </p>
                <p className={`text-xs mb-1 ${tag ? "text-teal-200" : "text-gray-400"}`}>CLP / mes</p>
                <p className={`text-[11px] mb-4 ${tag ? "text-teal-300" : "text-gray-400"}`}>{sub}</p>
                <div className="mt-auto">
                  <button
                    onClick={() => openModal(`pricing_cta_plan${i + 1}`)}
                    className={`w-full font-semibold py-2 rounded-xl text-sm mt-1 transition-all ${
                      tag
                        ? "bg-white text-teal-700 hover:bg-gray-100"
                        : "border border-teal-600 text-teal-700 hover:bg-teal-50"
                    }`}
                  >
                    Comenzar demo
                  </button>
                </div>
              </div>
            ))}

            {/* Plan institucional */}
            <div className="rounded-2xl p-6 border-2 border-gray-200 bg-white text-center flex flex-col">
              <p className="text-xs font-semibold text-gray-400 mb-2">35 o más residentes</p>
              <p className="text-xl font-black text-gray-800 mb-0.5">Plan Institucional</p>
              <p className="text-xs text-gray-400 mb-4">Cotización a medida</p>
              <div className="mt-auto">
                <button
                  onClick={() => openModal("pricing_institucional")}
                  className="w-full font-semibold py-2 rounded-xl text-sm border border-teal-600 text-teal-700 hover:bg-teal-50 transition-all"
                >
                  Solicitar cotización
                </button>
              </div>
            </div>
          </div>

          {/* Banner 30 días gratis */}
          <div className="bg-teal-600 rounded-2xl p-5 max-w-2xl mx-auto text-center text-white">
            <p className="font-bold text-base mb-1">30 días de prueba gratuita en todos los planes</p>
            <p className="text-sm text-teal-100">Sin tarjeta de crédito. Sin compromiso. Cancela cuando quieras.</p>
            <button
              onClick={() => openModal("pricing_trial_banner")}
              className="mt-4 bg-white text-teal-700 font-semibold text-sm px-6 py-2 rounded-xl hover:bg-teal-50 transition-all"
            >
              Empezar prueba gratuita
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section ref={faqRef} className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-3 text-center">
            Preguntas frecuentes
          </p>
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">
            Todo lo que necesitas saber
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map(({ q, a }, i) => (
              <FaqItem key={i} q={q} a={a} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500 mb-4">¿Tienes otra pregunta?</p>
            <button
              onClick={() => openModal("faq_cta")}
              className="bg-teal-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-teal-700"
            >
              Contactar a un especialista
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gradient-to-r from-[var(--color-primary)] to-teal-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Tu ELEAM, con la documentación siempre organizada.
          </h2>
          <p className="text-teal-100 mb-2 text-base">
            Acceso personalizado. Sin compromiso. Respuesta en menos de 24 horas.
          </p>
          <p className="text-teal-200 text-sm mb-8">
            Un especialista te envía tu enlace de demo y te acompaña durante la exploración.
          </p>
          <button
            onClick={() => openModal("final_cta")}
            className="bg-white text-[var(--color-primary)] font-bold py-4 px-10 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-base"
          >
            Solicitar Demo Gratuito
          </button>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-teal-200">
            <span>¿Prefiere contacto directo?</span>
            <a
              href="mailto:contacto@fichaeleam.cl"
              className="text-white font-semibold hover:text-teal-100 transition-colors"
              onClick={() => trackEvent("cta_click", "final_email")}
            >
              contacto@fichaeleam.cl
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8 text-sm">
          <div>
            <h4 className="font-bold text-white mb-3">FichaEleam</h4>
            <p className="leading-relaxed text-xs">
              Digitalización de fichas clínicas y documentación SEREMI para Establecimientos de Larga Estadía para Adultos Mayores en Chile. DS 14/2017.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">Accesos</h4>
            <ul className="space-y-2">
              <li><button onClick={() => navigate("/login")} className="hover:text-white transition-colors text-sm">Iniciar sesión</button></li>
              <li><button onClick={() => openModal("footer_demo")} className="hover:text-white transition-colors text-sm">Solicitar demo</button></li>
              <li><button onClick={() => document.getElementById("precios")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors text-sm">Precios</button></li>
              <li><button onClick={() => navigate("/blog")} className="hover:text-white transition-colors text-sm">Blog</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">Contacto</h4>
            <p className="text-sm">contacto@fichaeleam.cl</p>
            <p className="text-sm mt-1">Santiago, Chile</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-800 text-xs text-center">
          © {new Date().getFullYear()} FichaEleam. Todos los derechos reservados.
        </div>
      </footer>

      <DemoRequestModal isOpen={modal} onClose={() => setModal(false)} defaultCta={modalCta} />
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full text-left px-5 py-4 flex justify-between items-center gap-3"
      >
        <span className="font-semibold text-gray-800 text-sm">{q}</span>
        <svg
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

function AppMockup() {
  return (
    <div className="relative">
      <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-4 shadow-2xl">
        {/* Barra de título */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
          <span className="ml-2 text-xs text-white/50 font-mono">FichaEleam · Dashboard</span>
        </div>
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: "Alertas críticas", value: "2", tone: "bg-rose-500" },
            { label: "Cobertura hoy",    value: "87%", tone: "bg-emerald-500" },
            { label: "Sin control",      value: "3",   tone: "bg-amber-500" },
            { label: "Cumplimiento SEREMI", value: "91%", tone: "bg-teal-400" },
          ].map(({ label, value, tone }) => (
            <div key={label} className="bg-white/10 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${tone}`} />
                <span className="text-[10px] text-white/60 uppercase tracking-wide">{label}</span>
              </div>
              <span className="text-xl font-black text-white">{value}</span>
            </div>
          ))}
        </div>
        {/* Lista de residentes */}
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50 uppercase tracking-wide mb-2">Residentes · estado clínico</p>
          {[
            { name: "Residente A", estado: "Normal", color: "bg-emerald-400" },
            { name: "Residente B", estado: "Atención", color: "bg-amber-400" },
            { name: "Residente C", estado: "Crítico",  color: "bg-rose-400" },
          ].map(({ name, estado, color }) => (
            <div key={name} className="flex items-center justify-between py-1.5 border-b border-white/10 last:border-0">
              <span className="text-xs text-white/80">{name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-semibold ${color}`}>{estado}</span>
            </div>
          ))}
        </div>
        {/* Barra de acreditación */}
        <div className="mt-3 bg-white/10 rounded-xl p-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-white/50 uppercase tracking-wide">Carpeta SEREMI</span>
            <span className="text-xs font-bold text-white">91%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-1.5">
            <div className="bg-teal-300 h-1.5 rounded-full" style={{ width: "91%" }} />
          </div>
          <p className="text-[10px] text-white/40 mt-1">64 de 70 requisitos al día</p>
        </div>
      </div>
    </div>
  );
}
