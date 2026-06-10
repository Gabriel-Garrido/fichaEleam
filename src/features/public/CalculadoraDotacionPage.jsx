import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useSEO,
  faqJsonLd,
  breadcrumbJsonLd,
  howToJsonLd,
  webApplicationJsonLd,
} from "../../utils/seo";
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
  calcularDotacion,
  dotacionEventValue,
  DOTACION_META,
  DOTACION_REGLAS,
} from "../../content/dotacionRules";

const FAQ = [
  {
    q: "¿Cómo calcula FichaEleam la dotación mínima de un ELEAM?",
    a: "Aplica las reglas de los artículos 15, 16 y 17 del Decreto N°20: para residentes con dependencia, 1 cuidador diurno por cada 8 y 1 nocturno por cada 12; para autovalentes, 1 cuidador por cada 20 en cada turno; y un mínimo de 2 cuidadores nocturnos siempre. Es un cálculo referencial.",
  },
  {
    q: "¿Cuál es el mínimo de cuidadores en la noche?",
    a: "El artículo 17 exige al menos 2 cuidadores en horario nocturno, cualquiera sea el número de residentes o su nivel de dependencia.",
  },
  {
    q: "¿Qué pasa con el técnico o auxiliar de enfermería (TENS)?",
    a: "Con residentes con dependencia se requiere un auxiliar o técnico de enfermería 12 horas diurnas y uno de llamada nocturna. Con solo residentes autovalentes, un auxiliar o técnico de enfermería de llamada las 24 horas.",
  },
  {
    q: "¿Este resultado garantiza el cumplimiento ante la SEREMI?",
    a: "No. Es una estimación referencial para planificar tu dotación. La validación final depende del texto oficial vigente, la pauta del MINSAL y el criterio de la SEREMI de Salud correspondiente.",
  },
];

const STEPS = [
  {
    name: "Cuenta a tus residentes por grupo",
    text: "Separa residentes con dependencia funcional de los autovalentes o independientes. La dependencia se determina con instrumentos de valoración geriátrica.",
  },
  {
    name: "Calcula la dotación requerida",
    text: "La herramienta aplica los artículos 15, 16 y 17 del Decreto N°20 y entrega los cuidadores diurnos y nocturnos mínimos, más el apoyo técnico de enfermería.",
  },
  {
    name: "Compara con tu dotación actual",
    text: "Ingresa los cuidadores que tienes por turno para ver la brecha y detectar déficit antes de una fiscalización SEREMI.",
  },
];

const GROUPS = [...new Set(DOTACION_REGLAS.map((r) => r.grupo))];
const INTERNAL_NAV = [
  { href: "#calculadora", label: "Calculadora" },
  { href: "#marco-normativo", label: "Marco normativo" },
  { href: "#como-usar", label: "Cómo usarla" },
  { href: "#operacion", label: "Operación" },
  { href: "#faq", label: "FAQ" },
];

function NumberField({ id, label, hint, value, onChange, tone = "teal" }) {
  const ring = tone === "teal" ? "focus:border-teal-500 focus:ring-teal-100" : "focus:border-sky-500 focus:ring-sky-100";
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold tabular-nums text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 ${ring}`}
        placeholder="0"
      />
    </div>
  );
}

function ShiftResultCard({ titulo, requerido, actual, deficit, tieneActual, brecha }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-2 font-display text-4xl font-semibold tabular-nums text-slate-950">{requerido}</p>
      <p className="text-xs text-slate-500">cuidadores requeridos</p>
      {tieneActual && (
        <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
          deficit ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
        }`}>
          <span className="tabular-nums">Tienes {actual}</span>
          <span aria-hidden>·</span>
          <span>{deficit ? `Faltan ${Math.abs(brecha)}` : "Dotación cubierta"}</span>
        </div>
      )}
    </div>
  );
}

