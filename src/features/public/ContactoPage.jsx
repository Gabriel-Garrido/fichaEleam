import { Link, useOutletContext } from "react-router-dom";
import { useSEO, breadcrumbJsonLd, organizationJsonLd } from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import { PUBLIC_ASSETS, PUBLIC_BUTTON } from "./publicDesignAssets";
import {
  PublicBreadcrumb,
  PublicIcon,
  PublicSection,
} from "./PublicDesign";

const SITE = "https://fichaeleam.cl";

function contactPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contacto FichaEleam",
    url: `${SITE}/contacto`,
    description: "Contacta a FichaEleam por WhatsApp o solicita una demo gratis para tu ELEAM en Chile.",
    mainEntity: {
      "@type": "Organization",
      name: "FichaEleam",
      url: SITE,
      areaServed: { "@type": "Country", name: "Chile" },
      availableLanguage: ["es-CL"],
    },
  };
}

export default function ContactoPage() {
  usePageView("/contacto");

  useSEO({
    title: "Contacto · FichaEleam",
    description: "Contacta FichaEleam por WhatsApp o solicita una demo gratis. Software de gestión clínica y SEREMI para ELEAM en Chile.",
    path: "/contacto",
    image: PUBLIC_ASSETS.hero.publicSrc,
    keywords: ["contacto FichaEleam", "demo software ELEAM", "WhatsApp FichaEleam"],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Contacto", url: "/contacto" },
      ]),
      contactPageJsonLd(),
      organizationJsonLd(),
    ],
  });

  const { openDemo, openWhatsApp } = useOutletContext();

  return (
        <div className="bg-white">

          {/* ── HERO DARK with mesh + creative pattern ── */}
          <section className="relative isolate overflow-hidden bg-slate-950 px-5 pb-20 pt-16 sm:pt-24">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute left-1/2 top-0 h-[380px] w-[640px] -translate-x-1/2 -translate-y-[40%] rounded-full bg-teal-500/10 blur-[90px]" />
            </div>
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 public-grid-pattern opacity-40" />

            <div className="relative mx-auto max-w-6xl">
              <PublicBreadcrumb current="Contacto" dark />

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 backdrop-blur-sm">
                <span className="relative grid h-2 w-2 place-items-center">
                  <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400/70" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                  Respuesta en menos de 24 horas hábiles
                </span>
              </div>

              <h1 className="mt-7 max-w-3xl text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Hablemos sobre tu{" "}
                <span className="relative inline-block whitespace-nowrap">
                  <span className="bg-gradient-to-br from-teal-200 via-teal-400 to-emerald-400 bg-clip-text text-transparent animate-gradient-sweep">
                    ELEAM
                  </span>
                  <svg
                    className="absolute -bottom-2 left-0 h-[10px] w-full"
                    viewBox="0 0 200 14"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 8.5 C 60 2, 140 2, 198 8.5"
                      stroke="url(#contact-underline)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="contact-underline" x1="0" y1="0" x2="200" y2="0">
                        <stop offset="0" stopColor="#5eead4" />
                        <stop offset="1" stopColor="#34d399" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
                Cuéntanos sobre tu residencia y te mostramos cómo FichaEleam ordena el cuidado diario, la Carpeta SEREMI y la cobranza, incluidos los respaldos y recordatorios por correo. Respondemos solicitudes de demo y consultas comerciales en horario hábil de Chile.
              </p>

              <div className="mt-9 grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-3 lg:gap-10">
                {[
                  { v: "< 24 h", l: "respuesta a demo" },
                  { v: "Chile", l: "soporte local" },
                  { v: "30 días", l: "demo gratis" },
                ].map(({ v, l }) => (
                  <div key={l}>
                    <p className="text-2xl font-bold text-white sm:text-3xl">{v}</p>
                    <p className="mt-1 text-xs text-slate-500">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CANALES ── */}
          <PublicSection eyebrow="Canales" title="Elige la forma más directa de avanzar">
            <div className="grid gap-5 md:grid-cols-2">

              {/* Demo */}
              <article className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-8 shadow-sm">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-teal-700">
                  <PublicIcon name="document" className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-teal-950">Demo gratis</h2>
                <p className="mt-3 text-sm leading-6 text-teal-800">
                  Solicita una cuenta real con 30 días de prueba. Revisamos tu caso y te enviamos el acceso en menos de 24 horas. Sin tarjeta de crédito.
                </p>
                <ul className="mt-4 space-y-2">
                  {["30 días de acceso completo", "Todos los módulos habilitados", "Soporte para comenzar"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-teal-800">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-teal-100">
                        <PublicIcon name="check" className="h-3 w-3 text-teal-700" strokeWidth={3} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => openDemo("contacto_demo")}
                  className={`${PUBLIC_BUTTON.primary} mt-6 w-full`}
                >
                  Solicitar demo gratis
                </button>
                <div aria-hidden className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-teal-400 opacity-10 blur-2xl" />
              </article>

              {/* WhatsApp */}
              <article className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-8 shadow-sm">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600">
                  <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.549 4.12 1.511 5.855L.057 23.82a.5.5 0 0 0 .61.61l5.962-1.453A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75A9.75 9.75 0 1 1 12 2.25a9.75 9.75 0 0 1 0 19.5z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-emerald-950">WhatsApp</h2>
                <p className="mt-3 text-sm leading-6 text-emerald-800">
                  Para consultas rápidas de producto, planes, implementación o activación. Respondemos en horario hábil.
                </p>
                <ul className="mt-4 space-y-2">
                  {["Consultas de producto y planes", "Coordinación de implementación", "Soporte comercial"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-emerald-800">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-100">
                        <PublicIcon name="check" className="h-3 w-3 text-emerald-700" strokeWidth={3} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => openWhatsApp("contacto")}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  Consultar por WhatsApp
                </button>
                <div aria-hidden className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-emerald-400 opacity-10 blur-2xl" />
              </article>
            </div>
          </PublicSection>

          {/* ── INFO ── */}
          <PublicSection tone="soft" eyebrow="Información comercial" title="Datos útiles antes de escribirnos">
            <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                {[
                  ["Empresa", "FichaEleam"],
                  ["Producto", "Software de gestión clínica y acreditación SEREMI para ELEAM en Chile"],
                  ["Marco normativo", "Decreto N°20, Ley 20.584, Ley 19.628"],
                  ["Ubicación", "Santiago, Chile · 100% web"],
                  ["Horario", "Lunes a viernes, 9:00 a 19:00 (hora de Chile)"],
                  ["Pago", "MercadoPago, en pesos chilenos"],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-2 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:grid-cols-[180px_1fr]">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                    <p className="text-sm text-slate-700">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 content-start">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-teal-50">
                    <PublicIcon name="document" className="h-5 w-5 text-teal-700" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-950">Antes de contactar</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-600">Revisa módulos, precios y FAQ para llegar con una pregunta más precisa.</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Recursos útiles</p>
                  <div className="grid gap-2.5">
                    <Link to="/software-eleam" onClick={() => trackEvent("nav_click", "contacto_software")} className="text-sm font-medium text-teal-700 hover:underline">
                      Ver software ELEAM →
                    </Link>
                    <Link to="/acreditacion-seremi" onClick={() => trackEvent("nav_click", "contacto_seremi")} className="text-sm font-medium text-teal-700 hover:underline">
                      Guía acreditación SEREMI →
                    </Link>
                    <Link to="/preguntas-frecuentes" onClick={() => trackEvent("nav_click", "contacto_faq")} className="text-sm font-medium text-teal-700 hover:underline">
                      Preguntas frecuentes →
                    </Link>
                    <Link to="/pago" onClick={() => trackEvent("nav_click", "contacto_precios")} className="text-sm font-medium text-teal-700 hover:underline">
                      Planes y precios →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </PublicSection>
        </div>
  );
}
