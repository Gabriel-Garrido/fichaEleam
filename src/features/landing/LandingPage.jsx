import { useRef } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useSEO, faqJsonLd, organizationJsonLd } from "../../utils/seo";
import { trackEvent, usePageView, useScrollDepth, useSectionView } from "./landingAnalytics";
import { PUBLIC_PLAN_CATALOG, formatPlanPrice } from "../payment/planCatalog";
import { PUBLIC_ASSETS, PUBLIC_BUTTON } from "../public/publicDesignAssets";
import {
  CheckList,
  FaqDisclosure,
  ProductImage,
  ProductShowcase,
  PublicCtaBand,
  PublicFeatureCard,
  PublicIcon,
  PublicSection,
  Reveal,
  Stat,
  TrustBand,
  WhatsAppGlyph,
} from "../public/PublicDesign";

const BENTO_FEATURES = [
  {
    col: "md:col-span-2",
    big: true,
    icon: "document",
    metric: "matriz DS 20 por artículos · controles DS 20",
    title: "Carpeta SEREMI lista para fiscalización",
    text: "La matriz DS 20 por artículos del Decreto N°20 ya viene cargada. Subes cada documento, recibes un aviso antes de que venza e imprimes la carpeta completa cuando llega la SEREMI. Sin archivadores.",
    tone: "teal",
  },
  {
    col: "",
    icon: "pulse",
    metric: "Pensado para la persona mayor",
    title: "Signos vitales con alertas",
    text: "Presión, temperatura, saturación y glucosa avisan cuando un valor se sale de lo normal, para actuar a tiempo.",
    tone: "rose",
  },
  {
    col: "",
    icon: "heart",
    metric: "Historial completo",
    title: "Ficha clínica digital",
    text: "Diagnósticos, alergias, medicamentos y observaciones de cada residente, siempre a mano y al día.",
    tone: "sky",
  },
  {
    col: "md:col-span-2",
    big: true,
    icon: "clock",
    metric: "Mañana · tarde · noche",
    title: "Entrega de turno sin vacíos",
    text: "El equipo que llega ve al instante lo pendiente: medicamentos, tareas y observaciones. Nadie parte el turno preguntando qué pasó.",
    tone: "amber",
  },
  {
    col: "",
    icon: "users",
    metric: "Continuidad del cuidado",
    title: "Entrega de turno trazable",
    text: "El equipo recibe pendientes clínicos, medicamentos y tareas en un resumen operativo verificable.",
    tone: "emerald",
  },
];

const PAIN_POINTS = [
  "Carpetas y cuadernos repartidos entre turnos y habitaciones",
  "Documentos de la SEREMI que vencen sin que nadie avise",
  "Nunca se sabe quién registró o cambió algo, ni cuándo",
  "Pendientes clínicos que se pierden entre un turno y el siguiente",
];

const SOLUTIONS = [
  "Toda la información en un solo lugar, desde el computador o el teléfono",
  "Avisos automáticos antes de que venza cada documento de la SEREMI",
  "Cada registro queda con el nombre de quién lo hizo y a qué hora",
  "Una entrega de turno que reúne alertas, tareas y responsables",
];

const ROLES = [
  {
    role: "Dirección",
    desc: "Una mirada completa: residentes, equipo, cumplimiento SEREMI, pagos y reportes.",
    tone: "teal",
    icon: "shield",
  },
  {
    role: "Equipo de cuidado",
    desc: "Controles, observaciones, medicamentos y tareas del turno, paso a paso.",
    tone: "sky",
    icon: "pulse",
  },
  {
    role: "Cumplimiento",
    desc: "Evidencias, vencimientos, brechas y preparación para fiscalización en un solo flujo.",
    tone: "emerald",
    icon: "users",
  },
];

const HOW_IT_WORKS = [
  ["01", "Pides tu demo", "Cuéntanos de tu residencia. Te respondemos en menos de 24 horas con una cuenta real."],
  ["02", "Pruebas 30 días gratis", "Revisas todo con calma: residentes, SEREMI, turnos y medicamentos. Sin tarjeta de crédito."],
  ["03", "Ordenas tu operación", "Cargas tu equipo y tus residentes desde el navegador. Te acompañamos para partir."],
];

const PLAN_FEATURES = [
  "Carpeta SEREMI (Decreto N°20) completa",
  "Fichas clínicas digitales",
  "Signos vitales con alertas",
  "Entrega de turno y observaciones",
  "Medicamentos y plan de cuidado",
  "Permisos granulares para el equipo",
];

