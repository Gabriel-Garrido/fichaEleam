// Plazos del período transitorio del Decreto N°20 para la página pública
// /plazos-decreto-20 y el prerender SEO. Datos puros, sin dependencias.
import { DECRETO20_META } from "./decreto20Eleam.js";

export const PLAZOS_META = {
  nombre: "Plazos del Decreto N°20 para ELEAM",
  descripcion:
    "Fechas límite del período transitorio del Decreto N°20 del MINSAL: cuándo entró en vigencia, cuándo vence el plazo general de adecuación y cuándo la certificación contra incendios.",
  fuenteUrl: DECRETO20_META.fuenteUrl,
  fuenteNombre: DECRETO20_META.fuenteNombre,
};

export const PLAZOS_HITOS = [
  {
    id: "vigencia",
    fecha: "2025-10-01",
    fechaLegible: "1 de octubre de 2025",
    titulo: "Entrada en vigencia del Decreto N°20",
    descripcion:
      "El nuevo reglamento de ELEAM rige desde esta fecha. Los establecimientos nuevos deben cumplirlo de inmediato; los existentes entran al período transitorio de adecuación.",
    acciones: [
      "Conocer la matriz completa de requisitos del decreto.",
      "Levantar una autoevaluación inicial de brechas.",
      "Designar un responsable interno del plan de adecuación.",
    ],
  },
  {
    id: "general",
    fecha: "2028-10-01",
    fechaLegible: "1 de octubre de 2028",
    titulo: "Fin del plazo general de adecuación (3 años)",
    descripcion:
      "Fecha límite para que los ELEAM existentes cierren las brechas generales: dotación, protocolos, plan de emergencias, registros clínicos, reclamos y documentación exigida.",
    acciones: [
      "Cerrar la matriz de brechas con plan de acción y responsables.",
      "Formalizar protocolos de urgencias, fallecimiento, ingreso y egreso.",
      "Dejar la evidencia documental vigente y ordenada por artículo.",
    ],
  },
  {
    id: "incendios",
    fecha: "2030-10-01",
    fechaLegible: "1 de octubre de 2030",
    titulo: "Plazo de certificación contra incendios (5 años)",
    descripcion:
      "Fecha límite para contar con la certificación de prevención y protección contra incendios, el requisito con mayor plazo por su componente de infraestructura.",
    acciones: [
      "Levantar el estado actual de la infraestructura con un especialista.",
      "Planificar las obras y la certificación con holgura presupuestaria.",
      "Registrar simulacros de incendio y evacuación cada año.",
    ],
  },
];

// Días entre hoy (zona local) y una fecha YYYY-MM-DD. Negativo si ya pasó.
export function diasRestantesPlazo(fechaIso, hoy = new Date()) {
  const [y, m, d] = String(fechaIso).split("-").map(Number);
  const target = new Date(y, (m || 1) - 1, d || 1);
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((target - base) / 86400000);
}

export function plazoEstado(dias) {
  if (dias < 0) return "vencido";
  if (dias <= 365) return "urgente";
  return "vigente";
}

export const PLAZOS_FAQ = [
  {
    q: "¿Cuándo entró en vigencia el Decreto N°20?",
    a: "El 1 de octubre de 2025. Desde esa fecha el nuevo reglamento de ELEAM reemplaza al reglamento anterior y aplica a todos los establecimientos de larga estadía para personas mayores en Chile.",
  },
  {
    q: "¿Cuánto plazo tienen los ELEAM existentes para adecuarse?",
    a: "El período transitorio general es de 3 años desde la entrada en vigencia: hasta el 1 de octubre de 2028. La certificación de prevención y protección contra incendios tiene un plazo mayor, de 5 años: hasta el 1 de octubre de 2030.",
  },
  {
    q: "¿Qué pasa si mi ELEAM no se adecúa dentro del plazo?",
    a: "La SEREMI de Salud puede formular observaciones, aplicar sanciones y, en casos graves, disponer la prohibición de funcionamiento. Llegar al límite del plazo sin un plan de adecuación documentado es el mayor riesgo operacional y legal para un ELEAM.",
  },
  {
    q: "¿Por dónde empiezo la adecuación al decreto?",
    a: "Con una autoevaluación de brechas: identificar qué requisitos ya cumples y cuáles no, asignar responsables y plazos por brecha, y mantener la evidencia documental vigente. La autoevaluación gratuita de FichaEleam es un buen punto de partida.",
  },
  {
    q: "¿Los ELEAM nuevos también tienen período transitorio?",
    a: "No. Los establecimientos que soliciten autorización sanitaria después de la entrada en vigencia deben cumplir el Decreto N°20 completo desde el primer día.",
  },
];
