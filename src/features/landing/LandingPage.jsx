import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO, faqJsonLd } from "../../utils/seo";
import DemoRequestModal from "./DemoRequestModal";
import WhatsAppLeadButton from "./WhatsAppLeadButton";
import WhatsAppLeadModal from "./WhatsAppLeadModal";
import { trackEvent, usePageView, useScrollDepth, useSectionView } from "./landingAnalytics";
import { PUBLIC_PLAN_CATALOG, formatPlanPrice } from "../payment/planCatalog";

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

const FEATURES = [
  {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    metric: "14 ámbitos · 70+ requisitos",
    title: "Carpeta SEREMI DS 14/2017",
    text: "Todos los requisitos del catálogo oficial pre-cargados con estados, evidencias versionadas y alertas automáticas de vencimiento.",
  },
  {
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    metric: "Rangos clínicos para adulto mayor",
    title: "Signos vitales con alertas",
    text: "Presión, temperatura, saturación, glucosa y más. Si un valor sale del rango seguro, el equipo lo ve al instante, turno a turno.",
  },
  {
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    metric: "100% trazable",
    title: "Ficha clínica digital",
    text: "Diagnóstico, alergias, índice Barthel y ciclo de vida de cada residente. Cada cambio queda registrado con fecha y responsable.",
  },
  {
    icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
    metric: "12 tipos de observación",
    title: "Observaciones por turno",
    text: "El equipo registra su turno en el portal. El siguiente llega informado de qué ocurrió, quién actuó y cuándo — sin reuniones ni llamadas.",
  },
  {
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197",
    metric: "Comunicación transparente",
    title: "Portal para familias",
    text: "Cada familiar consulta el estado de su ser querido, historial de visitas y últimas observaciones desde su propio acceso.",
  },
  {
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    metric: "Datos aislados por ELEAM",
    title: "Seguridad y privacidad",
    text: "Roles y permisos granulares. Cada establecimiento accede solo a su información — jamás a la de otros ELEAM.",
  },
];

const CHALLENGES = [
  {
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    text: "La documentación está dispersa en papel, carpetas físicas y archivos Excel que nadie actualiza de forma consistente.",
  },
  {
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    text: "El turno siguiente llega sin saber qué ocurrió. El equipo pierde tiempo reconstruyendo información que ya debería estar disponible.",
  },
  {
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2",
    text: "Sin trazabilidad es imposible saber quién modificó un registro ni cuándo, lo que complica cualquier proceso de auditoría o revisión.",
  },
  {
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    text: "Los 70+ requisitos del DS 14/2017 son difíciles de mantener organizados sin una herramienta construida específicamente para ese fin.",
  },
  {
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197",
    text: "Las familias llaman para saber el estado de su familiar. El equipo clínico atiende consultas que podrían resolverse con acceso directo.",
  },
];

const ROLES = [
  {
    role: "Director/a o Administrador/a",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2",
    color: "bg-sky-500",
    wins: [
      "Panel unificado con residentes, equipo y Carpeta SEREMI",
      "Visibilidad completa del estado clínico de cada residente",
      "Control de suscripción y permisos desde un solo lugar",
    ],
  },
  {
    role: "Equipo clínico",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    color: "bg-teal-500",
    wins: [
      "Registra signos y observaciones en segundos desde cualquier dispositivo",
      "Alertas automáticas cuando un valor está fuera del rango seguro",
      "Historial completo del residente disponible de un vistazo",
    ],
  },
  {
    role: "Familia del residente",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197",
    color: "bg-violet-500",
    wins: [
      "Portal propio con el estado actualizado de su familiar",
      "Historial de visitas y últimas observaciones del equipo",
      "Comunicación transparente con el establecimiento, sin llamadas",
    ],
  },
];

const PLAN_FEATURES = [
  "Carpeta SEREMI · 14 ámbitos DS 14/2017",
  "Fichas clínicas según cupo del plan",
  "Signos vitales con alertas clínicas",
  "Observaciones por turno (12 tipos)",
  "Portal para familias incluido",
  "Funcionarios incluidos según cupo del plan",
  "Soporte en español",
];

const HOW_IT_WORKS = [
  { step: "01", title: "Solicita tu demo", text: "Completa el formulario con los datos de tu ELEAM. Revisamos cada solicitud y te respondemos en menos de 24 horas." },
  { step: "02", title: "Recibe tu acceso", text: "Habilitamos tu cuenta con 30 días de prueba completa y te enviamos un enlace de acceso por correo para que entres con datos reales." },
  { step: "03", title: "Activa y digitaliza", text: "Cuando termine la prueba eliges tu plan y activas con MercadoPago. El equipo te ayuda a cargar los datos iniciales sin costo adicional." },
];

