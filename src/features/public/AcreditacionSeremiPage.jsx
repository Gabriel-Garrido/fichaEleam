import { Link } from "react-router-dom";
import { useSEO, faqJsonLd, breadcrumbJsonLd, howToJsonLd } from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import PublicShell from "./PublicShell";
import { PUBLIC_ASSETS, PUBLIC_BUTTON } from "./publicDesignAssets";
import {
  CheckList,
  FaqDisclosure,
  ProductImage,
  PublicBadge,
  PublicBreadcrumb,
  PublicCtaBand,
  PublicMetric,
  PublicSection,
} from "./PublicDesign";
import {
  DECRETO20_AMBITOS,
  DECRETO20_COPY,
  DECRETO20_FAQ,
  DECRETO20_META,
  DECRETO20_REQUISITOS,
} from "../../content/decreto20Eleam";

const AMBITOS = DECRETO20_AMBITOS.map((ambito) => [
  ambito.codigo,
  ambito.nombre,
  ambito.descripcion,
  ambito.articulo_ref,
]);

const STEPS = [
  {
    name: "Fija la autorización sanitaria",
    text: "Ordena solicitud, resolución, vigencia, observaciones SEREMI, cierre y modificaciones relevantes del establecimiento.",
  },
  {
    name: "Mapea infraestructura y seguridad",
    text: "Revisa ubicación, accesibilidad, habitaciones, baños, evacuación, incendios, cocina, sala de salud, medicamentos y residuos.",
  },
  {
    name: "Valida dirección técnica y dotación",
    text: "Registra jornada, reemplazante, competencias, capacitación anual de 22 horas y cálculo de personal por dependencia.",
  },
  {
    name: "Completa ingreso y carpeta personal",
    text: "Consentimiento voluntario, contrato, inventario, evaluaciones funcional, cognitiva y nutricional, historial social y de salud.",
  },
  {
    name: "Mantén registros operativos vivos",
    text: "Programa de atención integral usuaria, medicamentos, eventos críticos, red de salud, reclamos y entrega de derechos/deberes.",
  },
  {
    name: "Prepara modo fiscalización",
    text: "Consolida brechas críticas, evidencias descargables, reporte SENAMA, transitorios y trazabilidad por artículo del Decreto N°20.",
  },
];

const VENCIMIENTOS = DECRETO20_REQUISITOS
  .filter((requisito) => requisito.requiere_vencimiento)
  .slice(0, 12)
  .map((requisito) => [
    requisito.nombre,
    requisito.vigencia_dias_sugerida ? `${requisito.vigencia_dias_sugerida} días` : "Según evidencia",
    requisito.articulo_ref,
  ]);

const FAQ = [
  ...DECRETO20_FAQ,
  {
    q: "¿La documentación digital ayuda ante una fiscalización?",
    a: "Sí, siempre que sea consultable, verificable y trazable. FichaEleam organiza evidencias por artículo, mantiene historial y genera una carpeta imprimible.",
  },
];

