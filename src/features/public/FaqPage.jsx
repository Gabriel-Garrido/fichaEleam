import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSEO, faqJsonLd, breadcrumbJsonLd } from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import PublicShell from "./PublicShell";

const CATEGORIES = [
  {
    id: "producto",
    label: "Producto",
    qa: [
      {
        q: "¿Qué es FichaEleam?",
        a: "FichaEleam es un software web especializado para Establecimientos de Larga Estadía para Adultos Mayores (ELEAM) en Chile. Centraliza ficha clínica, signos vitales, observaciones por turno, plan de cuidado, eMAR (kardex electrónico), gestión de habitaciones, portal familiar y carpeta SEREMI DS 14/2017 en una sola plataforma.",
      },
      {
        q: "¿En qué se diferencia de un software clínico genérico?",
        a: "Está diseñado exclusivamente para ELEAM en Chile: trae los 14 ámbitos del DS 14/2017 pre-cargados, aplica rangos clínicos para adulto mayor, contempla turnos mañana/tarde/noche, maneja medicamentos controlados con doble validación y entiende los flujos de fiscalización SEREMI.",
      },
      {
        q: "¿Es una aplicación de escritorio o web?",
        a: "Es una aplicación web. No requiere instalación. Funciona en cualquier computador, tablet o teléfono con un navegador moderno (Chrome, Edge, Safari, Firefox) y conexión a internet.",
      },
      {
        q: "¿Funciona sin internet?",
        a: "Requiere conexión a internet para sincronizar. Si tu ELEAM tiene cortes ocasionales, el equipo puede consultar la información cacheada en cada dispositivo y sincronizar cuando vuelva la conexión, pero los registros nuevos requieren internet.",
      },
    ],
  },
  {
    id: "precios",
    label: "Precios y planes",
    qa: [
      {
        q: "¿Cuánto cuesta FichaEleam?",
        a: "Tres planes mensuales en CLP + IVA: Hasta 14 residentes a $50.000, Hasta 24 residentes a $80.000 y Hasta 34 residentes a $120.000. Para 35 o más residentes ofrecemos un plan institucional con cotización personalizada.",
      },
      {
        q: "¿Cómo se paga?",
        a: "Por MercadoPago con tarjeta de crédito o débito chilena. El cobro es mensual automático. Puedes cancelar cuando quieras desde el panel de administrador.",
      },
      {
        q: "¿Hay costo de implementación o setup?",
        a: "No. La activación es inmediata: una vez aprobado el demo, recibes tu cuenta lista para usar. No hay fee por configuración, instalación ni capacitación.",
      },
      {
        q: "¿Las familias y funcionarios pagan extra?",
        a: "No. Cada plan incluye un cupo de funcionarios; las familias del residente son ilimitadas y sin costo adicional. Solo cuentan residentes activos u hospitalizados — egresados o fallecidos no consumen cupo.",
      },
      {
        q: "¿Hay descuento por pago anual?",
        a: "Actualmente no, pero puedes consultarnos por WhatsApp si tu ELEAM tiene 30 o más residentes; revisamos cotizaciones personalizadas.",
      },
      {
        q: "¿Qué pasa si supero el cupo de mi plan?",
        a: "El sistema te avisa cuando estás cerca del cupo. Para agregar más residentes, puedes egresar a quienes ya no están activos o cambiar de plan. Si excedes el cupo, no podrás registrar nuevos residentes hasta resolver la situación.",
      },
    ],
  },
  {
    id: "demo",
    label: "Demo y prueba gratuita",
    qa: [
      {
        q: "¿Cómo solicito un demo?",
        a: "Completa el formulario en la página principal con tu nombre, cargo, ELEAM, correo y teléfono. Aprobamos cada solicitud en menos de 24 horas y enviamos por correo el enlace de acceso a tu cuenta de prueba.",
      },
      {
        q: "¿Cuánto dura la prueba gratuita?",
        a: "30 días. Tienes acceso completo a todas las funcionalidades, puedes cargar tus residentes reales, invitar a tu equipo y operar como si fuera tu cuenta definitiva.",
      },
      {
        q: "¿Tengo que ingresar tarjeta de crédito para la prueba?",
        a: "No. Activamos la prueba sin pedirte datos de pago. Cuando faltan días para que termine, te avisamos por correo para que decidas si quieres contratar o no.",
      },
      {
        q: "¿Si no contrato, pierdo mis datos?",
        a: "Antes de que termine la prueba puedes exportar tus residentes y la carpeta SEREMI a PDF/Excel. La cuenta queda inactiva pero conservamos tus datos durante 6 meses por si decides reactivar.",
      },
    ],
  },
  {
    id: "implementacion",
    label: "Implementación y carga de datos",
    qa: [
      {
        q: "¿Cuánto demora implementar FichaEleam?",
        a: "Menos de 24 horas desde el demo aprobado. La carga inicial de residentes puede hacerse uno a uno o con importación masiva por Excel. La mayoría de ELEAM están operando turnos completos al final del primer día.",
      },
      {
        q: "¿Tengo que capacitar a mi equipo?",
        a: "El sistema tiene onboarding adaptativo por rol: cada funcionario ve los pasos relevantes a sus permisos. La curva de aprendizaje es de minutos, no horas. Si necesitas capacitación dedicada, podemos coordinarla.",
      },
      {
        q: "¿Puedo importar mis datos desde Excel?",
        a: "Sí. Hay plantillas oficiales para residentes y para funcionarios con validadores nativos de Excel (listas, fechas, rangos, campos obligatorios). Cargas el archivo, validamos cada fila antes de importar y te mostramos los errores si los hay.",
      },
      {
        q: "¿Y los documentos de mi carpeta SEREMI actual?",
        a: "Los subes al módulo de acreditación. Cada documento se asocia a su ámbito y requisito correspondiente, con fecha de emisión y vencimiento si aplica. El sistema mantiene versiones cuando reemplazas un documento.",
      },
    ],
  },
  {
    id: "seguridad",
    label: "Seguridad y datos",
    qa: [
      {
        q: "¿Dónde se almacenan los datos?",
        a: "En infraestructura cloud sobre Supabase (basado en Postgres). Los datos están encriptados en tránsito (TLS) y en reposo. Backups automáticos diarios.",
      },
      {
        q: "¿Otro ELEAM puede ver mis datos?",
        a: "Imposible. Implementamos aislamiento estricto con Row Level Security a nivel de base de datos: cada consulta filtra por el ELEAM del usuario que la ejecuta. Aunque un atacante intentara forzar acceso desde el cliente, el motor de base de datos lo rechaza.",
      },
      {
        q: "¿Cumple con la ley chilena de protección de datos?",
        a: "Sí. Operamos bajo la Ley N° 19.628 sobre protección de datos personales y la Ley N° 20.584 sobre derechos del paciente. El responsable del tratamiento de datos es tu ELEAM; nosotros somos el encargado.",
      },
      {
        q: "¿Qué pasa si alguien intenta acceder sin autorización?",
        a: "Cada acceso requiere autenticación. Los intentos fallidos quedan registrados. Para datos sensibles (medicamentos controlados, cambios de plan de cuidado) hay auditoría inmutable con usuario, fecha y cambio realizado.",
      },
    ],
  },
  {
    id: "equipo",
    label: "Equipo y permisos",
    qa: [
      {
        q: "¿Cuántos funcionarios puedo registrar?",
        a: "Depende del plan: 10 funcionarios en el plan de 14 residentes, 20 en el de 24 y 30 en el de 34. Para el plan institucional, los cupos son a medida.",
      },
      {
        q: "¿Qué tipos de cuenta existen?",
        a: "Cinco roles: superadmin (operador de la plataforma), admin_eleam (dueño del ELEAM), funcionario (personal clínico), familiar (familia del residente) y, en próximas versiones, roles especializados como kinesiólogo o nutricionista con permisos preconfigurados.",
      },
      {
        q: "¿Puedo controlar qué ve cada funcionario?",
        a: "Sí. El admin del ELEAM define permisos granulares por funcionario: crear/editar/eliminar residentes, signos vitales, observaciones, planes de cuidado, eMAR, acreditación y visitas. También puede habilitar o deshabilitar módulos completos por funcionario.",
      },
      {
        q: "¿Cómo invito a las familias?",
        a: "Desde el panel de equipo seleccionas al residente y agregas el correo del familiar. El sistema le envía un enlace de acceso. Las familias solo ven al residente con quien están vinculadas; nunca a otros.",
      },
    ],
  },
  {
    id: "soporte",
    label: "Soporte y cancelación",
    qa: [
      {
        q: "¿Cómo recibo soporte?",
        a: "Por correo a contacto@fichaeleam.cl y por WhatsApp al +56 9 5118 7764. Respondemos en horario hábil con prioridad a urgencias operativas.",
      },
      {
        q: "¿Cómo cancelo la suscripción?",
        a: "Desde el panel de administrador del ELEAM. La cancelación es inmediata pero conservas el acceso hasta el final del período pagado. No hay penalidades ni cláusulas de permanencia.",
      },
      {
        q: "¿Puedo recuperar mi cuenta si la cancelo?",
        a: "Sí. La cuenta queda inactiva y conservamos los datos durante 6 meses. Si reactivas dentro de ese período, recuperas todo. Después, los datos se eliminan de forma permanente.",
      },
      {
        q: "¿Reciben sugerencias para nuevas funcionalidades?",
        a: "Sí. Escríbenos por correo o WhatsApp. Priorizamos las funcionalidades que más ELEAM solicitan y que mejor se alinean con el marco normativo chileno.",
      },
    ],
  },
];

