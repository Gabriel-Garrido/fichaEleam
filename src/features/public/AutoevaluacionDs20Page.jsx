import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  useSEO,
  faqJsonLd,
  breadcrumbJsonLd,
  webApplicationJsonLd,
} from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import { PUBLIC_ASSETS, PUBLIC_BUTTON } from "./publicDesignAssets";
import {
  FaqDisclosure,
  PublicBadge,
  PublicBreadcrumb,
  PublicCtaBand,
  PublicMetric,
  PublicSection,
} from "./PublicDesign";
import {
  AUTOEVALUACION_FAQ,
  AUTOEVALUACION_ITEMS,
  AUTOEVALUACION_META,
  AUTOEVAL_NIVEL_COPY,
  autoevalEventValue,
  scoreAutoevaluacion,
} from "../../content/autoevaluacionDs20";

const NIVEL_STYLE = {
  alto: { ring: "border-emerald-200 bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" },
  medio: { ring: "border-amber-200 bg-amber-50", text: "text-amber-700", bar: "bg-amber-500" },
  bajo: { ring: "border-rose-200 bg-rose-50", text: "text-rose-700", bar: "bg-rose-500" },
};

function PreguntaCard({ item, index, value, onAnswer }) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">
            {index + 1} · {item.ambito} <span className="font-medium normal-case text-slate-400">({item.articulo})</span>
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-900 sm:text-base">{item.pregunta}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{item.ayuda}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2" role="group" aria-label={`Respuesta: ${item.ambito}`}>
        {[
          { v: true, label: "Sí" },
          { v: false, label: "No / parcial" },
        ].map(({ v, label }) => {
          const active = value === v;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              onClick={() => onAnswer(item.id, v)}
              className={`min-h-11 flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors sm:flex-none sm:px-6 ${
                active
                  ? v
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-rose-500 bg-rose-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </li>
  );
}

export default function AutoevaluacionDs20Page() {
  usePageView("/autoevaluacion-decreto-20");
  const { openDemo } = useOutletContext();
  const [respuestas, setRespuestas] = useState({});
  const resultRef = useRef(null);

  const score = useMemo(() => scoreAutoevaluacion(respuestas), [respuestas]);

  const onAnswer = (id, value) => {
    setRespuestas((prev) => ({ ...prev, [id]: value }));
  };

  // Registra el uso una vez completadas las 10 respuestas (con debounce por si corrige).
  const lastTracked = useRef(null);
  useEffect(() => {
    if (!score.completo) return undefined;
    const value = autoevalEventValue(score);
    const timer = setTimeout(() => {
      if (value && value !== lastTracked.current) {
        lastTracked.current = value;
        trackEvent("tool_use", "autoevaluacion_ds20", value);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [score]);

  useEffect(() => {
    if (score.completo && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [score.completo]);

  const seremiAsset = PUBLIC_ASSETS.seremi ?? PUBLIC_ASSETS.comparison;

  useSEO({
    title: "Autoevaluación Decreto N°20 para ELEAM · Test gratuito",
    description:
      "Responde 10 preguntas y mide qué tan preparado está tu ELEAM ante una fiscalización SEREMI según el Decreto N°20: dotación, emergencias, reclamos y evidencia.",
    path: "/autoevaluacion-decreto-20",
    image: seremiAsset.publicSrc,
    keywords: [
      "autoevaluación Decreto 20",
      "test fiscalización SEREMI ELEAM",
      "checklist Decreto N°20",
      "cumplimiento ELEAM Chile",
      "preparación fiscalización ELEAM",
      "requisitos Decreto 20 ELEAM",
    ],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Autoevaluación Decreto N°20", url: "/autoevaluacion-decreto-20" },
      ]),
      faqJsonLd(AUTOEVALUACION_FAQ),
      webApplicationJsonLd({
        name: AUTOEVALUACION_META.nombre,
        description: AUTOEVALUACION_META.descripcion,
        path: "/autoevaluacion-decreto-20",
        image: seremiAsset.publicSrc,
        featureList: [
          "10 preguntas clave del Decreto N°20",
          "Porcentaje de preparación inmediato",
          "Detalle de brechas con artículo del decreto",
          "Recursos gratuitos por cada brecha detectada",
        ],
      }),
    ],
  });

  const nivelStyle = NIVEL_STYLE[score.nivel] ?? NIVEL_STYLE.bajo;
  const nivelCopy = AUTOEVAL_NIVEL_COPY[score.nivel];

  return (
    <div className="bg-white">
      <section className="bg-slate-50 px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <PublicBreadcrumb current="Autoevaluación Decreto N°20" />
            <PublicBadge tone="teal">Test gratuito · 3 minutos · Sin registro</PublicBadge>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              ¿Qué tan preparado está tu ELEAM para una fiscalización?
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Responde 10 preguntas sobre los requisitos clave del Decreto N°20 — dotación, emergencias,
              protocolos, ingreso, reclamos y evidencia — y obtén tu nivel de preparación con las brechas
              que deberías cerrar primero.
            </p>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              <PublicMetric value="10" label="Requisitos clave" tone="teal" />
              <PublicMetric value="3 min" label="Sin registro" tone="sky" />
              <PublicMetric value="2028" label="Fin plazo general" tone="amber" />
            </div>
            <p className="mt-6 max-w-xl text-xs leading-5 text-slate-500">{AUTOEVALUACION_META.disclaimer}</p>
          </div>
        </div>
      </section>

      <PublicSection
        id="autoevaluacion"
        eyebrow="Autoevaluación"
        title="Responde con honestidad: nadie más ve tus respuestas"
        description="Marca «Sí» solo si hoy puedes respaldar el requisito con evidencia vigente. Si dudas, marca «No / parcial»: es la forma de detectar la brecha a tiempo."
      >
        <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <ol className="grid gap-3">
            {AUTOEVALUACION_ITEMS.map((item, index) => (
              <PreguntaCard
                key={item.id}
                item={item}
                index={index}
                value={respuestas[item.id] ?? null}
                onAnswer={onAnswer}
              />
            ))}
          </ol>

          {/* Resultado sticky */}
          <div ref={resultRef} className="lg:sticky lg:top-24">
            <div className={`rounded-3xl border p-6 shadow-sm transition-colors sm:p-8 ${score.completo ? nivelStyle.ring : "border-slate-200 bg-white"}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tu resultado</p>
              <div className="mt-3 flex items-end gap-2">
                <p className={`font-display text-5xl font-semibold tabular-nums ${score.completo ? nivelStyle.text : "text-slate-950"}`}>
                  {score.pct}%
                </p>
                <p className="pb-1.5 text-sm text-slate-500 tabular-nums">{score.respondidas}/{score.total} respondidas</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/70" role="progressbar" aria-valuenow={score.pct} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${score.completo ? nivelStyle.bar : "bg-teal-500"}`}
                  style={{ width: `${score.pct}%` }}
                />
              </div>

              {score.completo ? (
                <div className="mt-5">
                  <p className={`text-base font-bold ${nivelStyle.text}`}>{nivelCopy.titulo}</p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-700">{nivelCopy.texto}</p>
                  {score.pendientes.length > 0 && (
                    <div className="mt-5">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Brechas detectadas ({score.pendientes.length})
                      </p>
                      <ul className="mt-2 space-y-2">
                        {score.pendientes.map((item) => (
                          <li key={item.id} className="rounded-xl border border-white/60 bg-white/70 px-3 py-2.5">
                            <p className="text-sm font-semibold text-slate-800">
                              {item.ambito} <span className="text-xs font-medium text-slate-400">({item.articulo})</span>
                            </p>
                            {item.recurso && (
                              <Link
                                to={item.recurso.to}
                                onClick={() => trackEvent("nav_click", `autoeval_recurso_${item.id}`)}
                                className="mt-0.5 inline-flex text-xs font-semibold text-teal-700 hover:underline"
                              >
                                {item.recurso.label} →
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => openDemo("autoevaluacion_demo")}
                    className={`${PUBLIC_BUTTON.primary} mt-6 w-full`}
                  >
                    Cerrar estas brechas con FichaEleam
                  </button>
                  <p className="mt-3 text-center text-[11px] text-slate-500">
                    Demo real de 30 días · sin tarjeta de crédito
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-slate-500">
                  Responde las {score.total} preguntas para ver tu nivel de preparación y las brechas
                  que conviene cerrar antes de una fiscalización.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs leading-5 text-slate-500">
              ¿Quieres saber cuánto plazo te queda para adecuarte?{" "}
              <Link to="/plazos-decreto-20" className="font-semibold text-teal-700 hover:underline">
                Revisa los plazos del Decreto N°20 →
              </Link>
            </div>
          </div>
        </div>
      </PublicSection>

      <PublicSection
        id="que-evalua"
        tone="soft"
        eyebrow="Qué evalúa"
        title="Los 10 frentes que revisa la SEREMI"
        description="Cada pregunta corresponde a un grupo de requisitos del Decreto N°20 que la autoridad sanitaria verifica con evidencia documental u operacional."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {AUTOEVALUACION_ITEMS.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-teal-700">{item.articulo}</p>
              <p className="mt-1 text-sm font-semibold leading-snug text-slate-900">{item.ambito}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection id="faq" eyebrow="FAQ" title="Preguntas frecuentes sobre la autoevaluación" center>
        <div className="mx-auto grid max-w-4xl gap-3">
          {AUTOEVALUACION_FAQ.map((item) => <FaqDisclosure key={item.q} q={item.q} a={item.a} />)}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          ¿Otra duda? <Link to="/preguntas-frecuentes" className="font-semibold text-teal-700 hover:underline">Revisa la FAQ</Link> o <Link to="/contacto" className="font-semibold text-teal-700 hover:underline">contáctanos</Link>.
        </p>
      </PublicSection>

      <PublicCtaBand
        title="De la autoevaluación al cumplimiento real"
        text="FichaEleam digitaliza la evidencia de los 10 frentes de este test: dotación, emergencias, protocolos, ingreso, reclamos y la Carpeta SEREMI completa."
        primaryLabel="Solicitar demo gratis"
        onPrimary={openDemo}
        source="autoevaluacion_footer"
        secondaryLabel="Ver plazos del decreto"
        secondaryTo="/plazos-decreto-20"
      />
    </div>
  );
}
