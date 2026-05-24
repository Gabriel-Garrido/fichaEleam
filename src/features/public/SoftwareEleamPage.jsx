import { Link, useNavigate } from "react-router-dom";
import { useSEO, faqJsonLd, breadcrumbJsonLd } from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import PublicShell from "./PublicShell";

const FAQ = [
  {
    q: "¿Qué es un software para ELEAM?",
    a: "Un software para ELEAM es una plataforma digital que reemplaza las planillas Excel y las carpetas físicas que tradicionalmente usan los Establecimientos de Larga Estadía para Adultos Mayores en Chile. Centraliza la ficha clínica de cada residente, registros de signos vitales, observaciones por turno, plan de cuidado, administración de medicamentos y la carpeta de acreditación SEREMI exigida por el DS 14/2017.",
  },
  {
    q: "¿Por qué un software especializado y no Excel o software genérico?",
    a: "Excel no tiene trazabilidad: nadie sabe quién modificó qué ni cuándo. Un software genérico de gestión no entiende la realidad chilena: no trae los 14 ámbitos del DS 14/2017 pre-cargados, no aplica rangos clínicos para adulto mayor en signos vitales, no contempla turnos mañana/tarde/noche, no maneja medicamentos controlados con doble validación. FichaEleam fue construido exclusivamente para ELEAM en Chile.",
  },
  {
    q: "¿Cuánto cuesta el software de FichaEleam?",
    a: "Hay tres planes mensuales en pesos chilenos: 50.000 + IVA para hasta 14 residentes, 80.000 + IVA para hasta 24 residentes y 120.000 + IVA para hasta 34 residentes. Cada plan incluye un cupo de funcionarios y familias ilimitadas. Para 35 o más residentes hay un plan institucional con cotización personalizada.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. FichaEleam es una aplicación web. Funciona en cualquier computador, tablet o teléfono con navegador moderno y conexión a internet. Cada miembro del equipo entra con su correo y contraseña.",
  },
  {
    q: "¿Es seguro guardar datos de residentes en la nube?",
    a: "Sí. Los datos están aislados por ELEAM mediante Row Level Security: ningún establecimiento puede ver datos de otro. La infraestructura corre sobre Supabase (Postgres + Auth + Storage) con encriptación en tránsito y en reposo. Cumple con la Ley N° 19.628 sobre protección de datos personales y la Ley N° 20.584 sobre derechos del paciente.",
  },
  {
    q: "¿Cuánto demora la implementación?",
    a: "Menos de 24 horas. Una vez que apruebas el formulario de demo, recibes una cuenta real con 30 días de prueba gratuita. Puedes cargar tus primeros residentes en minutos (uno a uno o con importación masiva por Excel), invitar a tu equipo y empezar a registrar turnos el mismo día.",
  },
  {
    q: "¿Pierdo mis datos si cancelo la suscripción?",
    a: "Antes de cancelar puedes exportar la información de cada residente y la carpeta SEREMI completa en PDF. Mantienes el acceso hasta el final del período pagado. Tu cuenta nunca se elimina automáticamente: queda en estado inactivo y puedes reactivarla.",
  },
  {
    q: "¿Qué pasa si la SEREMI viene a fiscalizar?",
    a: "Exportas la carpeta SEREMI completa en PDF directamente desde la plataforma, con los 14 ámbitos organizados y cada evidencia con su versión vigente. Las observaciones de fiscalización quedan registradas con plazo y responsable de subsanación.",
  },
  {
    q: "¿FichaEleam reemplaza al equipo clínico?",
    a: "No. FichaEleam es la herramienta del equipo clínico, no su reemplazo. Reduce el tiempo administrativo (registrar en papel, mantener planillas) para que el equipo dedique más tiempo al cuidado directo del residente.",
  },
];

