import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useSEO, faqJsonLd, breadcrumbJsonLd } from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import { PUBLIC_ASSETS, PUBLIC_BUTTON } from "./publicDesignAssets";
import {
  CheckList,
  FaqDisclosure,
  ProductImage,
  PublicBadge,
  PublicBreadcrumb,
  PublicCtaBand,
  PublicFeatureCard,
  PublicMetric,
  PublicSection,
} from "./PublicDesign";
import { DECRETO20_REQUISITOS } from "../../content/decreto20Eleam";

const FAQ = [
  {
    q: "¿Qué es un software para ELEAM?",
    a: "Es una plataforma digital que reúne fichas clínicas, turnos, medicamentos, carpeta SEREMI y cobranza a residentes con respaldos, historial y recordatorios por correo.",
  },
  {
    q: "¿Por qué un software especializado y no Excel?",
    a: "Excel no entrega trazabilidad clínica ni flujos normativos para ELEAM. FichaEleam está diseñado para Decreto N°20, turnos, residentes, medicamentos, programa integral y fiscalización SEREMI.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. FichaEleam es una aplicación web que funciona en navegador moderno desde computador, tablet o teléfono.",
  },
  {
    q: "¿Es seguro guardar datos de residentes en la nube?",
    a: "Sí. Cada ELEAM accede solo a su información, con autenticación, permisos por rol y conexión cifrada.",
  },
  {
    q: "¿Cuánto demora la implementación?",
    a: "El demo queda operativo en menos de 24 horas desde la aprobación. La carga inicial puede hacerse de forma manual o con importación Excel.",
  },
];

const MODULES = [
  ["Ficha clínica digital", "Diagnósticos, alergias, Barthel, dependencia, historial y datos clave del residente."],
  ["Signos vitales con alertas", "Rangos clínicos para persona mayor y estados visibles para priorizar controles."],
  ["Entrega de turno", "Resumen de medicamentos, tareas, observaciones y prioridades del siguiente turno."],
  ["Medicamentos y eMAR", "Administración por turno, historial y control operacional de medicamentos."],
  ["Carpeta SEREMI DS 20", "Matriz Decreto N°20, artículos, criticidad, evidencias, estados, vencimientos y observaciones."],
  ["Evaluaciones geriátricas", "Barthel, Katz, MNA y MMSE dentro de la ficha del residente."],
  ["Habitaciones y camas", "Inventario, ocupación, traslados, reservas y trazabilidad operacional."],
  ["Equipo y permisos", "Accesos claros para administradores y funcionarios."],
  ["Cobranza de residentes", "Mensualidades, otros cobros, respaldos e historial por residente, con recordatorios por correo para pagos pendientes."],
];

const COMPARISON = [
  ["Ficha clínica", "Registro suelto o archivo compartido", "Historial auditable por residente"],
  ["Signos vitales", "Planilla con revisión manual", "Alertas y rangos para persona mayor"],
  ["Turnos", "Cuaderno o WhatsApp", "Resumen digital del turno"],
  ["SEREMI", "Carpetas físicas y vencimientos manuales", "Ámbitos, evidencias y vencimientos"],
  ["Evaluaciones", "Escalas en archivos separados", "Historial clínico por residente"],
  ["Cobranza", "Planillas, mensajes y respaldos dispersos", "Cobros, pagos, documentos y recordatorios en un historial"],
];