const FAQ_ITEMS = [
  { q: "¿Qué es FichaEleam?", a: "FichaEleam es un software diseñado exclusivamente para Establecimientos de Larga Estadía para Adultos Mayores (ELEAM) en Chile. Cubre los 14 ámbitos del DS 14/2017 e incluye ficha clínica digital, signos vitales con alertas clínicas, observaciones por turno, Carpeta SEREMI y portal para familias — todo en una sola plataforma web." },
  { q: "¿FichaEleam incluye el DS 14/2017?", a: "Sí. La sección Carpeta SEREMI implementa los 14 ámbitos con más de 70 requisitos del catálogo oficial pre-cargados, evidencias versionadas, estados de cumplimiento y alertas automáticas cuando un documento vence o se acerca su vencimiento." },
  { q: "¿Cuánto cuesta?", a: "La suscripción es mensual por establecimiento, sin cobros por usuario. Los planes parten desde $50.000 CLP/mes para hasta 14 residentes e incluyen cupos de funcionarios según el tamaño del ELEAM." },
  { q: "¿Cómo funciona el demo?", a: "Completas el formulario de solicitud o nos escribes por WhatsApp. Nuestro equipo revisa tu caso y en menos de 24 horas habilitamos tu cuenta con 30 días de prueba gratuita y te enviamos un enlace de acceso por correo, sin compromiso ni tarjeta de crédito." },
  { q: "¿Cuánto tarda el equipo en aprender a usarla?", a: "La interfaz está diseñada para equipos sin experiencia técnica previa. Cada rol accede solo a lo que le corresponde, lo que simplifica el aprendizaje. La mayoría del equipo opera con fluidez desde el primer día." },
  { q: "¿Qué pasa con los datos que tengo en papel o Excel?", a: "Te acompañamos en la migración inicial sin costo adicional. Cargamos los datos básicos de tus residentes para que el equipo parta con la plataforma al día desde el primer momento." },
  { q: "¿Puedo exportar mis datos si decido salir?", a: "Sí. Tus datos son tuyos. Puedes exportar fichas, registros clínicos y documentación en cualquier momento desde el panel, sin depender de nuestro equipo." },
  { q: "¿Los datos quedan en Chile?", a: "Usamos Supabase con servidores en la región de São Paulo (AWS), que cumple con las regulaciones de datos de América Latina. Los datos de cada ELEAM están aislados mediante seguridad de nivel fila (RLS), garantizando que cada establecimiento accede solo a su propia información." },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Puedes cancelar en cualquier momento desde el panel. Mantendrás el acceso hasta el final del período pagado, sin penalidades ni cargos adicionales." },
  { q: "¿Cuánto tarda la implementación?", a: "La plataforma está operativa en menos de 10 minutos. Si tienes datos en Excel o fichas en papel, el equipo te ayuda con la migración inicial sin costo adicional." },
  { q: "¿Qué pasa si tengo una fiscalización próxima?", a: "Nuestros especialistas pueden ayudarte a organizar tu documentación con atención prioritaria. Contáctanos directamente y te asignamos un especialista para revisar tu situación." },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border transition-all duration-200 overflow-hidden rounded-2xl ${open ? "border-teal-100 bg-teal-50/30" : "border-slate-100 bg-white"}`}>
      <button type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full text-left px-6 py-5 flex justify-between items-center gap-4"
        aria-expanded={open}
      >
        <span className="font-semibold text-slate-800 text-sm leading-snug">{q}</span>
        <div className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 transition-all ${open ? "bg-teal-100 rotate-180" : "bg-slate-100"}`}>
          <Icon d="M19 9l-7 7-7-7" className={`w-3.5 h-3.5 ${open ? "text-teal-600" : "text-slate-400"}`} />
        </div>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const [modalCta, setModalCta] = useState(null);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [whatsAppSource, setWhatsAppSource] = useState("floating");

  const featuresRef  = useRef(null);
  const challengeRef = useRef(null);
  const howRef       = useRef(null);
  const pricingRef   = useRef(null);
  const faqRef       = useRef(null);

  usePageView("landing");
  useScrollDepth();
  useSectionView(featuresRef,  "features");
  useSectionView(challengeRef, "challenges");
  useSectionView(howRef,       "how_it_works");
  useSectionView(pricingRef,   "pricing");
  useSectionView(faqRef,       "faq");

  const openModal = (cta) => { setModalCta(cta); setModal(true); trackEvent("cta_click", cta); };
  const openWhatsApp = (source = "floating") => {
    setWhatsAppSource(source);
    setWhatsAppOpen(true);
  };

  useSEO({
    title: "FichaEleam · Software para ELEAM en Chile | DS 14/2017",
    description: "FichaEleam es el software diseñado para Establecimientos de Larga Estadía para Adultos Mayores en Chile. Carpeta SEREMI con los 14 ámbitos del DS 14/2017, ficha clínica digital, signos vitales con alertas y portal para familias. 30 días de prueba gratuita.",
    path: "/",
    keywords: ["software ELEAM Chile", "DS 14/2017", "carpeta SEREMI", "ficha clínica adulto mayor", "residencia adulto mayor", "acreditación ELEAM", "establecimiento larga estadía", "fiscalización SEREMI"],
    jsonLd: [
      faqJsonLd(FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a }))),
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FichaEleam",
        applicationCategory: "HealthApplication",
        operatingSystem: "Web",
        description: "Plataforma de gestión para Establecimientos de Larga Estadía para Adultos Mayores (ELEAM) en Chile. Incluye Carpeta SEREMI DS 14/2017, fichas clínicas digitales, signos vitales con alertas clínicas y portal para familias.",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "CLP",
          lowPrice: "50000",
          highPrice: "120000",
          offerCount: "4",
          eligibleCustomerType: "Business",
        },
        inLanguage: "es-CL",
        url: "https://fichaeleam.cl",
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "FichaEleam",
        url: "https://fichaeleam.cl",
        description: "Software de gestión clínica y documental para Establecimientos de Larga Estadía para Adultos Mayores (ELEAM) en Chile, cumpliendo el DS 14/2017.",
        areaServed: "CL",
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "contacto@fichaeleam.cl",
            telephone: "+56-9-5118-7764",
            availableLanguage: ["es-CL"],
            areaServed: "CL",
          },
          {
            "@type": "ContactPoint",
            contactType: "sales",
            telephone: "+56-9-5118-7764",
            email: "contacto@fichaeleam.cl",
            availableLanguage: ["es-CL"],
            areaServed: "CL",
          },
        ],
      },
    ],
  });

  return (
    <div className="bg-white text-slate-800 overflow-x-hidden">

      {/* ══ NAV ══════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-white tracking-tight">
            Ficha<span className="text-teal-400">Eleam</span>
          </span>
          <div className="flex items-center gap-1">
            <button type="button"
              onClick={() => { navigate("/blog"); trackEvent("nav_click", "blog"); }}
              className="hidden sm:inline-flex text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all"
            >
              Blog
            </button>
            <button type="button"
              onClick={() => { document.getElementById("precios")?.scrollIntoView({ behavior: "smooth" }); trackEvent("nav_click", "precios"); }}
              className="hidden sm:inline-flex text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all"
            >
              Precios
            </button>
            <button type="button"
              onClick={() => { navigate("/login"); trackEvent("nav_click", "login"); }}
              className="text-sm text-slate-300 border border-white/20 px-4 py-1.5 rounded-xl hover:border-white/40 hover:text-white transition-all ml-1"
            >
              Iniciar sesión
            </button>
            <button type="button"
              onClick={() => openModal("nav_demo")}
              className="hidden sm:inline-flex text-sm bg-teal-500 text-white px-4 py-2 rounded-xl hover:bg-teal-400 transition-all font-semibold shadow-lg shadow-teal-500/20 ml-1"
            >
              Solicitar Demo
            </button>
          </div>
        </div>
      </nav>

      {/* ══ HERO ═════════════════════════════════════════════════════ */}
      <section className="relative bg-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-5%,rgba(20,184,166,0.13),transparent)]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />

        <div className="relative max-w-4xl mx-auto px-5 py-36 sm:py-44 text-center">
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-bold px-4 py-2 rounded-full mb-10 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
            Diseñado exclusivamente para ELEAM en Chile
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] font-black leading-[1.05] tracking-tight mb-7">
            Gestión clínica
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">
              y documental
            </span>
            <br />
            para tu ELEAM.
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-2xl mx-auto">
            Fichas clínicas digitales, signos vitales con alertas, observaciones por turno,
            Carpeta SEREMI&nbsp;DS&nbsp;14/2017 y portal para familias — todo en una sola plataforma.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <button type="button"
              onClick={() => openModal("hero_primary")}
              className="bg-teal-500 text-white font-bold py-4 px-10 rounded-xl hover:bg-teal-400 hover:-translate-y-0.5 transition-all shadow-lg shadow-teal-500/25 text-base"
            >
              Solicitar Demo Gratuito
            </button>
            <button type="button"
              onClick={() => { document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" }); trackEvent("cta_click", "hero_how"); }}
              className="border border-white/15 text-slate-300 font-semibold py-4 px-8 rounded-xl hover:bg-white/5 hover:border-white/25 transition-all text-base"
            >
              Ver cómo funciona
            </button>
          </div>

          <div className="flex flex-wrap gap-6 justify-center">
            {["Sin tarjeta de crédito", "30 días gratis", "Respuesta en 24 h"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                <Check className="w-3.5 h-3.5 text-teal-400" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FUNCIONALIDADES ══════════════════════════════════════════ */}
      <section ref={featuresRef} className="py-28 sm:py-36 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-[0.2em] mb-4">Plataforma completa</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Todo lo que tu ELEAM necesita
              <br className="hidden sm:block" />
              en un solo lugar
            </h2>
            <p className="mt-4 text-slate-500 max-w-lg mx-auto text-sm leading-relaxed">
              Construido sobre el DS&nbsp;14/2017. Cada módulo refleja la operación real
              de un establecimiento de larga estadía en Chile.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon, metric, title, text }, i) => (
              <div
                key={i}
                className="group bg-white rounded-2xl p-7 border border-slate-100 hover:border-teal-100 hover:shadow-lg transition-all duration-200"
              >
                <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-teal-100 transition-colors">
                  <Icon d={icon} className="w-5 h-5 text-teal-600" />
                </div>
                <p className="text-[11px] font-bold text-teal-600 uppercase tracking-widest mb-2">{metric}</p>
                <h3 className="font-bold text-slate-900 mb-2 leading-snug">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button type="button"
              onClick={() => openModal("features_cta")}
              className="bg-slate-900 text-white font-bold py-3.5 px-10 rounded-xl hover:bg-slate-800 transition-all"
            >
              Ver demo personalizado
            </button>
          </div>
        </div>
      </section>

      {/* ══ EL DESAFÍO ═══════════════════════════════════════════════ */}
      <section ref={challengeRef} className="py-28 sm:py-36 px-5 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-[0.2em] mb-4">El desafío diario</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Lo que complica la gestión
              <br className="hidden sm:block" />
              de la mayoría de los ELEAM
            </h2>
            <p className="mt-4 text-slate-500 text-sm max-w-lg mx-auto">
              Problemas concretos que FichaEleam está diseñado para resolver.
            </p>
          </div>

          <ul className="space-y-3">
            {CHALLENGES.map(({ icon, text }, i) => (
              <li
                key={i}
                className="flex items-start gap-5 bg-white rounded-2xl p-5 border border-slate-100 hover:border-teal-100 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 mt-0.5 border border-slate-100">
                  <Icon d={icon} className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-slate-600 text-sm leading-relaxed pt-1.5">{text}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 text-center">
            <button type="button"
              onClick={() => openModal("challenge_cta")}
              className="inline-flex items-center gap-2 text-teal-600 text-sm font-semibold hover:text-teal-500 transition-colors"
            >
              Conoce cómo FichaEleam aborda cada uno
              <Icon d="M17 8l4 4m0 0l-4 4m4-4H3" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ══ CÓMO FUNCIONA ════════════════════════════════════════════ */}
      <section id="como-funciona" ref={howRef} className="py-28 sm:py-36 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-[0.2em] mb-4">Simple y rápido</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Tres pasos para digitalizar
              <br className="hidden sm:block" />
              tu ELEAM
            </h2>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="hidden sm:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-teal-100 via-teal-200 to-teal-100 pointer-events-none" />
            {HOW_IT_WORKS.map(({ step, title, text }, i) => (
              <div key={i} className="relative text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 text-white text-xl font-black mb-6 shadow-lg shadow-teal-600/20 group-hover:bg-teal-500 transition-colors">
                  {step}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex justify-center gap-4 flex-wrap">
            {[
              { letter: "A",  label: "Vista Admin",       sub: "Gestión total del ELEAM",      bg: "bg-sky-100",    text: "text-sky-700" },
              { letter: "F",  label: "Vista Funcionario", sub: "Registros clínicos del turno", bg: "bg-teal-100",   text: "text-teal-700" },
              { letter: "Fa", label: "Vista Familiar",    sub: "Portal de seguimiento",        bg: "bg-violet-100", text: "text-violet-700" },
            ].map(({ letter, label, sub, bg, text }) => (
              <div key={label} className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 flex items-center gap-3">
                <span className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center text-xs font-bold ${text}`}>{letter}</span>
                <div>
                  <p className={`font-semibold text-sm ${text}`}>{label}</p>
                  <p className="text-slate-400 text-xs">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PARA QUIÉN ES ════════════════════════════════════════════ */}
      <section className="py-28 sm:py-36 px-5 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-[0.2em] mb-4">Para cada rol del ELEAM</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Una plataforma que sirve
              <br className="hidden sm:block" />
              a todo el equipo
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {ROLES.map(({ role, icon, color, wins }) => (
              <div
                key={role}
                className="bg-white rounded-2xl p-7 border border-slate-100 hover:border-teal-100 hover:shadow-md transition-all duration-200"
              >
                <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-5`}>
                  <Icon d={icon} className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 mb-4 text-sm leading-snug">{role}</h3>
                <ul className="space-y-3">
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

      {/* ══ PRECIOS ══════════════════════════════════════════════════ */}
      <section id="precios" ref={pricingRef} className="py-28 sm:py-36 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-[0.2em] mb-4">Precios</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Precio transparente
              <br className="hidden sm:block" />
              por establecimiento
            </h2>
            <p className="mt-4 text-slate-500 text-sm max-w-md mx-auto">
              Sin cobros por usuario. Cada plan incluye cupos de residentes y funcionarios para operar tu ELEAM.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-7 mb-8 max-w-3xl mx-auto border border-slate-100">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            {PUBLIC_PLAN_CATALOG.map((plan, i) => {
              const featured = plan.destacado;
              return (
                <div
                  key={plan.codigo}
                  className={`relative rounded-2xl p-7 flex flex-col text-center ${
                    featured
                      ? "bg-teal-600 text-white shadow-2xl shadow-teal-600/25 ring-2 ring-teal-500 ring-offset-2"
                      : "bg-white border border-slate-200"
                  }`}
                >
                  {plan.tag && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-800 text-white text-[11px] px-3 py-0.5 rounded-full font-bold whitespace-nowrap">
                      {plan.tag}
                    </span>
                  )}
                  <p className={`text-xs font-semibold mb-3 ${featured ? "text-teal-200" : "text-slate-400"}`}>{plan.label}</p>
                  <p className={`text-3xl font-black mb-0.5 ${featured ? "text-white" : "text-slate-900"}`}>{formatPlanPrice(plan)}</p>
                  <p className={`text-xs mb-1 ${featured ? "text-teal-200" : "text-slate-400"}`}>CLP / mes + IVA</p>
                  <p className={`text-[11px] mb-2 ${featured ? "text-teal-300" : "text-slate-400"}`}>{plan.dailyLabel}</p>
                  <p className={`text-[11px] mb-6 ${featured ? "text-teal-100" : "text-slate-500"}`}>
                    Hasta {plan.max_residentes} residentes · {plan.max_funcionarios} funcionarios
                  </p>
                  <div className="mt-auto">
                    <button type="button"
                      onClick={() => openModal(`pricing_plan${i + 1}`)}
                      className={`w-full font-semibold py-2.5 rounded-xl text-sm transition-all ${
                        featured
                          ? "bg-white text-teal-700 hover:bg-teal-50"
                          : "border border-teal-600 text-teal-700 hover:bg-teal-50"
                      }`}
                    >
                      Comenzar demo
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl p-7 border border-slate-200 bg-white flex flex-col text-center">
              <p className="text-xs font-semibold text-slate-400 mb-3">35 o más residentes</p>
              <p className="text-xl font-black text-slate-900 mb-0.5">Institucional</p>
              <p className="text-xs text-slate-400 mb-1">Cotización personalizada</p>
              <p className="text-[11px] text-slate-400 mb-6">Atención dedicada por WhatsApp</p>
              <div className="mt-auto">
                <button type="button"
                  onClick={() => {
                    trackEvent("cta_click", "pricing_institucional");
                    openWhatsApp("institutional");
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 font-semibold py-2.5 rounded-xl text-sm bg-[#25D366] hover:bg-[#1ebe57] text-white transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Solicitar cotización
                </button>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-8 max-w-2xl mx-auto text-center text-white">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(20,184,166,0.15),transparent)] pointer-events-none" />
            <div className="relative">
              <p className="font-bold text-base mb-1">30 días de prueba gratuita en todos los planes</p>
              <p className="text-sm text-slate-400 mb-1">Sin tarjeta de crédito. Sin compromiso.</p>
              <p className="text-xs text-slate-500 mb-5">Si en 30 días no es para tu ELEAM, cancelas sin preguntas.</p>
              <button type="button"
                onClick={() => openModal("pricing_trial")}
                className="bg-teal-500 text-white font-semibold text-sm px-8 py-2.5 rounded-xl hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/25"
              >
                Empezar prueba gratuita
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════════════ */}
      <section ref={faqRef} className="py-28 sm:py-36 px-5 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-teal-500 uppercase tracking-[0.2em] mb-4">Preguntas frecuentes</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Todo lo que necesitas saber
            </h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map(({ q, a }, i) => <FaqItem key={i} q={q} a={a} />)}
          </div>
          <div className="mt-12 text-center">
            <p className="text-sm text-slate-500 mb-4">¿Tienes otra pregunta?</p>
            <button type="button"
              onClick={() => openModal("faq_cta")}
              className="bg-teal-600 text-white font-semibold px-8 py-3 rounded-xl text-sm hover:bg-teal-500 transition-all"
            >
              Contactar a un especialista
            </button>
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-slate-950 py-32 sm:py-40 px-5 text-white text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(20,184,166,0.1),transparent)] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />

        <div className="relative max-w-2xl mx-auto">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-[0.2em] mb-5">Empieza hoy</p>
          <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
            Tu ELEAM con la documentación
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">
              siempre organizada.
            </span>
          </h2>
          <p className="text-slate-400 mb-2 text-base">
            30 días gratis · Sin tarjeta de crédito · Sin compromiso
          </p>
          <p className="text-slate-500 text-sm mb-10">
            Un especialista te envía tu acceso y te acompaña durante la exploración.
          </p>

          <button type="button"
            onClick={() => openModal("final_cta")}
            className="bg-teal-500 text-white font-bold py-4 px-12 rounded-2xl shadow-2xl shadow-teal-500/25 hover:bg-teal-400 hover:-translate-y-0.5 transition-all text-base"
          >
            Solicitar Demo Gratuito
          </button>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
            <span className="text-slate-500">¿Prefiere contacto directo?</span>
            <a
              href="mailto:contacto@fichaeleam.cl"
              className="text-teal-400 font-semibold hover:text-teal-300 transition-colors"
              onClick={() => trackEvent("cta_click", "final_email")}
            >
              contacto@fichaeleam.cl
            </a>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════ */}
      <footer className="bg-slate-950 border-t border-white/5 text-slate-500 py-14 px-5">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-10 text-sm">
          <div>
            <span className="text-lg font-bold text-white tracking-tight block mb-3">
              Ficha<span className="text-teal-400">Eleam</span>
            </span>
            <p className="leading-relaxed text-xs text-slate-600">
              Digitalización de fichas clínicas y documentación SEREMI para Establecimientos de Larga Estadía para Adultos Mayores en Chile. DS&nbsp;14/2017.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-widest">Accesos</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Iniciar sesión", action: () => navigate("/login") },
                { label: "Solicitar demo",  action: () => openModal("footer_demo") },
                { label: "Precios",         action: () => document.getElementById("precios")?.scrollIntoView({ behavior: "smooth" }) },
                { label: "Blog",            action: () => navigate("/blog") },
              ].map(({ label, action }) => (
                <li key={label}>
                  <button type="button" onClick={action} className="hover:text-white transition-colors">
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-widest">Contacto</h4>
            <a href="mailto:contacto@fichaeleam.cl" className="text-sm hover:text-white transition-colors block">
              contacto@fichaeleam.cl
            </a>
            <a
              href="https://wa.me/56951187764"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:text-white transition-colors inline-flex items-center gap-1.5 mt-1.5"
              onClick={() => trackEvent("cta_click", "footer_whatsapp")}
            >
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              +56 9 5118 7764
            </a>
            <p className="text-sm mt-1.5">Santiago, Chile</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/5 text-xs text-center text-slate-700">
          © {new Date().getFullYear()} FichaEleam. Todos los derechos reservados.
        </div>
      </footer>

      <DemoRequestModal isOpen={modal} onClose={() => setModal(false)} defaultCta={modalCta} />
      <WhatsAppLeadButton onOpen={openWhatsApp} />
      <WhatsAppLeadModal
        isOpen={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        source={whatsAppSource}
      />
    </div>
  );
}