export default function SoftwareEleamPage() {
  const navigate = useNavigate();
  usePageView("/software-eleam");

  useSEO({
    title: "Software para ELEAM en Chile · Gestión clínica y SEREMI",
    description: "Software web especializado para ELEAM en Chile: ficha clínica digital, signos vitales con alertas, medicamentos, observaciones por turno, plan de cuidado y carpeta SEREMI DS 14/2017 — todo en una sola plataforma.",
    path: "/software-eleam",
    keywords: [
      "software ELEAM",
      "software residencia adulto mayor",
      "sistema gestión ELEAM Chile",
      "ficha clínica digital ELEAM",
      "administración de medicamentos ELEAM Chile",
      "digitalización residencia adulto mayor",
    ],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Software para ELEAM", url: "/software-eleam" },
      ]),
      faqJsonLd(FAQ),
    ],
  });

  return (
    <PublicShell current="/software-eleam">
      {({ openDemo }) => (
        <>
          {/* Hero */}
          <section className="bg-slate-950 text-white px-5 pt-20 pb-24">
            <div className="max-w-4xl mx-auto">
              <nav className="text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
                <Link to="/" className="hover:text-teal-300">Inicio</Link>
                <span className="mx-2">/</span>
                <span className="text-slate-300">Software para ELEAM</span>
              </nav>
              <p className="text-xs font-bold text-teal-400 uppercase tracking-[0.2em] mb-4">Diseñado para ELEAM en Chile</p>
              <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-5">
                El software que <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">
                  reemplaza
                </span>
                {" "}Excel y carpetas físicas
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
                Ficha clínica digital, signos vitales con alertas, medicamentos, plan de cuidado, observaciones de turno
                y carpeta SEREMI — en una sola plataforma construida exclusivamente para Establecimientos de Larga
                Estadía para Adultos Mayores en Chile.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openDemo("software_hero")}
                  className="bg-teal-500 text-white font-bold py-3 px-7 rounded-xl hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/25"
                >
                  Solicitar demo gratuito
                </button>
                <button
                  type="button"
                  onClick={() => { navigate("/pago"); trackEvent("cta_click", "software_precios"); }}
                  className="border border-white/15 text-slate-300 font-semibold py-3 px-7 rounded-xl hover:bg-white/5"
                >
                  Ver planes y precios
                </button>
              </div>
            </div>
          </section>

          {/* Comparativa */}
          <section className="bg-white px-5 py-20">
            <div className="max-w-4xl mx-auto">
              <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3 text-center">Comparativa honesta</p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 text-center mb-3">
                Excel y papel vs FichaEleam
              </h2>
              <p className="text-slate-500 text-center max-w-2xl mx-auto mb-12">
                Antes de proponer una herramienta, vale la pena revisar qué tan lejos llega lo que ya tienes hoy.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-left">
                      <th className="px-5 py-4 font-semibold text-slate-700">Aspecto</th>
                      <th className="px-5 py-4 font-semibold text-slate-500">Excel / papel</th>
                      <th className="px-5 py-4 font-semibold text-teal-700">FichaEleam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ["Ficha clínica con historial", "Versión única, sin trazabilidad", "Cambios auditables con fecha y usuario"],
                      ["Signos vitales", "Tabla con rangos genéricos", "Rangos clínicos para adulto mayor, alertas críticas"],
                      ["Observaciones por turno", "Cuaderno físico o WhatsApp", "12 categorías, seguimiento obligatorio, búsqueda"],
                      ["Plan de cuidado", "Hoja impresa que se pierde", "Tareas por turno, completación con notas"],
                      ["Medicamentos", "Recetas en carpeta, kardex manual", "Administración digital, doble validación, stock"],
                      ["Carpeta SEREMI", "Carpeta física con docs sueltos", "14 ámbitos pre-cargados, alertas de vencimiento"],
                      ["Acceso del equipo", "El que tenga la carpeta", "Acceso simultáneo desde cualquier dispositivo"],
                      ["Acceso de familias", "Llamadas telefónicas", "Portal con signos recientes y visitas"],
                      ["Auditoría", "Imposible reconstruir", "Cada cambio queda inmutable"],
                      ["Backup", "Si se moja, se pierde", "Backups automáticos en la nube"],
                    ].map(([aspecto, manual, ficha]) => (
                      <tr key={aspecto} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-semibold text-slate-900 align-top">{aspecto}</td>
                        <td className="px-5 py-4 text-slate-500 align-top">{manual}</td>
                        <td className="px-5 py-4 text-slate-800 align-top">
                          <span className="inline-flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{ficha}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Módulos clave */}
          <section className="bg-slate-50 px-5 py-20">
            <div className="max-w-5xl mx-auto">
              <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3 text-center">Módulos integrados</p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 text-center mb-12">
                Todo lo que un ELEAM necesita
              </h2>

              <div className="grid sm:grid-cols-2 gap-5">
                {[
                  {
                    titulo: "Ficha clínica digital",
                    desc: "Antecedentes personales, diagnóstico principal, diagnósticos secundarios, alergias, medicamentos, índice de Barthel, nivel de dependencia. Toda la información del residente en un solo lugar.",
                  },
                  {
                    titulo: "Signos vitales con rangos",
                    desc: "Presión arterial, frecuencia cardíaca, respiratoria, temperatura, saturación, glucosa, peso, dolor. Cada valor se compara con rangos clínicos validados para adulto mayor; los críticos se ven al instante.",
                  },
                  {
                    titulo: "12 tipos de observaciones",
                    desc: "Observación general, caída, incidente, curación, visita médica, administración de medicamento, cambio de posición, higiene, alimentación, eliminación, actividad y otros. Cada una con seguimiento obligatorio.",
                  },
                  {
                    titulo: "Plan de cuidado",
                    desc: "Objetivos, pautas alimentarias e hidratación, riesgo de caídas y de úlceras por presión. Actividades por categoría con horarios diarios; el equipo las completa por turno.",
                  },
                  {
                    titulo: "Administración de medicamentos",
                    desc: "Indicaciones médicas con vía, dosis, frecuencia. Administraciones programadas por turno; medicamentos controlados con doble validación. Historial inmutable y control de stock por lote.",
                  },
                  {
                    titulo: "Carpeta SEREMI DS 14/2017",
                    desc: "Los 14 ámbitos y 70+ requisitos pre-cargados. Subes evidencias con fecha de vencimiento; el sistema avisa 30 días antes y exporta el PDF para fiscalización.",
                  },
                  {
                    titulo: "Habitaciones y camas",
                    desc: "Inventario de habitaciones y camas con estado operativo. Asignación, transferencia y liberación con historial completo. Reserva por hospitalización.",
                  },
                  {
                    titulo: "Portal familiar",
                    desc: "Cada familiar autorizado consulta solo a su residente: ubicación, signos recientes, cuidados del día y medicación que el equipo elige publicar.",
                  },
                  {
                    titulo: "Entrega de turno",
                    desc: "Resumen del turno con signos críticos, observaciones pendientes, medicamentos por administrar y novedades. El siguiente turno llega informado.",
                  },
                  {
                    titulo: "Equipo y permisos",
                    desc: "Funcionarios y familiares se crean desde el panel del administrador. Permisos granulares por funcionario: residentes, signos, observaciones, medicamentos, acreditación.",
                  },
                  {
                    titulo: "Importación Excel",
                    desc: "Plantillas .xlsx para residentes y funcionarios con validadores nativos. Carga decenas de registros en minutos.",
                  },
                  {
                    titulo: "Trazabilidad e historial",
                    desc: "Cada cambio queda registrado: quién lo hizo, cuándo, qué cambió. Auditoría inmutable de medicamentos, acreditación, asignación de camas.",
                  },
                ].map((mod) => (
                  <article key={mod.titulo} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-1.5">{mod.titulo}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{mod.desc}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* Seguridad y normativa */}
          <section className="bg-white px-5 py-20">
            <div className="max-w-4xl mx-auto">
              <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3">Cumplimiento normativo</p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
                Seguridad y leyes chilenas
              </h2>
              <p className="text-slate-500 mb-10 max-w-2xl">
                Operamos bajo el marco normativo chileno con foco en datos sensibles de salud.
              </p>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="border border-slate-100 rounded-2xl p-5">
                  <h3 className="font-bold text-slate-900 mb-2">DS 14/2017 del MINSAL</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Los 14 ámbitos y los 70+ requisitos vienen pre-cargados. El módulo de acreditación está
                    diseñado para el flujo real de SEREMI.
                  </p>
                </div>
                <div className="border border-slate-100 rounded-2xl p-5">
                  <h3 className="font-bold text-slate-900 mb-2">Ley N° 20.584</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Sobre derechos y deberes de los pacientes. Cada residente y su familia autorizada pueden
                    acceder a la información clínica que el equipo decide publicar.
                  </p>
                </div>
                <div className="border border-slate-100 rounded-2xl p-5">
                  <h3 className="font-bold text-slate-900 mb-2">Ley N° 19.628</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Sobre protección de datos personales. Los datos sensibles de salud están encriptados en
                    tránsito y en reposo. Cada ELEAM ve únicamente sus propios datos.
                  </p>
                </div>
                <div className="border border-slate-100 rounded-2xl p-5">
                  <h3 className="font-bold text-slate-900 mb-2">Aislamiento multi-tenant</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Row Level Security a nivel de base de datos: ningún ELEAM puede acceder a datos de otro,
                    aunque un atacante intentara forzarlo desde el cliente.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="bg-slate-50 px-5 py-20">
            <div className="max-w-3xl mx-auto">
              <p className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] mb-3 text-center">FAQ</p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-10 text-center">
                Preguntas frecuentes sobre el software
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
            </div>
          </section>

          {/* CTA */}
          <section className="bg-slate-950 text-white px-5 py-20">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-black mb-5">
                Da el siguiente paso
              </h2>
              <p className="text-slate-300 leading-relaxed mb-8 max-w-xl mx-auto">
                30 días de prueba gratuita con una cuenta real, sin tarjeta de crédito. Respondemos cada solicitud
                en menos de 24 horas.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => openDemo("software_footer")}
                  className="bg-teal-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-teal-400 shadow-lg shadow-teal-500/25"
                >
                  Solicitar demo gratuito
                </button>
                <button
                  type="button"
                  onClick={() => { navigate("/pago"); trackEvent("cta_click", "software_pago"); }}
                  className="border border-white/20 text-slate-200 font-semibold py-3 px-8 rounded-xl hover:bg-white/5"
                >
                  Ver planes y precios
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </PublicShell>
  );
}
