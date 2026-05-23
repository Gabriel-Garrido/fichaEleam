import { Link, useNavigate } from "react-router-dom";
import { useSEO, faqJsonLd, breadcrumbJsonLd, howToJsonLd } from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import PublicShell from "./PublicShell";

const AMBITOS = [
  { codigo: "A01", nombre: "Antecedentes legales", desc: "Constitución, vigencia, RUT, representante legal." },
  { codigo: "A02", nombre: "Autorización sanitaria", desc: "Resolución SEREMI, permisos municipales, recepción final." },
  { codigo: "A03", nombre: "Infraestructura y condiciones sanitarias", desc: "Planos, electricidad SEC, gas, agua potable, ascensores, calderas." },
  { codigo: "A04", nombre: "Seguridad y evacuación", desc: "Plan de emergencia, extintores, simulacros, señalética y luces." },
  { codigo: "A05", nombre: "Dirección técnica", desc: "Director técnico, contrato y aceptación SEREMI." },
  { codigo: "A06", nombre: "Personal y dotación", desc: "Nómina, contratos, títulos, salud y capacitaciones." },
  { codigo: "A07", nombre: "Protocolos obligatorios", desc: "PCI, lavado de manos, medicamentos, residuos, emergencias." },
  { codigo: "A08", nombre: "Residentes y carpetas personales", desc: "Fichas, evaluaciones Barthel/MMSE, planes individualizados." },
  { codigo: "A09", nombre: "Contratos y derechos", desc: "Contrato de residencia, consentimientos, carta de derechos." },
  { codigo: "A10", nombre: "Medicamentos y registros", desc: "Inventario, kardex, recetas, controlados, QF asesor." },
  { codigo: "A11", nombre: "Alimentación y manipulación", desc: "Minutas, manipuladores, HACCP, dietas especiales." },
  { codigo: "A12", nombre: "Aseo, lavandería y plagas", desc: "Programas y bitácoras de aseo, lavandería, residuos, plagas." },
  { codigo: "A13", nombre: "Reclamos y comunicación", desc: "Libro de reclamos, sugerencias, reuniones con familias." },
  { codigo: "A14", nombre: "Fiscalizaciones y subsanaciones", desc: "Actas, plan de subsanación, comunicaciones con SEREMI." },
];