export default function FaqPage() {
  const navigate = useNavigate();
  usePageView("/preguntas-frecuentes");
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);

  const allQa = CATEGORIES.flatMap((c) => c.qa);

  useSEO({
    title: "Preguntas frecuentes · FichaEleam",
    description: "Preguntas frecuentes sobre FichaEleam: precios, planes, demo gratuito, implementación, seguridad de datos, equipo y permisos, soporte. Software para ELEAM en Chile.",
    path: "/preguntas-frecuentes",
    keywords: [
      "FichaEleam preguntas frecuentes",
      "precios software ELEAM",
      "implementación software ELEAM",
      "seguridad datos ELEAM Chile",
    ],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Inicio", url: "/" },
        { name: "Preguntas frecuentes", url: "/preguntas-frecuentes" },
      ]),
      faqJsonLd(allQa),
    ],
  });

  return (
    <PublicShell current="/preguntas-frecuentes">
      {({ openDemo }) => (
        <>
          <section className="bg-slate-950 text-white px-5 pt-20 pb-20">
            <div className="max-w-4xl mx-auto">
              <nav className="text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
                <Link to="/" className="hover:text-teal-300">Inicio</Link>
                <span className="mx-2">/</span>
                <span className="text-slate-300">Preguntas frecuentes</span>
              </nav>
              <p className="text-xs font-bold text-teal-400 uppercase tracking-[0.2em] mb-4">Respuestas claras</p>
              <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-5">
                Preguntas <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">frecuentes</span>
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
                Todo lo que un director, administrador o equipo clínico de un ELEAM suele preguntar antes de
                contratar FichaEleam. Si tu duda no está aquí, escríbenos.
              </p>
            </div>
          </section>

          <section className="bg-white px-5 py-16">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-[260px_1fr] gap-10">
              {/* Sidebar nav */}
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Categorías</p>
                <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveCategory(c.id);
                        document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        trackEvent("nav_click", `faq_${c.id}`);
                      }}
                      className={`shrink-0 lg:shrink text-left text-sm px-3 py-2 rounded-xl transition-all whitespace-nowrap lg:whitespace-normal ${
                        activeCategory === c.id
                          ? "bg-teal-50 text-teal-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </nav>
              </aside>

              {/* Q&A */}
              <div className="space-y-12">
                {CATEGORIES.map((c) => (
                  <section key={c.id} id={`cat-${c.id}`} aria-labelledby={`h-${c.id}`}>
                    <h2 id={`h-${c.id}`} className="text-2xl font-black text-slate-900 mb-4">{c.label}</h2>
                    <div className="space-y-3">
                      {c.qa.map((qa) => (
                        <details key={qa.q} className="group bg-slate-50 rounded-2xl border border-slate-100">
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
                  </section>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-slate-50 px-5 py-20">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4">
                ¿Tu duda no está aquí?
              </h2>
              <p className="text-slate-500 mb-8 max-w-xl mx-auto">
                Escríbenos por correo o WhatsApp. Respondemos cada consulta en horario hábil.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => openDemo("faq_footer")}
                  className="bg-teal-600 text-white font-bold py-3 px-7 rounded-xl hover:bg-teal-700 shadow-sm"
                >
                  Solicitar demo
                </button>
                <button
                  type="button"
                  onClick={() => { navigate("/contacto"); trackEvent("cta_click", "faq_contacto"); }}
                  className="border border-slate-200 text-slate-700 font-semibold py-3 px-7 rounded-xl hover:bg-white"
                >
                  Ir a contacto
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </PublicShell>
  );
}