export default function SoftwareEleamPage() {
  const navigate = useNavigate();
  usePageView("/software-eleam");

  useSEO({
    title: "Software para ELEAM en Chile · Gestión clínica y SEREMI",
    description:
      "Software para ELEAM con ficha clínica, turnos, medicamentos, Carpeta SEREMI y cobranza de residentes con respaldos y recordatorios por correo.",
    path: "/software-eleam",
    image: PUBLIC_ASSETS.software.publicSrc,
    keywords: [
      "software ELEAM",
      "software residencia persona mayor",
      "sistema gestión ELEAM Chile",
      "ficha clínica digital ELEAM",
      "administración de medicamentos ELEAM Chile",
      "software cobranza residentes ELEAM",
    ],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Software para ELEAM", url: "/software-eleam" },
      ]),
      faqJsonLd(FAQ),
    ],
  });

  const { openDemo } = useOutletContext();

  return (
        <div className="bg-white">
          <section className="bg-slate-50 px-5 py-14 sm:py-20">
            <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.88fr_1.12fr]">
              <div>
                <PublicBreadcrumb current="Software para ELEAM" />
                <PublicBadge>Producto</PublicBadge>
                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  El software que reemplaza Excel, cuadernos y carpetas físicas
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  Dirige el ELEAM desde un solo lugar: cuidado diario, documentación, equipo y cobranza a residentes, sin depender de planillas separadas.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => openDemo("software_hero")} className={PUBLIC_BUTTON.primary}>
                    Solicitar demo gratis
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigate("/pago"); trackEvent("cta_click", "software_precios"); }}
                    className={PUBLIC_BUTTON.secondary}
                  >
                    Ver planes y precios
                  </button>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  <PublicMetric value="DS20" label="Carpeta SEREMI" tone="teal" />
                  <PublicMetric value="12" label="Tipos observación" tone="sky" />
                  <PublicMetric value="24h" label="Respuesta demo" tone="emerald" />
                </div>
              </div>
              <ProductImage asset={PUBLIC_ASSETS.software} priority />
            </div>
          </section>

          <PublicSection
            eyebrow="Comparativa honesta"
            title="Excel y papel no fueron diseñados para administrar datos sensibles de salud"
            description="FichaEleam ordena la operación clínica y documental con trazabilidad, permisos y flujos propios de un ELEAM chileno."
          >
            <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <ProductImage asset={PUBLIC_ASSETS.comparison} />
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[680px] w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Aspecto</th>
                        <th className="px-4 py-3 font-semibold">Excel / papel</th>
                        <th className="px-4 py-3 font-semibold text-teal-800">FichaEleam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {COMPARISON.map(([aspect, manual, digital]) => (
                        <tr key={aspect} className="align-top">
                          <td className="px-4 py-4 font-semibold text-slate-950">{aspect}</td>
                          <td className="px-4 py-4 text-slate-500">{manual}</td>
                          <td className="px-4 py-4 text-slate-700">{digital}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </PublicSection>

          <PublicSection
            tone="soft"
            eyebrow="Módulos integrados"
            title="Todo el flujo operativo del ELEAM en una interfaz común"
            center
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map(([title, text], index) => (
                <PublicFeatureCard
                  key={title}
                  icon={index % 3 === 0 ? "document" : index % 3 === 1 ? "pulse" : "users"}
                  title={title}
                  text={text}
                  tone={index % 4 === 0 ? "teal" : index % 4 === 1 ? "sky" : index % 4 === 2 ? "emerald" : "amber"}
                />
              ))}
            </div>
          </PublicSection>

          <PublicSection
            eyebrow="Seguridad y cumplimiento"
            title="Construido para operar con datos sensibles y normativa chilena"
            description="FichaEleam protege la información del establecimiento con roles claros, trazabilidad y contenido normativo específico para ELEAM."
          >
            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                <h3 className="text-xl font-semibold text-slate-950">Marco normativo considerado</h3>
                <div className="mt-5">
                  <CheckList items={[
                    "Decreto N°20 MINSAL para funcionamiento y fiscalización ELEAM.",
                    "Ley 20.584 sobre derechos y deberes de pacientes.",
                    "Ley 19.628 sobre protección de datos personales.",
                    "Control de acceso por roles y permisos operativos.",
                    `${DECRETO20_REQUISITOS.length} controles DS 20 precargados desde la fuente normativa del proyecto.`,
                  ]} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <PublicMetric value="Acceso" label="Información separada por ELEAM" tone="slate" />
                <PublicMetric value="Roles" label="Administrador y funcionario" tone="teal" />
                <PublicMetric value="Trazabilidad" label="Historial de cambios críticos" tone="amber" />
                <PublicMetric value="Web" label="Acceso seguro sin instalación local" tone="emerald" />
              </div>
            </div>
          </PublicSection>

          <PublicSection tone="soft" eyebrow="FAQ" title="Preguntas frecuentes sobre el software" center>
            <div className="mx-auto grid max-w-4xl gap-3">
              {FAQ.map((item) => <FaqDisclosure key={item.q} q={item.q} a={item.a} />)}
            </div>
            <p className="mt-8 text-center text-sm text-slate-500">
              También puedes revisar la <Link to="/acreditacion-seremi" className="font-semibold text-teal-700 hover:underline">guía SEREMI</Link>, usar la <Link to="/calculadora-dotacion-eleam" className="font-semibold text-teal-700 hover:underline">calculadora de dotación</Link> o la sección de <Link to="/preguntas-frecuentes" className="font-semibold text-teal-700 hover:underline">preguntas frecuentes</Link>.
            </p>
          </PublicSection>

          <PublicCtaBand
            title="Ve FichaEleam funcionando con tu caso"
            text="Solicita una cuenta real de prueba. Revisamos el tamaño del ELEAM, el flujo documental y el plan recomendado."
            primaryLabel="Solicitar demo gratis"
            onPrimary={openDemo}
            source="software_footer"
            secondaryLabel="Ver acreditación SEREMI"
            secondaryTo="/acreditacion-seremi"
          />
        </div>
  );
}
