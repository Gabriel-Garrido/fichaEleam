import { useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useSEO, faqJsonLd, breadcrumbJsonLd } from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import { PUBLIC_ASSETS, PUBLIC_BUTTON } from "./publicDesignAssets";
import {
  CheckList,
  FaqDisclosure,
  PublicBadge,
  PublicBreadcrumb,
  PublicCtaBand,
  PublicMetric,
  PublicSection,
} from "./PublicDesign";
import {
  PLAZOS_FAQ,
  PLAZOS_HITOS,
  PLAZOS_META,
  diasRestantesPlazo,
  plazoEstado,
} from "../../content/plazosDecreto20";

const ESTADO_STYLE = {
  vencido: { badge: "bg-slate-200 text-slate-600", card: "border-slate-200 bg-white", label: "En vigencia" },
  urgente: { badge: "bg-rose-100 text-rose-700", card: "border-rose-200 bg-rose-50/60", label: "Menos de 1 año" },
  vigente: { badge: "bg-teal-100 text-teal-800", card: "border-teal-100 bg-white", label: "Plazo abierto" },
};

function formatoDias(dias) {
  if (dias < 0) return null;
  const meses = Math.floor(dias / 30.44);
  if (meses >= 12) {
    const anios = Math.floor(meses / 12);
    const resto = meses % 12;
    return resto > 0 ? `${anios} año${anios > 1 ? "s" : ""} y ${resto} mes${resto > 1 ? "es" : ""}` : `${anios} año${anios > 1 ? "s" : ""}`;
  }
  if (meses >= 2) return `${meses} meses`;
  return `${dias} días`;
}