export default function CalculadoraDotacionPage() {
  usePageView("/calculadora-dotacion-eleam");

  const [conDependencia, setConDependencia] = useState("12");
  const [autovalentes, setAutovalentes] = useState("8");
  const [showActual, setShowActual] = useState(false);
  const [actualDiurno, setActualDiurno] = useState("");
  const [actualNocturno, setActualNocturno] = useState("");

  // Marca una interacción real del usuario y limita los inputs a dígitos.
  const interacted = useRef(false);
  const onField = (setter) => (value) => {
    interacted.current = true;
    setter(value.replace(/[^\d]/g, ""));
  };

  const resultado = useMemo(
    () => calcularDotacion({
      conDependencia,
      autovalentes,
      actual: showActual
        ? { cuidadoresDiurno: actualDiurno || null, cuidadoresNocturno: actualNocturno || null }
        : {},
    }),
    [conDependencia, autovalentes, showActual, actualDiurno, actualNocturno],
  );

  // Registra el uso solo tras una interacción real (no con los valores precargados).
  const lastTracked = useRef(null);
  useEffect(() => {
    if (!interacted.current || resultado.totalResidentes <= 0) return undefined;
    const value = dotacionEventValue(resultado);
    const timer = setTimeout(() => {
      if (value && value !== lastTracked.current) {
        lastTracked.current = value;
        trackEvent("tool_use", "calculadora_dotacion", value);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [resultado]);

  useSEO({
    title: "Calculadora de dotación de personal para ELEAM · Decreto N°20",
    description:
      "Calcula la dotación mínima de cuidadores y TENS de tu ELEAM según el Decreto N°20 (Arts. 15-17): turno diurno, nocturno, mínimo 2 nocturnos y brecha.",
    path: "/calculadora-dotacion-eleam",
    image: PUBLIC_ASSETS.shift.publicSrc,
    keywords: [
      "calculadora dotación ELEAM",
      "dotación de personal ELEAM",
      "Decreto 20 dotación",
      "cuidadores por residente ELEAM",
      "personal mínimo ELEAM Chile",
      "turnos cuidadores residencia persona mayor",
    ],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Calculadora de dotación", url: "/calculadora-dotacion-eleam" },
      ]),
      faqJsonLd(FAQ),
      howToJsonLd({
        name: "Cómo calcular la dotación de personal de un ELEAM según el Decreto N°20",
        description: "Pasos para estimar los cuidadores y el apoyo técnico de enfermería mínimos por turno.",
        steps: STEPS,
      }),
      webApplicationJsonLd({
        name: "Calculadora de dotación de personal para ELEAM",
        description:
          "Herramienta gratuita para estimar la dotación mínima de cuidadores y TENS de un ELEAM según el Decreto N°20 del MINSAL.",
        path: "/calculadora-dotacion-eleam",
        image: PUBLIC_ASSETS.shift.publicSrc,
        featureList: [
          "Cálculo de cuidadores diurnos y nocturnos por dependencia",
          "Regla de mínimo 2 cuidadores nocturnos",
          "Apoyo técnico de enfermería por grupo",
          "Análisis de brecha contra la dotación actual",
        ],
      }),
    ],
  });

  const { requerido, brecha, deficitDiurno, deficitNocturno, tieneActual, totalResidentes } = resultado;

  return (
    <PublicShell current="/calculadora-dotacion-eleam">
      {({ openDemo }) => (
        <div className="bg-white">
          <section className="bg-slate-50 px-5 py-14 sm:py-20">
            <div className="mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <PublicBreadcrumb current="Calculadora de dotación" />
                <PublicBadge tone="teal">Herramienta gratuita · Decreto N°20</PublicBadge>
                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Calculadora de dotación de personal para ELEAM
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  Proyecta cuidadores y apoyo técnico de enfermería para tu residencia según los artículos 15, 16 y 17 del Decreto N°20 del MINSAL. Compara con tu dotación actual y detecta brechas antes de planificar turnos o enfrentar una fiscalización.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  <PublicMetric value="DS20" label="Arts. 15-17" tone="teal" />
                  <PublicMetric value="2" label="Mín. cuidadores noche" tone="amber" />
                  <PublicMetric value="Gratis" label="Sin registro" tone="sky" />
                </div>
                <p className="mt-6 max-w-xl text-xs leading-5 text-slate-500">
                  Cálculo referencial para planificar tu dotación. La validación final depende del texto oficial vigente, la pauta del MINSAL y el criterio de la SEREMI de Salud.
                </p>
                <nav className="mt-7 flex flex-wrap gap-2" aria-label="Navegación de la calculadora">
                  {INTERNAL_NAV.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => trackEvent("nav_click", `calculadora_${item.href.slice(1)}`)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Calculadora interactiva */}
              <div id="calculadora" className="scroll-mt-public rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
                <h2 className="text-lg font-semibold text-slate-950">Ingresa tus residentes</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <NumberField
                    id="con-dependencia"
                    label="Con dependencia"
                    hint="Dependencia funcional, cognitiva o mixta."
                    value={conDependencia}
                    onChange={onField(setConDependencia)}
                  />
                  <NumberField
                    id="autovalentes"
                    label="Autovalentes"
                    hint="Independientes o autovalentes."
                    value={autovalentes}
                    onChange={onField(setAutovalentes)}
                    tone="sky"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => { setShowActual((v) => !v); trackEvent("cta_click", "calculadora_toggle_actual"); }}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline"
                >
                  {showActual ? "− Ocultar dotación actual" : "+ Comparar con mi dotación actual"}
                </button>

                {showActual && (
                  <div className="mt-3 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
                    <NumberField id="actual-diurno" label="Cuidadores diurno (actual)" value={actualDiurno} onChange={onField(setActualDiurno)} />
                    <NumberField id="actual-nocturno" label="Cuidadores noche (actual)" value={actualNocturno} onChange={onField(setActualNocturno)} />
                  </div>
                )}

                {/* Resultado */}
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Dotación mínima requerida</p>
                    <span className="text-xs text-slate-500 tabular-nums">{totalResidentes} residentes</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ShiftResultCard
                      titulo="Turno diurno"
                      requerido={requerido.cuidadoresDiurno}
                      actual={resultado.actual.cuidadoresDiurno}
                      deficit={deficitDiurno}
                      tieneActual={tieneActual}
                      brecha={brecha.cuidadoresDiurno}
                    />
                    <ShiftResultCard
                      titulo="Turno nocturno"
                      requerido={requerido.cuidadoresNocturno}
                      actual={resultado.actual.cuidadoresNocturno}
                      deficit={deficitNocturno}
                      tieneActual={tieneActual}
                      brecha={brecha.cuidadoresNocturno}
                    />
                  </div>

                  <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Apoyo técnico (TENS/auxiliar)</p>
                    <p className="mt-1 text-sm text-slate-700">{requerido.tens.detalle}</p>
                  </div>

                  {requerido.minNocturnoAplicado && (
                    <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      <span aria-hidden className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-900">!</span>
                      <span>Se aplicó el mínimo de 2 cuidadores nocturnos del artículo 17, por sobre el cálculo por residentes.</span>
                    </p>
                  )}

                  {tieneActual && resultado.tieneDeficit && (
                    <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                      Tu dotación actual está bajo el mínimo del Decreto N°20 en al menos un turno.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => openDemo("calculadora_demo")}
                    className={`${PUBLIC_BUTTON.primary} mt-5 w-full`}
                  >
                    Convertir esta brecha en turnos gestionables
                  </button>
                </div>
              </div>
            </div>
          </section>

          <PublicSection
            id="marco-normativo"
            eyebrow="Marco normativo"
            title="Cómo se calcula la dotación según el Decreto N°20"
            description={`${DOTACION_META.norma}, ${DOTACION_META.articulos}. El cálculo suma el personal requerido para residentes con dependencia y para autovalentes, y respeta el mínimo nocturno.`}
          >
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Grupo</th>
                      <th className="px-4 py-3 font-semibold">Turno / rol</th>
                      <th className="px-4 py-3 font-semibold">Regla</th>
                      <th className="px-4 py-3 font-semibold">Art.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {DOTACION_REGLAS.map((regla) => (
                      <tr key={`${regla.grupo}-${regla.turno}`}>
                        <td className="px-4 py-3 text-slate-800">{regla.grupo}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{regla.turno}</td>
                        <td className="px-4 py-3 text-slate-600">{regla.regla}</td>
                        <td className="px-4 py-3">
                          <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{regla.articulo}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              {GROUPS.length} grupos de residentes considerados. Fuente oficial:{" "}
              <a href={DOTACION_META.fuenteUrl} rel="noopener nofollow" target="_blank" className="font-semibold text-teal-700 hover:underline">Ley Chile</a>.
            </p>
          </PublicSection>

          <PublicSection id="como-usar" tone="soft" eyebrow="Paso a paso" title="Cómo usar la calculadora">
            <ol className="grid gap-4 md:grid-cols-3">
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

          <PublicSection id="operacion" eyebrow="En la operación" title="De la dotación al turno real, en FichaEleam">
            <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <ProductImage asset={PUBLIC_ASSETS.shift} />
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                <CheckList items={[
                  "Entrega de turno con resumen clínico, cuidado y eMAR por jornada.",
                  "Planta de personal, jornadas y turnos como evidencia para la SEREMI.",
                  "Residentes por nivel de dependencia siempre actualizados.",
                  "Carpeta SEREMI DS 20 con la dotación entre sus controles.",
                ]} />
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/acreditacion-seremi" className={PUBLIC_BUTTON.secondary}>Ver Carpeta SEREMI</Link>
                  <Link to="/software-eleam" className={PUBLIC_BUTTON.secondary}>Ver software ELEAM</Link>
                </div>
              </div>
            </div>
          </PublicSection>

          <PublicSection id="faq" tone="soft" eyebrow="FAQ" title="Preguntas frecuentes sobre dotación de personal" center>
            <div className="mx-auto grid max-w-4xl gap-3">
              {FAQ.map((item) => <FaqDisclosure key={item.q} q={item.q} a={item.a} />)}
            </div>
            <p className="mt-8 text-center text-sm text-slate-500">
              ¿Otra duda? <Link to="/preguntas-frecuentes" className="font-semibold text-teal-700 hover:underline">Revisa la FAQ</Link> o <Link to="/contacto" className="font-semibold text-teal-700 hover:underline">contáctanos</Link>.
            </p>
          </PublicSection>

          <PublicCtaBand
            title="Lleva tu dotación y tus turnos a un solo lugar"
            text="FichaEleam ordena residentes por dependencia, entrega de turno y la Carpeta SEREMI DS 20 para que la dotación sea evidencia, no una planilla suelta."
            primaryLabel="Solicitar demo gratis"
            onPrimary={openDemo}
            source="calculadora_footer"
            secondaryLabel="Ver acreditación SEREMI"
            secondaryTo="/acreditacion-seremi"
          />
        </div>
      )}
    </PublicShell>
  );
}