const FAQ = [
  {
    q: "¿Qué es la acreditación SEREMI de un ELEAM?",
    a: "La acreditación SEREMI es el proceso por el cual la Secretaría Regional Ministerial de Salud autoriza y supervisa el funcionamiento de un Establecimiento de Larga Estadía para Adultos Mayores (ELEAM) en Chile. Se rige por el DS 14/2017 del MINSAL e incluye autorización sanitaria, fiscalizaciones periódicas y revisión documental.",
  },
  {
    q: "¿Cuáles son los 14 ámbitos del DS 14/2017?",
    a: "Antecedentes legales, autorización sanitaria, infraestructura y condiciones sanitarias, seguridad y evacuación, dirección técnica, personal y dotación, protocolos obligatorios, residentes y carpetas personales, contratos y derechos, medicamentos, alimentación, aseo y manejo de plagas, reclamos y comunicación, fiscalizaciones y subsanaciones.",
  },
  {
    q: "¿Qué documentos debe tener la carpeta SEREMI de un ELEAM?",
    a: "Más de 70 documentos distribuidos en los 14 ámbitos: escrituras, certificados SEC, planos, plan de emergencia, contratos, títulos del personal, certificados de salud, protocolos clínicos (PCI, lavado de manos, medicamentos), fichas clínicas con Barthel y MMSE, contratos de residencia, kardex, minutas alimentarias HACCP, certificados de control de plagas, y actas de fiscalización.",
  },
  {
    q: "¿Cada cuánto fiscaliza la SEREMI a un ELEAM?",
    a: "No hay una frecuencia fija. La SEREMI fiscaliza a discreción, en respuesta a denuncias o como parte de inspecciones programadas. Lo importante es tener la carpeta SEREMI actualizada permanentemente, no solo cuando se anuncia una visita.",
  },
  {
    q: "¿Qué pasa si la SEREMI encuentra observaciones?",
    a: "El establecimiento debe presentar un plan de subsanación con plazos y responsables. Si las observaciones son graves o no se subsanan, la SEREMI puede aplicar multas, suspender la autorización o cerrar el establecimiento.",
  },
  {
    q: "¿Qué documentos se vencen y hay que renovar?",
    a: "Certificado de vigencia de la sociedad (180 días), resolución sanitaria (anual), informe de potabilidad del agua (anual), certificado de extintores (anual), fumigación (180 días), certificado de instalación eléctrica SEC (cada 3 años), certificado de salud del personal (anual), control de plagas (180 días). FichaEleam alerta 30 días antes de cada vencimiento.",
  },
  {
    q: "¿Quién es el director técnico de un ELEAM?",
    a: "Un profesional de la salud (médico, enfermera u otro autorizado) responsable de la atención clínica del establecimiento. Debe estar acreditado ante la SEREMI con su título profesional, contrato y carta de aceptación.",
  },
  {
    q: "¿Es obligatorio tener un químico farmacéutico asesor?",
    a: "Sí. Para el manejo de medicamentos, especialmente psicotrópicos y estupefacientes, el ELEAM debe contar con un QF asesor con convenio vigente. Además, el libro foliado de controlados debe estar disponible para la SEREMI.",
  },
  {
    q: "¿Cómo digitalizar la carpeta SEREMI?",
    a: "Con FichaEleam: los 14 ámbitos y los 70+ requisitos vienen pre-cargados; subes cada evidencia con fecha de vencimiento, el sistema alerta antes de la expiración y exporta la carpeta lista para imprimir o entregar a la SEREMI.",
  },
  {
    q: "¿La SEREMI acepta documentación digital?",
    a: "Sí. La SEREMI acepta evidencia digital siempre que sea consultable, verificable y mantenga la trazabilidad de quién la cargó y cuándo. FichaEleam genera un PDF imprimible y mantiene el historial inmutable.",
  },
];

const STEPS = [
  {
    name: "Reúne los antecedentes legales (Ámbito A01)",
    text: "Escritura de constitución, vigencia de la persona jurídica, RUT, iniciación de actividades en el SII y poder vigente del representante legal.",
  },
  {
    name: "Obtén la autorización sanitaria (Ámbito A02)",
    text: "Presenta el expediente a la SEREMI con planos, dotación de personal y certificado de informaciones previas municipal. Una vez emitida la resolución sanitaria, debes renovarla anualmente.",
  },
  {
    name: "Acredita infraestructura, seguridad y servicios (A03–A04)",
    text: "Certificados SEC eléctricos y de gas, análisis de agua, ascensor y calderas si aplica. Plan de emergencia firmado, extintores vigentes, simulacros documentados (mínimo 2 al año) y luces de emergencia operativas.",
  },
  {
    name: "Designa dirección técnica y dotación (A05–A06)",
    text: "Credencial vigente del director técnico, contrato firmado y aceptación SEREMI. Nómina actualizada del personal con títulos, contratos, certificados de salud y bitácora de capacitaciones.",
  },
  {
    name: "Documenta protocolos obligatorios (A07)",
    text: "Programa PCI, protocolos de lavado de manos, aislamiento, manejo de residuos, medicamentos, alimentación y deglución, y emergencias clínicas. Cada protocolo debe estar firmado y difundido.",
  },
  {
    name: "Arma carpetas individuales por residente (A08–A09)",
    text: "Ficha clínica completa, evaluación Barthel y MMSE periódicas, plan de cuidado individualizado (PAI), consentimiento informado, contrato de residencia y carta de derechos firmada.",
  },
  {
    name: "Controla medicamentos y alimentación (A10–A11)",
    text: "Inventario del botiquín, kardex de administración, recetas vigentes, libro foliado de controlados, convenio con QF asesor. Minutas visadas por nutricionista, certificados de manipuladores, bitácora HACCP y dietas especiales.",
  },
  {
    name: "Operación diaria: aseo, comunicación y fiscalizaciones (A12–A14)",
    text: "Programas y bitácoras de aseo, lavandería, residuos REAS y control de plagas. Libro de reclamos, actas de reuniones con familias. Archiva las actas de fiscalización y planes de subsanación con seguimiento.",
  },
];