function HitoCard({ hito, index }) {
  const dias = diasRestantesPlazo(hito.fecha);
  const estado = plazoEstado(dias);
  const style = ESTADO_STYLE[estado];
  const restante = formatoDias(dias);
  return (
    <li className={`relative rounded-3xl border p-6 shadow-sm sm:p-8 ${style.card}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-700 text-sm font-semibold text-white">
          {index + 1}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${style.badge}`}>{style.label}</span>
      </div>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{hito.titulo}</h3>
      <p className="mt-1 text-sm font-semibold text-teal-700">{hito.fechaLegible}</p>
      {restante ? (
        <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-slate-950">
          {restante}
          <span className="ml-2 align-middle text-sm font-normal text-slate-500">restantes</span>
        </p>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-600">Rige desde el {hito.fechaLegible}.</p>
      )}
      <p className="mt-3 text-sm leading-6 text-slate-600">{hito.descripcion}</p>
      <div className="mt-4 border-t border-slate-200/70 pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Qué deberías tener listo</p>
        <ul className="mt-2 space-y-1.5">
          {hito.acciones.map((accion) => (
            <li key={accion} className="flex gap-2 text-sm leading-6 text-slate-700">
              <svg className="mt-1 h-4 w-4 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {accion}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export default function PlazosDecreto20Page() {
  usePageView("/plazos-decreto-20");
  const { openDemo } = useOutletContext();
  const seremiAsset = PUBLIC_ASSETS.seremi ?? PUBLIC_ASSETS.comparison;

  const plazoGeneral = useMemo(() => {
    const hito = PLAZOS_HITOS.find((h) => h.id === "general");
    return formatoDias(diasRestantesPlazo(hito.fecha)) ?? "Vencido";
  }, []);

  useSEO({
    title: "Plazos del Decreto N°20: cuándo debe adecuarse tu ELEAM",
    description:
      "Fechas clave del Decreto N°20 para ELEAM: vigencia desde octubre 2025, adecuación general hasta octubre 2028 y certificación contra incendios hasta octubre 2030.",
    path: "/plazos-decreto-20",
    image: seremiAsset.publicSrc,
    keywords: [
      "plazos Decreto 20 ELEAM",
      "período transitorio Decreto N°20",
      "cuándo entra en vigencia Decreto 20",
      "adecuación ELEAM 2028",
      "certificación incendios ELEAM 2030",
      "fiscalización SEREMI plazos",
    ],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Plazos del Decreto N°20", url: "/plazos-decreto-20" },
      ]),
      faqJsonLd(PLAZOS_FAQ),
    ],
  });

  return (
    <div className="bg-white">
      <section className="bg-slate-50 px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <PublicBreadcrumb current="Plazos del Decreto N°20" />
            <PublicBadge tone="amber">Período transitorio · Fechas oficiales</PublicBadge>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Plazos del Decreto N°20: cuánto tiempo le queda a tu ELEAM
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              El nuevo reglamento de ELEAM rige desde el 1 de octubre de 2025. Los establecimientos
              existentes tienen <strong>3 años para adecuarse</strong> (hasta octubre 2028) y{" "}
              <strong>5 años para la certificación contra incendios</strong> (hasta octubre 2030).
              Aquí están las fechas, lo que exige cada hito y por dónde empezar.
            </p>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              <PublicMetric value="2025" label="Vigencia" tone="teal" />
              <PublicMetric value="2028" label="Adecuación general" tone="amber" />
              <PublicMetric value="2030" label="Incendios" tone="sky" />
            </div>
            <p className="mt-6 max-w-xl text-xs leading-5 text-slate-500">
              Fuente oficial:{" "}
              <a href={PLAZOS_META.fuenteUrl} rel="noopener nofollow" target="_blank" className="font-semibold text-teal-700 hover:underline">
                {PLAZOS_META.fuenteNombre}
              </a>. Quedan {plazoGeneral} para el fin del plazo general.
            </p>
          </div>
        </div>
      </section>

      <PublicSection
        id="hitos"
        eyebrow="Línea de tiempo"
        title="Los 3 hitos que todo ELEAM debe tener en el calendario"
        description="El tiempo corre desde la entrada en vigencia. Las brechas de infraestructura y certificación son las que más demoran: conviene partir por un diagnóstico."
      >
        <ol className="grid gap-5 lg:grid-cols-3">
          {PLAZOS_HITOS.map((hito, index) => (
            <HitoCard key={hito.id} hito={hito} index={index} />
          ))}
        </ol>
      </PublicSection>

      <PublicSection
        id="plan"
        tone="soft"
        eyebrow="Plan de adecuación"
        title="Cómo llegar a 2028 con el decreto cubierto"
        description="Un plan de adecuación serio combina diagnóstico, priorización por riesgo y evidencia documental siempre vigente."
      >
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <CheckList items={[
              "Diagnostica tus brechas con la autoevaluación gratuita de 10 preguntas.",
              "Prioriza por riesgo: dotación, emergencias y protocolos primero.",
              "Asigna responsable y plazo a cada brecha (matriz de adecuación).",
              "Digitaliza la evidencia para que nunca venza sin aviso.",
              "Registra simulacros, capacitaciones y reclamos durante todo el año.",
            ]} />
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/autoevaluacion-decreto-20"
                onClick={() => trackEvent("nav_click", "plazos_to_autoevaluacion")}
                className={PUBLIC_BUTTON.primary}
              >
                Hacer la autoevaluación gratis
              </Link>
              <Link to="/acreditacion-seremi" className={PUBLIC_BUTTON.secondary}>
                Ver guía SEREMI
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Por qué no conviene esperar</p>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-amber-900">
              <li>
                <strong>Las obras demoran.</strong> Certificaciones eléctricas, de gas y de incendios dependen de terceros y de presupuesto: los últimos meses del plazo serán los más caros.
              </li>
              <li>
                <strong>La SEREMI ya fiscaliza con el decreto vigente.</strong> Las observaciones tienen plazos breves de subsanación y quedan en el historial del establecimiento.
              </li>
              <li>
                <strong>La evidencia se construye en el tiempo.</strong> Simulacros anuales, capacitación y registros diarios no se pueden improvisar la semana antes de la visita.
              </li>
            </ul>
          </div>
        </div>
      </PublicSection>

      <PublicSection id="faq" eyebrow="FAQ" title="Preguntas frecuentes sobre los plazos" center>
        <div className="mx-auto grid max-w-4xl gap-3">
          {PLAZOS_FAQ.map((item) => <FaqDisclosure key={item.q} q={item.q} a={item.a} />)}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          ¿Otra duda? <Link to="/preguntas-frecuentes" className="font-semibold text-teal-700 hover:underline">Revisa la FAQ</Link> o <Link to="/contacto" className="font-semibold text-teal-700 hover:underline">contáctanos</Link>.
        </p>
      </PublicSection>

      <PublicCtaBand
        title="Convierte el plazo en un plan, no en una urgencia"
        text="FichaEleam mantiene tu matriz de brechas, protocolos, simulacros y la Carpeta SEREMI con alertas de vencimiento, para llegar a 2028 sin sobresaltos."
        primaryLabel="Solicitar demo gratis"
        onPrimary={openDemo}
        source="plazos_footer"
        secondaryLabel="Hacer la autoevaluación"
        secondaryTo="/autoevaluacion-decreto-20"
      />
    </div>
  );
}
