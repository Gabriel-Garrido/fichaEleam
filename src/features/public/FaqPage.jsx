import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useSEO, faqJsonLd, breadcrumbJsonLd } from "../../utils/seo";
import { trackEvent, usePageView } from "../landing/landingAnalytics";
import { PUBLIC_ASSETS, PUBLIC_BUTTON } from "./publicDesignAssets";
import {
  FaqDisclosure,
  PublicBadge,
  PublicBreadcrumb,
  PublicCtaBand,
  PublicSection,
} from "./PublicDesign";

const CATEGORIES = [
  {
    id: "producto",
    label: "Producto",
    qa: [
      {
        q: "¿Qué es FichaEleam?",
        a: "FichaEleam es un software web especializado para Establecimientos de Larga Estadía para Personas Mayores (ELEAM) en Chile. Centraliza ficha clínica, signos vitales, observaciones por turno, plan de cuidado, administración de medicamentos, gestión de habitaciones, portal familiar y carpeta SEREMI Decreto N°20 en una sola plataforma.",
      },
      {
        q: "¿En qué se diferencia de un software clínico genérico?",
        a: "Está diseñado para ELEAM en Chile: organiza la matriz DS 20 por artículos del Decreto N°20, aplica rangos clínicos para persona mayor, contempla turnos mañana/tarde/noche, maneja medicamentos controlados con doble validación y entiende los flujos de fiscalización SEREMI.",
      },
      {
        q: "¿Es una aplicación de escritorio o web?",
        a: "Es una aplicación web. No requiere instalación. Funciona en cualquier computador, tablet o teléfono con un navegador moderno (Chrome, Edge, Safari, Firefox) y conexión a internet.",
      },
      {
        q: "¿Funciona sin internet?",
        a: "Requiere conexión a internet para consultar y registrar información. Si tu ELEAM tiene cortes frecuentes, recomendamos revisar conectividad de respaldo antes de operar turnos críticos en la plataforma.",
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
        q: "¿Hay costo de implementación?",
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
        a: "El sistema está diseñado para que cada rol vea solo lo que necesita: la curva de aprendizaje es de minutos, no horas. Si necesitas capacitación dedicada, podemos coordinarla.",
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
        a: "En infraestructura segura en la nube. Los datos viajan cifrados y se respaldan periódicamente para proteger la continuidad operativa.",
      },
      {
        q: "¿Otro ELEAM puede ver mis datos?",
        a: "No. Cada establecimiento trabaja en un espacio separado y los permisos impiden que usuarios de otro ELEAM vean información que no corresponde.",
      },
      {
        q: "¿Cómo resguarda la ley chilena de protección de datos?",
        a: "FichaEleam opera con controles técnicos y organizacionales alineados con la Ley N° 19.628 sobre protección de datos personales y la Ley N° 20.584 sobre derechos del paciente. El responsable del tratamiento de datos es tu ELEAM; nosotros actuamos como encargado.",
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
        a: "Sí. El admin del ELEAM define permisos granulares por funcionario: crear/editar/eliminar residentes, signos vitales, observaciones, planes de cuidado, medicamentos, acreditación y visitas. También puede habilitar o deshabilitar módulos completos por funcionario.",
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
        a: "Por WhatsApp o formulario de demo desde nuestra página de contacto. Respondemos en horario hábil, con prioridad a urgencias operativas.",
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
  usePageView("/preguntas-frecuentes");
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);

  const allQa = CATEGORIES.flatMap((c) => c.qa);

  useSEO({
    title: "Preguntas frecuentes · FichaEleam",
    description: "Preguntas frecuentes sobre FichaEleam: precios, planes, demo gratis, implementación, seguridad de datos, equipo y permisos, soporte. Software para ELEAM en Chile.",
    path: "/preguntas-frecuentes",
    image: PUBLIC_ASSETS.shift.publicSrc,
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

  const { openDemo } = useOutletContext();

  return (
        <div className="bg-white">
          <section className="bg-slate-50 px-5 py-14 sm:py-20">
            <div className="mx-auto max-w-6xl">
              <PublicBreadcrumb current="Preguntas frecuentes" />
              <PublicBadge>Respuestas claras</PublicBadge>
              <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Preguntas frecuentes sobre FichaEleam
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Producto, precios, demo, implementación, seguridad, permisos y soporte para ELEAM en Chile.
              </p>
            </div>
          </section>

          <PublicSection>
            <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Categorías</p>
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
                <div className="mt-6 hidden rounded-2xl border border-slate-100 bg-slate-50 p-4 lg:block">
                  <p className="text-sm font-semibold text-slate-950">¿Evaluando FichaEleam?</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">La demo permite revisar el flujo completo antes de contratar.</p>
                  <button type="button" onClick={() => openDemo("faq_sidebar")} className={`${PUBLIC_BUTTON.primary} mt-4 w-full py-2`}>
                    Solicitar demo
                  </button>
                </div>
              </aside>

              <div className="space-y-12">
                {CATEGORIES.map((c) => (
                  <section key={c.id} id={`cat-${c.id}`} aria-labelledby={`h-${c.id}`}>
                    <h2 id={`h-${c.id}`} className="mb-4 text-2xl font-semibold text-slate-950">{c.label}</h2>
                    <div className="space-y-3">
                      {c.qa.map((qa) => <FaqDisclosure key={qa.q} q={qa.q} a={qa.a} />)}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </PublicSection>

          <PublicCtaBand
            title="¿Tu duda no está aquí?"
            text="Escríbenos por correo o WhatsApp, o solicita una demo para revisar el caso de tu ELEAM."
            primaryLabel="Solicitar demo"
            onPrimary={openDemo}
            source="faq_footer"
            secondaryLabel="Ir a contacto"
            secondaryTo="/contacto"
          />
        </div>
  );
}