export default function AcreditacionSeremiPage() {
  const navigate = useNavigate();
  usePageView("/acreditacion-seremi");

  useSEO({
    title: "Acreditación SEREMI ELEAM · Guía DS 14/2017 actualizada",
    description: "Guía completa de acreditación SEREMI para ELEAM en Chile: los 14 ámbitos del DS 14/2017, requisitos, vencimientos y cómo preparar tu carpeta SEREMI sin sorpresas.",
    path: "/acreditacion-seremi",
    keywords: [
      "acreditación SEREMI ELEAM",
      "DS 14/2017",
      "carpeta SEREMI",
      "requisitos ELEAM Chile",
      "fiscalización SEREMI residencia",
      "autorización sanitaria ELEAM",
    ],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Acreditación SEREMI", url: "/acreditacion-seremi" },
      ]),
      faqJsonLd(FAQ),
      howToJsonLd({
        name: "Cómo preparar la carpeta SEREMI de un ELEAM en Chile",
        description: "Pasos para reunir la documentación de los 14 ámbitos del DS 14/2017 y mantener la acreditación SEREMI vigente.",
        totalTime: "P30D",
        steps: STEPS,
      }),
    ],
  });

  return (
    <PublicShell current="/acreditacion-seremi">
      {({ openDemo }) => (
        <>
          {/* Hero */}
          <section className="bg-slate-950 text-white px-5 pt-20 pb-24">
            <div className="max-w-4xl mx-auto">
              <nav className="text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
                <Link to="/" className="hover:text-teal-300">Inicio</Link>
                <span className="mx-2">/</span>
                <span className="text-slate-300">Acreditación SEREMI</span>
              </nav>
              <p className="text-xs font-bold text-teal-400 uppercase tracking-[0.2em] mb-4">Guía completa · DS 14/2017</p>
              <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-5">
                Acreditación SEREMI <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">
                  para tu ELEAM
                </span>
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
                Todo lo que un director o administrador de un Establecimiento de Larga Estadía para Adultos Mayores
                debe saber sobre los <strong className="text-white">14 ámbitos</strong>, los <strong className="text-white">70+ requisitos</strong>,
                los plazos de vencimiento y cómo llegar a la fiscalización con la carpeta al día.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openDemo("seremi_hero")}
                  className="bg-teal-500 text-white font-bold py-3 px-7 rounded-xl hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/25"
                >
                  Solicitar demo gratuito
                </button>
                <button
                  type="button"
                  onClick={() => { document.getElementById("ambitos")?.scrollIntoView({ behavior: "smooth" }); trackEvent("cta_click", "seremi_ver_ambitos"); }}
                  className="border border-white/15 text-slate-300 font-semibold py-3 px-7 rounded-xl hover:bg-white/5"
                >
                  Ver los 14 ámbitos
                </button>
              </div>
            </div>
          </section>

          {/* Intro */}
          <section className="bg-white px-5 py-16">
            <div className="max-w-3xl mx-auto prose-fichaeleam">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-5">
                ¿Qué es la acreditación SEREMI?
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                La <strong>Secretaría Regional Ministerial de Salud (SEREMI)</strong> es la autoridad sanitaria
                que autoriza, supervisa y fiscaliza los ELEAM en Chile. Su marco normativo es el{" "}
                <strong>Decreto Supremo N° 14 de 2017</strong> del Ministerio de Salud, que define los requisitos
                obligatorios para operar un establecimiento.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                Cumplir con la acreditación SEREMI no es un trámite anual: es una operación permanente. Cada
                documento tiene vigencia, cada protocolo debe estar firmado y difundido al equipo, cada residente
                necesita su carpeta individualizada y cada fiscalización deja observaciones que deben subsanarse
                con plazos verificables.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Esta guía resume los <strong>14 ámbitos</strong> del DS 14/2017, los documentos que típicamente
                solicitará la SEREMI y los plazos de vencimiento más comunes.
              </p>
            </div>
          </section>

          {/* Los 14 ámbitos */}
          <section id="ambitos" className="bg-slate-50 px-5 py-20">
            <div className="max-w-5xl mx-auto">
              <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3 text-center">El marco oficial</p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 text-center mb-3">
                Los 14 ámbitos del DS 14/2017
              </h2>
              <p className="text-slate-500 text-center max-w-2xl mx-auto mb-12">
                Estos son los grupos de requisitos en los que la SEREMI organiza la inspección de un ELEAM.
                FichaEleam los trae todos pre-cargados con sus +70 requisitos.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {AMBITOS.map((a) => (
                  <article key={a.codigo} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-teal-200 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center shrink-0 w-12 h-12 rounded-xl bg-teal-50 text-teal-700 font-bold text-sm">
                        {a.codigo}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm leading-tight">{a.nombre}</h3>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{a.desc}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* Cómo preparar la carpeta */}
          <section className="bg-white px-5 py-20">
            <div className="max-w-4xl mx-auto">
              <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3">Paso a paso</p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
                Cómo preparar la carpeta SEREMI
              </h2>
              <p className="text-slate-500 mb-10 max-w-2xl">
                Una ruta de 8 hitos para llegar a la fiscalización con cada documento en su lugar.
              </p>

              <ol className="space-y-5">
                {STEPS.map((step, i) => (
                  <li key={step.name} className="flex gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-5">
                    <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-teal-600 text-white text-sm font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base mb-1.5">{step.name}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Vencimientos típicos */}
          <section className="bg-slate-50 px-5 py-20">
            <div className="max-w-4xl mx-auto">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-[0.2em] mb-3">No los olvides</p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
                Documentos que se vencen
              </h2>
              <p className="text-slate-500 mb-10 max-w-2xl">
                Estos vencimientos son la principal causa de observaciones en fiscalización. FichaEleam avisa 30 días antes.
              </p>

              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-left">
                      <th className="px-5 py-3 font-semibold text-slate-700">Documento</th>
                      <th className="px-5 py-3 font-semibold text-slate-700">Vigencia</th>
                      <th className="px-5 py-3 font-semibold text-slate-700">Ámbito</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ["Resolución sanitaria de funcionamiento", "Anual", "A02"],
                      ["Vigencia de la persona jurídica", "180 días", "A01"],
                      ["Certificado de informaciones previas (CIP)", "Anual", "A02"],
                      ["Certificado de instalación eléctrica SEC", "3 años", "A03"],
                      ["Certificado de instalación de gas SEC", "2 años", "A03"],
                      ["Informe de potabilidad del agua", "Anual", "A03"],
                      ["Fumigación y desratización", "180 días", "A03"],
                      ["Certificado de extintores", "Anual", "A04"],
                      ["Simulacros de evacuación", "180 días", "A04"],
                      ["Luces de emergencia (inspección)", "90 días", "A04"],
                      ["Credencial del director técnico", "Anual", "A05"],
                      ["Nómina actualizada del personal", "180 días", "A06"],
                      ["Certificado de salud del personal", "Anual", "A06"],
                      ["Evaluación Barthel del residente", "180 días", "A08"],
                      ["Plan de cuidado individualizado (PAI)", "180 días", "A08"],
                      ["Carta de tarifas vigente", "Anual", "A09"],
                      ["Inventario de botiquín", "90 días", "A10"],
                      ["Recetas médicas vigentes", "180 días", "A10"],
                      ["Minuta alimentaria visada", "30 días", "A11"],
                      ["Bitácora HACCP de temperaturas", "30 días", "A11"],
                      ["Control de plagas", "180 días", "A12"],
                    ].map(([doc, vig, amb]) => (
                      <tr key={doc} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-800">{doc}</td>
                        <td className="px-5 py-3 font-semibold text-slate-700">{vig}</td>
                        <td className="px-5 py-3 text-slate-500"><code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{amb}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Cómo FichaEleam ayuda */}
          <section className="bg-white px-5 py-20">
            <div className="max-w-4xl mx-auto">
              <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3">Carpeta SEREMI digital</p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-5">
                Cómo FichaEleam digitaliza tu acreditación
              </h2>
              <p className="text-slate-600 leading-relaxed mb-8 text-lg">
                En vez de carpetas físicas dispersas y planillas que nadie actualiza, todo el equipo carga
                evidencias en el módulo de acreditación. El sistema mantiene versiones, alerta vencimientos y
                exporta la carpeta lista para SEREMI.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  ["14 ámbitos pre-cargados", "Los 14 ámbitos y los 70+ requisitos del DS 14/2017 vienen listos. Solo subes evidencias."],
                  ["Versiones de cada documento", "Cuando reemplazas un certificado, la versión anterior queda en el historial."],
                  ["Alertas 30 días antes", "El sistema avisa antes del vencimiento; tú decides cuándo renovar."],
                  ["Estados claros por requisito", "Cumple, no cumple, no aplica, vencido u observado. Sin ambigüedades."],
                  ["Observaciones de fiscalización", "Registras la observación de SEREMI con plazo y responsable de subsanación."],
                  ["Auditoría inmutable", "Quién cargó, quién reemplazó, cuándo se cerró una observación — todo queda registrado."],
                  ["Permisos por funcionario", "Decides quién sube, edita o archiva evidencias."],
                  ["Export imprimible", "Carpeta completa o por ámbito en PDF listo para entregar."],
                ].map(([titulo, texto]) => (
                  <div key={titulo} className="border border-slate-100 rounded-2xl p-5 bg-slate-50">
                    <h3 className="font-bold text-slate-900 text-sm mb-1.5">{titulo}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{texto}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="bg-slate-50 px-5 py-20">
            <div className="max-w-3xl mx-auto">
              <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3 text-center">FAQ</p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-10 text-center">
                Preguntas frecuentes sobre la acreditación SEREMI
              </h2>
              <div className="space-y-3">
                {FAQ.map((qa) => (
                  <details key={qa.q} className="group bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <summary className="cursor-pointer list-none p-5 flex items-start justify-between gap-3">
                      <span className="font-semibold text-slate-900 text-sm leading-snug">{qa.q}</span>
                      <svg className="w-5 h-5 text-slate-400 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </summary>
                    <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{qa.a}</p>
                  </details>
                ))}
              </div>
              <p className="mt-10 text-center text-sm text-slate-500">
                ¿Otra pregunta?{" "}
                <Link to="/preguntas-frecuentes" className="text-teal-700 font-semibold hover:underline">
                  Visita la sección de preguntas frecuentes
                </Link>
                {" "}o{" "}
                <Link to="/contacto" className="text-teal-700 font-semibold hover:underline">
                  contáctanos
                </Link>.
              </p>
            </div>
          </section>

          {/* CTA final */}
          <section className="bg-slate-950 text-white px-5 py-20">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-black mb-5">
                Llega a la próxima fiscalización con la carpeta al día
              </h2>
              <p className="text-slate-300 leading-relaxed mb-8 max-w-xl mx-auto">
                30 días de prueba gratuita, sin tarjeta de crédito. Aprobamos cada solicitud en menos de 24 horas.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => openDemo("seremi_footer")}
                  className="bg-teal-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-teal-400 shadow-lg shadow-teal-500/25"
                >
                  Solicitar demo gratuito
                </button>
                <button
                  type="button"
                  onClick={() => { navigate("/software-eleam"); trackEvent("cta_click", "seremi_software"); }}
                  className="border border-white/20 text-slate-200 font-semibold py-3 px-8 rounded-xl hover:bg-white/5"
                >
                  Ver software para ELEAM
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </PublicShell>
  );
}