const FAQ_ITEMS = [
  {
    q: "¿Qué es FichaEleam?",
    a: "FichaEleam es un software web para residencias de personas mayores (ELEAM) en Chile. Reúne la ficha clínica, los signos vitales, las observaciones, la entrega de turno, los medicamentos y la Carpeta SEREMI (Decreto N°20) en un solo lugar.",
  },
  {
    q: "¿Me ayuda con la fiscalización de la SEREMI?",
    a: "Sí. El módulo de acreditación trae la matriz DS 20 por artículos y controles DS 20 del Decreto N°20 ya cargados, con sus documentos, vencimientos y avisos. Cuando llega la fiscalización, imprimes la carpeta completa y ordenada.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "Los planes son mensuales por residencia y parten en $50.000 + IVA al mes para hasta 14 residentes y 10 funcionarios.",
  },
  {
    q: "¿Cómo funciona la prueba gratis?",
    a: "Pides el demo, revisamos tu caso y te enviamos una cuenta real con 30 días gratis. No necesitas tarjeta de crédito.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. FichaEleam funciona desde cualquier navegador, en computador, tablet o teléfono con internet.",
  },
  {
    q: "¿Están seguros los datos de mi residencia?",
    a: "Sí. Cada ELEAM accede solo a su información, con ingreso seguro, permisos por persona y datos separados de los demás establecimientos.",
  },
];