export default function AcreditacionSeremiPage() {
  usePageView("/acreditacion-seremi");

  useSEO({
    title: "Acreditación SEREMI ELEAM · Guía Decreto N°20 MINSAL",
    description:
      "Guía de acreditación SEREMI para ELEAM en Chile: Decreto N°20 MINSAL, vigencia, transitorios, registros, dotación, programa integral y carpeta fiscalizable.",
    path: "/acreditacion-seremi",
    image: PUBLIC_ASSETS.comparison.publicSrc,
    keywords: [
      "acreditación SEREMI ELEAM",
      "Decreto 20 ELEAM",
      "DS 20 MINSAL",
      "carpeta SEREMI",
      "requisitos ELEAM Chile",
      "fiscalización SEREMI residencia",
    ],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Acreditación SEREMI", url: "/acreditacion-seremi" },
      ]),
      faqJsonLd(FAQ),
      howToJsonLd({
        name: "Cómo preparar la carpeta SEREMI DS 20 de un ELEAM en Chile",
        description: "Pasos para reunir documentación y registros vivos exigidos por el Decreto N°20.",
        totalTime: "P30D",
        steps: STEPS,
      }),
    ],
  });

  return (
    <PublicShell current="/acreditacion-seremi">
      {({ openDemo }) => (
        <div className="bg-white">
          <section className="bg-slate-50 px-5 py-14 sm:py-20">
            <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <PublicBreadcrumb current="Acreditación SEREMI" />
                <PublicBadge tone="amber">Guía Decreto N°20</PublicBadge>
                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Acreditación SEREMI para ELEAM, alineada al Decreto N°20
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  {DECRETO20_COPY.propuestaSegura} Controla evidencias por artículo, registros vivos, brechas críticas y plazos transitorios.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => openDemo("seremi_hero")} className={PUBLIC_BUTTON.primary}>
                    Solicitar demo gratuito
                  </button>
                  <button
                    type="button"
                    onClick={() => { document.getElementById("ambitos")?.scrollIntoView({ behavior: "smooth" }); trackEvent("cta_click", "seremi_ver_ambitos"); }}
                    className={PUBLIC_BUTTON.secondary}
                  >
                    Ver matriz DS 20
                  </button>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  <PublicMetric value="DS20" label="Norma vigente" tone="teal" />
                  <PublicMetric value={String(AMBITOS.length)} label="Secciones" tone="sky" />
                  <PublicMetric value={String(DECRETO20_REQUISITOS.length)} label="Controles" tone="amber" />
                </div>
              </div>
              <ProductImage asset={PUBLIC_ASSETS.comparison} priority />
            </div>
          </section>

          <PublicSection
            eyebrow="Contexto normativo"
            title="La carpeta SEREMI no es solo un archivador: es evidencia operativa"
            description={`El Decreto N°20 rige desde ${DECRETO20_META.vigenciaDesde}; exige documentos, registros, protocolos, derechos, programa integral y fiscalización trazable.`}
          >
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6 lg:col-span-2">
                <h2 className="text-xl font-semibold text-slate-950">Qué debe resolver una carpeta digital</h2>
                <div className="mt-5">
                  <CheckList items={[
                    "Ordenar evidencias por artículo y requisito del Decreto N°20.",
                    "Registrar fecha de emisión y vencimiento cuando corresponde.",
                    "Mantener versiones anteriores sin perder historial.",
                    "Asignar responsable y plazo a observaciones de fiscalización.",
                    "Diferenciar evidencia documental de registros operativos generados en la app.",
                  ]} />
                </div>
              </div>
              <div className="grid gap-4">
                <PublicMetric value="SEREMI" label="Autoridad sanitaria regional" tone="slate" />
                <PublicMetric value="PDF" label="Respaldo imprimible por ámbito" tone="teal" />
              </div>
            </div>
          </PublicSection>

          <PublicSection id="ambitos" tone="soft" eyebrow="Marco oficial" title="Matriz DS 20 por artículos y registros fiscalizables" center>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {AMBITOS.map(([codigo, nombre, desc, articulo]) => (
                <article key={codigo} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-50 text-sm font-bold text-teal-800">
                      {articulo}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">{nombre}</h3>
                      <p className="mt-1 text-[11px] font-semibold text-teal-700">{codigo}</p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-600">{desc}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </PublicSection>

          <PublicSection eyebrow="Paso a paso" title="Cómo preparar la carpeta SEREMI">
            <ol className="grid gap-4 md:grid-cols-2">
              {STEPS.map((step, index) => (
                <li key={step.name} className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-700 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-950">{step.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </PublicSection>

          <PublicSection
            tone="soft"
            eyebrow="Vencimientos"
            title="Evidencias con vigencia sugerida"
            description="El catálogo distingue documentos periódicos, registros vivos y controles críticos que conviene revisar antes de una fiscalización."
          >
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Documento</th>
                    <th className="px-4 py-3 font-semibold">Vigencia</th>
                    <th className="px-4 py-3 font-semibold">Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {VENCIMIENTOS.map(([doc, vigencia, ambito]) => (
                    <tr key={doc}>
                      <td className="px-4 py-3 text-slate-800">{doc}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{vigencia}</td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{ambito}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PublicSection>

          <PublicSection eyebrow="Carpeta digital" title="Cómo FichaEleam ayuda a mantener la acreditación">
            <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <ProductImage asset={PUBLIC_ASSETS.software} />
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                  <CheckList items={[
                  "Matriz Decreto N°20 con artículos y criticidad.",
                  "Evidencias versionadas con vencimiento.",
                  "Estados claros por requisito: vigente, pendiente, en revisión, vencido u observado.",
                  "Observaciones SEREMI con responsable y plazo.",
                  "Respaldo imprimible para revisión o fiscalización.",
                ]} />
              </div>
            </div>
          </PublicSection>

          <PublicSection tone="soft" eyebrow="FAQ" title="Preguntas frecuentes sobre acreditación SEREMI" center>
            <div className="mx-auto grid max-w-4xl gap-3">
              {FAQ.map((item) => <FaqDisclosure key={item.q} q={item.q} a={item.a} />)}
            </div>
            <p className="mt-8 text-center text-sm text-slate-500">
              ¿Otra pregunta? <Link to="/preguntas-frecuentes" className="font-semibold text-teal-700 hover:underline">Revisa la FAQ</Link>, <Link to="/calculadora-dotacion-eleam" className="font-semibold text-teal-700 hover:underline">calcula tu dotación de personal</Link> o <Link to="/contacto" className="font-semibold text-teal-700 hover:underline">contáctanos</Link>.
            </p>
          </PublicSection>

          <PublicCtaBand
            title="Llega a la próxima fiscalización con más control"
            text="FichaEleam ordena evidencias, vencimientos y observaciones SEREMI junto con la operación clínica del ELEAM."
            primaryLabel="Solicitar demo gratuito"
            onPrimary={openDemo}
            source="seremi_footer"
            secondaryLabel="Ver software para ELEAM"
            secondaryTo="/software-eleam"
          />
        </div>
      )}
    </PublicShell>
  );
}
