import { Link } from "react-router-dom";
import { useSEO, breadcrumbJsonLd, organizationJsonLd } from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import PublicShell from "./PublicShell";

const SITE = "https://fichaeleam.cl";

function contactPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contacto FichaEleam",
    "url": `${SITE}/contacto`,
    "description": "Contacta a FichaEleam por correo, WhatsApp o solicita una demo gratuita para tu ELEAM en Chile.",
    "mainEntity": {
      "@type": "Organization",
      "name": "FichaEleam",
      "email": "contacto@fichaeleam.cl",
      "telephone": "+56-9-5118-7764",
      "url": SITE,
      "areaServed": { "@type": "Country", "name": "Chile" },
      "availableLanguage": ["es-CL"],
    },
  };
}

export default function ContactoPage() {
  usePageView("/contacto");

  useSEO({
    title: "Contacto · FichaEleam",
    description: "Contacto FichaEleam: correo contacto@fichaeleam.cl, WhatsApp +56 9 5118 7764 y solicitud de demo gratuito. Software para ELEAM en Chile.",
    path: "/contacto",
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

  return (
    <PublicShell current="/contacto">
      {({ openDemo }) => (
        <>
          <section className="bg-slate-950 text-white px-5 pt-20 pb-20">
            <div className="max-w-4xl mx-auto">
              <nav className="text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
                <Link to="/" className="hover:text-teal-300">Inicio</Link>
                <span className="mx-2">/</span>
                <span className="text-slate-300">Contacto</span>
              </nav>
              <p className="text-xs font-bold text-teal-400 uppercase tracking-[0.2em] mb-4">Hablemos</p>
              <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-5">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">Contacto</span>
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
                Cuéntanos sobre tu ELEAM. Te respondemos en horario hábil con prioridad a casos urgentes y demos.
              </p>
            </div>
          </section>

          <section className="bg-white px-5 py-16">
            <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Demo */}
              <article className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-6 shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-600 text-white mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="font-bold text-slate-900 text-lg mb-2">Demo gratuito</h2>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Cuenta real con 30 días de prueba sin tarjeta de crédito. Aprobamos cada solicitud en menos de
                  24 horas.
                </p>
                <button
                  type="button"
                  onClick={() => openDemo("contacto_demo")}
                  className="bg-teal-600 text-white font-semibold py-2.5 px-5 rounded-xl hover:bg-teal-700 text-sm w-full"
                >
                  Solicitar demo
                </button>
              </article>

              {/* WhatsApp */}
              <article className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 text-white mb-4">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </div>
                <h2 className="font-bold text-slate-900 text-lg mb-2">WhatsApp</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  La forma más rápida de hablar con nuestro equipo. Respuesta en minutos en horario hábil.
                </p>
                <a
                  href="https://wa.me/56951187764?text=Hola%2C%20quiero%20información%20sobre%20FichaEleam%20para%20mi%20ELEAM."
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("cta_click", "contacto_whatsapp")}
                  className="inline-block bg-emerald-500 text-white font-semibold py-2.5 px-5 rounded-xl hover:bg-emerald-600 text-sm w-full text-center"
                >
                  +56 9 5118 7764
                </a>
              </article>

              {/* Email */}
              <article className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-600 text-white mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="font-bold text-slate-900 text-lg mb-2">Correo electrónico</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Para temas comerciales, soporte o consultas sobre la plataforma. Respondemos en menos de 24
                  horas.
                </p>
                <a
                  href="mailto:contacto@fichaeleam.cl"
                  onClick={() => trackEvent("cta_click", "contacto_email")}
                  className="inline-block bg-sky-600 text-white font-semibold py-2.5 px-5 rounded-xl hover:bg-sky-700 text-sm w-full text-center break-all"
                >
                  contacto@fichaeleam.cl
                </a>
              </article>
            </div>
          </section>

          <section className="bg-slate-50 px-5 py-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-8 text-center">
                Información comercial
              </h2>

              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
                {[
                  ["Empresa", "FichaEleam"],
                  ["Producto", "Software de gestión clínica y acreditación SEREMI para ELEAM en Chile"],
                  ["Marco normativo", "DS 14/2017 (MINSAL), Ley N° 20.584, Ley N° 19.628"],
                  ["Ubicación", "Santiago, Chile · 100% web"],
                  ["Idioma de soporte", "Español"],
                  ["Horario de atención", "Lunes a viernes, 9:00 a 19:00 (hora de Chile)"],
                  ["Forma de pago", "MercadoPago (tarjeta de crédito o débito)"],
                  ["Moneda", "Pesos chilenos (CLP), precios netos sin IVA"],
                ].map(([label, value]) => (
                  <div key={label} className="px-5 py-4 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 sm:items-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
                    <p className="text-sm text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white px-5 py-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 text-center">
                Antes de contactarnos
              </h2>
              <p className="text-slate-500 text-center mb-10 max-w-2xl mx-auto">
                Si tu pregunta es comercial o sobre el producto, estos recursos pueden ahorrarte tiempo:
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  to="/preguntas-frecuentes"
                  className="block bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-teal-200 hover:bg-teal-50/40 transition-all"
                >
                  <p className="font-bold text-slate-900 text-sm mb-1">FAQ completa</p>
                  <p className="text-xs text-slate-500">Producto, precios, demo, implementación, seguridad y soporte.</p>
                </Link>
                <Link
                  to="/software-eleam"
                  className="block bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-teal-200 hover:bg-teal-50/40 transition-all"
                >
                  <p className="font-bold text-slate-900 text-sm mb-1">Software ELEAM</p>
                  <p className="text-xs text-slate-500">Módulos, comparativa vs Excel, cumplimiento normativo.</p>
                </Link>
                <Link
                  to="/acreditacion-seremi"
                  className="block bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-teal-200 hover:bg-teal-50/40 transition-all"
                >
                  <p className="font-bold text-slate-900 text-sm mb-1">Acreditación SEREMI</p>
                  <p className="text-xs text-slate-500">Los 14 ámbitos del DS 14/2017 y cómo preparar la carpeta.</p>
                </Link>
                <Link
                  to="/pago"
                  className="block bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-teal-200 hover:bg-teal-50/40 transition-all"
                >
                  <p className="font-bold text-slate-900 text-sm mb-1">Planes y precios</p>
                  <p className="text-xs text-slate-500">Tres planes mensuales en CLP y opción institucional.</p>
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </PublicShell>
  );
}