export default function LandingPage() {
  const featuresRef = useRef(null);
  const challengeRef = useRef(null);
  const howRef = useRef(null);
  const pricingRef = useRef(null);
  const faqRef = useRef(null);

  usePageView("landing");
  useScrollDepth();
  useSectionView(featuresRef, "features");
  useSectionView(challengeRef, "challenges");
  useSectionView(howRef, "how_it_works");
  useSectionView(pricingRef, "pricing");
  useSectionView(faqRef, "faq");

  useSEO({
    title: "Software para ELEAM en Chile · Ficha clínica y Carpeta SEREMI",
    description:
      "FichaEleam reúne la ficha clínica, los signos vitales, la entrega de turno, los medicamentos y la Carpeta SEREMI (Decreto N°20) de tu residencia de personas mayores en un solo lugar. Demo gratis por 30 días.",
    path: "/",
    image: PUBLIC_ASSETS.hero.publicSrc,
    keywords: ["software ELEAM Chile", "Decreto N°20", "carpeta SEREMI", "ficha clínica persona mayor", "residencia persona mayor"],
    jsonLd: [
      organizationJsonLd(),
      faqJsonLd(FAQ_ITEMS),
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FichaEleam",
        applicationCategory: "HealthApplication",
        operatingSystem: "Web",
        image: `https://fichaeleam.cl${PUBLIC_ASSETS.hero.publicSrc}`,
        screenshot: `https://fichaeleam.cl${PUBLIC_ASSETS.software.publicSrc}`,
        description: "Software de gestión clínica y acreditación SEREMI para ELEAM en Chile.",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "CLP",
          lowPrice: "50000",
          highPrice: "120000",
          offerCount: "4",
        },
        inLanguage: "es-CL",
        url: "https://fichaeleam.cl",
      },
    ],
  });

  const { openDemo, openWhatsApp } = useOutletContext();

  return (
        <div className="bg-white">

          {/* ── HERO ── */}
          <section className="relative isolate overflow-hidden bg-slate-950 px-5 pb-24 pt-20 sm:pt-24 lg:pb-28">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 -translate-y-[35%] rounded-full bg-teal-500/12 blur-[100px]" />
              <div className="absolute right-0 top-1/3 h-[340px] w-[520px] translate-x-1/3 rounded-full bg-emerald-500/8 blur-[90px]" />
            </div>
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 public-grid-pattern opacity-50" />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-slate-950 to-transparent" />

            <div className="relative mx-auto max-w-7xl">
              <div className="grid items-center gap-12 lg:grid-cols-[1.04fr_1fr]">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 backdrop-blur-sm">
                    <span className="relative grid h-2 w-2 place-items-center">
                      <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400/70" />
                      <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                      Operando hoy en ELEAM de Chile
                    </span>
                  </div>

                  <h1 className="mt-7 font-display text-[2.75rem] font-semibold leading-[1.03] tracking-tight text-balance text-white sm:text-6xl lg:text-[4.25rem]">
                    La gestión de tu{" "}
                    <span className="relative inline-block whitespace-nowrap">
                      <span className="bg-gradient-to-br from-teal-200 via-teal-400 to-emerald-400 bg-clip-text text-transparent animate-gradient-sweep">
                        ELEAM
                      </span>
                      <svg className="absolute -bottom-2 left-0 h-[10px] w-full" viewBox="0 0 300 14" fill="none" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M2 8.5 C 80 2, 220 2, 298 8.5" stroke="url(#hero-underline)" strokeWidth="3" strokeLinecap="round" />
                        <defs>
                          <linearGradient id="hero-underline" x1="0" y1="0" x2="300" y2="0">
                            <stop offset="0" stopColor="#5eead4" />
                            <stop offset="1" stopColor="#34d399" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </span>
                    ,<br className="hidden sm:block" /> simple y lista para fiscalización
                  </h1>

                  <p className="mt-7 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
                    Ficha clínica, signos vitales con alertas, entrega de turno, medicamentos y la Carpeta SEREMI (Decreto&nbsp;N&deg;20) lista para la fiscalización. Todo en un solo lugar, hecho para residencias de personas mayores en Chile.
                  </p>

                  <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button type="button" onClick={() => openDemo("hero_primary")} className={PUBLIC_BUTTON.accent}>
                      <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      <span className="relative">Solicitar demo gratis</span>
                      <PublicIcon name="arrow" className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                    <Link
                      to="/software-eleam"
                      onClick={() => trackEvent("cta_click", "hero_software")}
                      className="group inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
                    >
                      Ver el producto
                      <span className="text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-teal-300">→</span>
                    </Link>
                  </div>

                  <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <PublicIcon name="check" className="h-3.5 w-3.5 text-teal-400" strokeWidth={2.5} />
                    30 días de prueba · Sin tarjeta de crédito · Soporte en Chile
                  </p>
                </div>

                {/* Right — framed lifestyle photo + floating accents */}
                <ProductShowcase
                  asset={PUBLIC_ASSETS.hero}
                  priority
                  annotations={[
                    {
                      className: "-bottom-5 -left-4 w-[210px]",
                      rotate: "-3deg",
                      icon: "document",
                      label: "Carpeta SEREMI",
                      value: "14 / matriz DS 20 por artículos",
                      tone: "teal",
                      badge: "Listo",
                    },
                    {
                      className: "-top-4 -right-3 w-[190px]",
                      rotate: "3deg",
                      icon: "pulse",
                      label: "SatO₂ · Hab 12",
                      value: "88% · revisar",
                      tone: "rose",
                      badge: "Alerta",
                    },
                  ]}
                />
              </div>

              {/* Stats */}
              <div className="mt-16 grid grid-cols-2 gap-6 border-t border-white/10 pt-10 sm:grid-cols-4 lg:gap-10">
                <Stat dark value="14" label="ámbitos SEREMI ya cargados" />
                <Stat dark value="70+" label="requisitos del Decreto N°20" />
                <Stat dark value="30 días" label="de prueba gratis" />
                <Stat dark value="100%" label="web, sin instalar nada" />
              </div>
            </div>
          </section>

          {/* ── TRUST BAND ── */}
          <TrustBand
            note="Preparado para la normativa chilena"
            items={["Decreto N°20 · MINSAL", "Ley 20.584", "Ley 19.628", "Datos separados por ELEAM", "Hecho en Chile"]}
            srText="FichaEleam está preparado para la normativa chilena de ELEAM: el Decreto N°20 del Ministerio de Salud, la Ley 20.584 sobre derechos y deberes del paciente y la Ley 19.628 de protección de datos personales. Incluye la matriz DS 20 por artículos SEREMI y controles DS 20 para la acreditación de residencias de personas mayores en Chile."
          />

          {/* ── PROBLEM / SOLUTION ── */}
          <PublicSection
            tone="soft"
            eyebrow="El día a día de un ELEAM"
            title="Menos papeles y llamados, más tiempo para cuidar"
            description="FichaEleam reemplaza las carpetas, las planillas y los cuadernos por un registro digital que todo el equipo consulta en cualquier turno."
          >
            <div ref={challengeRef} className="grid items-stretch gap-5 md:grid-cols-2 lg:gap-8">
              <Reveal className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50">
                    <PublicIcon name="x" className="h-4 w-4 text-rose-500" strokeWidth={2.5} />
                  </span>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-rose-700">Hoy, sin FichaEleam</p>
                </div>
                <ul className="space-y-3">
                  {PAIN_POINTS.map((item) => (
                    <li key={item} className="flex gap-3 rounded-xl border border-rose-50 bg-rose-50/40 p-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                      <p className="text-sm leading-6 text-slate-700">{item}</p>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={80} className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50">
                    <PublicIcon name="check" className="h-4 w-4 text-teal-700" strokeWidth={2.5} />
                  </span>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-teal-700">Con FichaEleam</p>
                </div>
                <ul className="space-y-3">
                  {SOLUTIONS.map((item) => (
                    <li key={item} className="flex gap-3 rounded-xl border border-teal-50 bg-teal-50/40 p-3">
                      <PublicIcon name="check" className="mt-1 h-4 w-4 shrink-0 text-teal-600" strokeWidth={2.5} />
                      <p className="text-sm leading-6 text-slate-700">{item}</p>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <Reveal className="mt-10">
              <ProductImage asset={PUBLIC_ASSETS.comparison} caption="Del papel y las planillas a un panel ordenado que todo el equipo entiende." />
            </Reveal>
          </PublicSection>

          {/* ── FEATURES BENTO ── */}
          <PublicSection
            eyebrow="Todo en una plataforma"
            title="Dirige, cuida y responde a la SEREMI sin cambiar de herramienta"
            description="Una sola plataforma reúne lo clínico, lo operativo y lo documental, para que el equipo trabaje con todo el contexto en cada turno."
            center
          >
            <div ref={featuresRef} className="grid gap-4 md:grid-cols-3">
              {BENTO_FEATURES.map((feature, i) => (
                <Reveal key={feature.title} delay={(i % 3) * 70} className={feature.col}>
                  <PublicFeatureCard {...feature} />
                </Reveal>
              ))}
              <Reveal delay={140} className="md:col-span-2">
                <article className="flex h-full flex-col items-start justify-center gap-4 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-7 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-teal-950">¿Lo quieres ver con tu caso?</h3>
                    <p className="mt-1 text-sm leading-5 text-teal-700">Demo real, 30 días gratis, sin tarjeta de crédito.</p>
                  </div>
                  <button type="button" onClick={() => openDemo("features_bento_cta")} className={`${PUBLIC_BUTTON.primary} w-full shrink-0 sm:w-auto`}>
                    Solicitar demo gratis
                    <PublicIcon name="arrow" className="h-4 w-4" />
                  </button>
                </article>
              </Reveal>
            </div>
          </PublicSection>

          {/* ── ROLES ── */}
          <PublicSection
            tone="soft"
            eyebrow="Cada persona ve lo que necesita"
            title="Pensado para el ritmo real de una residencia"
            description="Dirección, equipo de cuidado y responsables de cumplimiento entran directo a lo suyo, sin perderse en menús que no usan."
          >
            <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-4">
                {ROLES.map(({ role, desc, tone, icon }, i) => (
                  <Reveal key={role} delay={i * 80}>
                    <div className={`flex gap-4 rounded-2xl border p-5 shadow-sm ${tone === "teal" ? "border-teal-100 bg-teal-50/50" : tone === "sky" ? "border-sky-100 bg-sky-50/50" : "border-emerald-100 bg-emerald-50/50"}`}>
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone === "teal" ? "bg-teal-100 text-teal-700" : tone === "sky" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>
                        <PublicIcon name={icon} className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-950">{role}</p>
                        <p className="mt-1 text-sm leading-5 text-slate-600">{desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
              <Reveal delay={120}>
                <ProductShowcase asset={PUBLIC_ASSETS.shift} />
              </Reveal>
            </div>
          </PublicSection>

          {/* ── HOW IT WORKS ── */}
          <PublicSection
            id="como-funciona"
            eyebrow="Empezar es simple"
            title="De las planillas a una cuenta lista en 3 pasos"
            center
          >
            <div ref={howRef} className="grid gap-5 md:grid-cols-3">
              {HOW_IT_WORKS.map(([step, title, text], i) => (
                <Reveal key={step} delay={i * 90}>
                  <article className="relative h-full rounded-2xl border border-slate-100 bg-white p-7 shadow-sm">
                    {i < 2 && (
                      <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 md:flex">
                        <span className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white shadow-sm">
                          <PublicIcon name="arrow" className="h-3 w-3 text-teal-600" />
                        </span>
                      </div>
                    )}
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-700 font-display text-lg font-bold text-white shadow-sm shadow-teal-900/20">
                      {step}
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </PublicSection>

          {/* ── PRICING ── */}
          <PublicSection
            id="precios"
            tone="soft"
            eyebrow="Precios"
            title="Un plan por residencia, todo incluido"
            description="Todos los módulos operativos vienen en cada plan; solo cambian los cupos de residentes y funcionarios."
            center
          >
            <Reveal className="mx-auto mb-8 max-w-3xl rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Incluido en todos los planes</p>
              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                <CheckList items={PLAN_FEATURES} />
              </div>
            </Reveal>

            <div ref={pricingRef} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {PUBLIC_PLAN_CATALOG.map((plan, index) => (
                plan.destacado ? (
                  <article key={plan.codigo} className="relative rounded-[17px] bg-gradient-to-b from-teal-400 to-teal-700 p-px shadow-xl shadow-teal-900/20">
                    {plan.tag && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-bold text-white">
                        {plan.tag}
                      </span>
                    )}
                    <div className="flex h-full flex-col rounded-2xl bg-teal-700 p-6 text-center text-white">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-100">{plan.label}</p>
                      <p className="mt-4 font-display text-3xl font-bold">{formatPlanPrice(plan)}</p>
                      <p className="mt-1 text-xs text-teal-200">CLP / mes + IVA</p>
                      <p className="mt-4 text-sm text-teal-100">
                        Hasta {plan.max_residentes} residentes · {plan.max_funcionarios} funcionarios
                      </p>
                      <button type="button" onClick={() => openDemo(`pricing_plan_${index + 1}`)} className="mt-auto pt-6">
                        <span className="flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-teal-800 transition-colors hover:bg-teal-50">
                          Solicitar demo gratis
                        </span>
                      </button>
                    </div>
                  </article>
                ) : (
                  <article key={plan.codigo} className="relative flex flex-col rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
                    {plan.tag && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-bold text-white">
                        {plan.tag}
                      </span>
                    )}
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{plan.label}</p>
                    <p className="mt-4 font-display text-3xl font-bold text-slate-950">{formatPlanPrice(plan)}</p>
                    <p className="mt-1 text-xs text-slate-500">CLP / mes + IVA</p>
                    <p className="mt-4 text-sm text-slate-600">
                      Hasta {plan.max_residentes} residentes · {plan.max_funcionarios} funcionarios
                    </p>
                    <button type="button" onClick={() => openDemo(`pricing_plan_${index + 1}`)} className="mt-auto pt-6">
                      <span className="flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                        Solicitar demo gratis
                      </span>
                    </button>
                  </article>
                )
              ))}

              <article className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">35 o más residentes</p>
                <p className="mt-4 font-display text-2xl font-bold text-slate-950">Institucional</p>
                <p className="mt-1 text-xs text-slate-500">Cotización personalizada</p>
                <p className="mt-4 text-sm text-slate-600">Cupos, funciones y acompañamiento según el tamaño de la residencia.</p>
                <button type="button" onClick={() => openWhatsApp("institutional")} className="mt-auto pt-6">
                  <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                    <WhatsAppGlyph className="h-4 w-4" />
                    Hablar por WhatsApp
                  </span>
                </button>
              </article>
            </div>

            <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-500">
                <PublicIcon name="lock" className="h-3.5 w-3.5 text-teal-600" />
                Pago seguro con MercadoPago
              </span>
              <p>Precios en pesos chilenos, sin IVA. El IVA se aplica según la normativa vigente.</p>
            </div>
          </PublicSection>

          {/* ── FAQ ── */}
          <PublicSection eyebrow="Preguntas frecuentes" title="Lo que más nos preguntan antes de partir" center>
            <div ref={faqRef} className="mx-auto grid max-w-4xl gap-3">
              {FAQ_ITEMS.map((item) => (
                <FaqDisclosure key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                to="/preguntas-frecuentes"
                onClick={() => trackEvent("cta_click", "landing_faq_more")}
                className="text-sm font-semibold text-teal-700 hover:text-teal-800 hover:underline"
              >
                Ver todas las preguntas frecuentes →
              </Link>
            </div>
          </PublicSection>

          {/* ── FINAL CTA ── */}
          <PublicCtaBand
            title="Deja el papel atrás con una cuenta real de prueba"
            text="30 días gratis, sin tarjeta de crédito. Revisamos tu caso y te ayudamos a partir con el plan correcto."
            primaryLabel="Solicitar demo gratis"
            onPrimary={openDemo}
            source="final_cta"
            secondaryLabel="Ver guía SEREMI"
            secondaryTo="/acreditacion-seremi"
          />
        </div>
  );
}
