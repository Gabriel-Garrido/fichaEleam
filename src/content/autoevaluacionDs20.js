// Autoevaluación pública de preparación ante el Decreto N°20.
// Datos puros sin dependencias de React: los consume la página pública
// AutoevaluacionDs20Page y el prerender SEO (scripts/generate-public-seo.mjs).

export const AUTOEVALUACION_META = {
  nombre: "Autoevaluación Decreto N°20 para ELEAM",
  descripcion:
    "Test gratuito de 10 preguntas para medir qué tan preparado está tu ELEAM ante una fiscalización SEREMI según el Decreto N°20 del MINSAL.",
  disclaimer:
    "Resultado referencial para orientar tu plan de adecuación. No reemplaza la pauta oficial del MINSAL ni el criterio de la SEREMI de Salud.",
};

export const AUTOEVALUACION_ITEMS = [
  {
    id: "autorizacion",
    ambito: "Autorización sanitaria",
    articulo: "Arts. 5-6",
    pregunta: "¿Tu ELEAM tiene autorización sanitaria vigente y sin observaciones pendientes de subsanar?",
    ayuda: "La resolución de instalación y funcionamiento debe estar vigente; las observaciones de la SEREMI tienen plazos acotados de respuesta.",
    recurso: { label: "Guía acreditación SEREMI", to: "/acreditacion-seremi" },
  },
  {
    id: "dotacion",
    ambito: "Dotación de personal",
    articulo: "Arts. 15-17",
    pregunta: "¿Cumples la dotación mínima de cuidadores por turno, incluido el mínimo de 2 en la noche?",
    ayuda: "1 cuidador diurno por cada 8 residentes con dependencia, 1 nocturno por cada 12, y siempre al menos 2 cuidadores en horario nocturno.",
    recurso: { label: "Calculadora de dotación", to: "/calculadora-dotacion-eleam" },
  },
  {
    id: "capacitacion",
    ambito: "Capacitación del equipo",
    articulo: "Art. 25",
    pregunta: "¿Tu personal completa un plan de capacitación anual con horas y asistencia registradas?",
    ayuda: "El decreto exige inducción y capacitación anual documentada del equipo de cuidado, con registro verificable.",
    recurso: null,
  },
  {
    id: "emergencias",
    ambito: "Plan de emergencias",
    articulo: "Art. 25 N°3",
    pregunta: "¿Tienes un plan de emergencias y desastres vigente, con al menos un simulacro realizado en el último año?",
    ayuda: "El plan debe cubrir incendio, sismo y evacuación, con responsables definidos y simulacros registrados con fecha y participantes.",
    recurso: { label: "Plazos del Decreto N°20", to: "/plazos-decreto-20" },
  },
  {
    id: "protocolos",
    ambito: "Protocolos operativos",
    articulo: "Art. 25 N°4",
    pregunta: "¿Cuentas con protocolos escritos y vigentes de urgencias médicas y de fallecimiento?",
    ayuda: "Deben existir como documentos formales con pasos de actuación, contactos de derivación y responsables.",
    recurso: null,
  },
  {
    id: "consentimiento",
    ambito: "Ingreso de residentes",
    articulo: "Arts. 22-24",
    pregunta: "¿Cada residente tiene consentimiento de ingreso firmado y carpeta personal completa?",
    ayuda: "El ingreso debe ser voluntario y documentado: consentimiento firmado, carta de derechos y deberes, y reglamento interno entregado.",
    recurso: null,
  },
  {
    id: "evaluaciones",
    ambito: "Evaluaciones geriátricas",
    articulo: "Arts. 22-24",
    pregunta: "¿Tus residentes tienen evaluación funcional, cognitiva y nutricional al día, con reevaluaciones programadas?",
    ayuda: "Escalas como Barthel, Katz, MMSE y MNA al ingreso y reevaluadas según la condición de cada residente.",
    recurso: { label: "Software ELEAM", to: "/software-eleam" },
  },
  {
    id: "red_salud",
    ambito: "Red de salud",
    articulo: "Art. 26",
    pregunta: "¿Cada residente tiene su centro de salud (APS o privado) y sus controles registrados?",
    ayuda: "El decreto exige control de salud mediante la atención primaria o un centro privado, con derivaciones trazables.",
    recurso: null,
  },
  {
    id: "reclamos",
    ambito: "Reclamos y sugerencias",
    articulo: "Art. 27",
    pregunta: "¿Llevas un registro codificado de reclamos y sugerencias, con folio y respuesta formal?",
    ayuda: "El registro debe ser visible y de fácil consulta, con folio por caso y respuesta dentro de plazos razonables.",
    recurso: null,
  },
  {
    id: "carpeta",
    ambito: "Evidencia para fiscalización",
    articulo: "Matriz DS 20",
    pregunta: "Si la SEREMI llegara mañana, ¿podrías mostrar la evidencia de cada requisito en menos de una hora?",
    ayuda: "Certificados, protocolos, registros y documentos vigentes, ordenados por artículo del decreto y sin vencimientos pasados.",
    recurso: { label: "Guía acreditación SEREMI", to: "/acreditacion-seremi" },
  },
];

// respuestas: { [itemId]: true | false | null }
export function scoreAutoevaluacion(respuestas = {}) {
  const total = AUTOEVALUACION_ITEMS.length;
  let si = 0;
  let respondidas = 0;
  const pendientes = [];
  for (const item of AUTOEVALUACION_ITEMS) {
    const value = respuestas[item.id];
    if (value === true) {
      si += 1;
      respondidas += 1;
    } else if (value === false) {
      respondidas += 1;
      pendientes.push(item);
    }
  }
  const pct = respondidas > 0 ? Math.round((si / total) * 100) : 0;
  return {
    total,
    respondidas,
    si,
    pct,
    completo: respondidas === total,
    nivel: autoevalNivel(pct),
    pendientes,
  };
}

export function autoevalNivel(pct) {
  if (pct >= 80) return "alto";
  if (pct >= 50) return "medio";
  return "bajo";
}

export const AUTOEVAL_NIVEL_COPY = {
  alto: {
    titulo: "Buen nivel de preparación",
    texto: "Tu ELEAM cubre la mayoría de los requisitos clave. Concentra el esfuerzo en cerrar los puntos pendientes y en mantener la evidencia vigente.",
  },
  medio: {
    titulo: "Preparación parcial",
    texto: "Hay avances importantes, pero varios requisitos del decreto siguen descubiertos. Prioriza los pendientes de mayor riesgo antes de una fiscalización.",
  },
  bajo: {
    titulo: "Preparación insuficiente",
    texto: "Tu ELEAM está expuesto ante una fiscalización. Conviene armar un plan de adecuación con responsables y plazos lo antes posible.",
  },
};

// Valor compacto para landing_events (tool_use): s = respuestas sí, t = total, p = porcentaje.
export function autoevalEventValue(score) {
  if (!score || !score.respondidas) return null;
  return `s:${score.si}|t:${score.total}|p:${score.pct}`;
}

export const AUTOEVALUACION_FAQ = [
  {
    q: "¿Qué mide esta autoevaluación del Decreto N°20?",
    a: "Revisa 10 requisitos clave del decreto: autorización sanitaria, dotación mínima, capacitación, plan de emergencias, protocolos, consentimiento de ingreso, evaluaciones geriátricas, red de salud, reclamos y evidencia para fiscalización. Entrega un porcentaje de preparación referencial.",
  },
  {
    q: "¿El resultado garantiza que aprobaré una fiscalización SEREMI?",
    a: "No. Es una orientación gratuita para detectar brechas antes de que las detecte la SEREMI. La evaluación oficial depende de la pauta del MINSAL y del criterio de la autoridad sanitaria.",
  },
  {
    q: "¿Necesito registrarme o entregar datos para usarla?",
    a: "No. La autoevaluación es gratuita, anónima y se responde en menos de 3 minutos. Tus respuestas no se guardan asociadas a tu identidad.",
  },
  {
    q: "¿Qué hago con los puntos pendientes que detecte?",
    a: "Cada punto pendiente indica el artículo del decreto involucrado y, cuando existe, un recurso gratuito para profundizar. FichaEleam digitaliza la evidencia de todos estos requisitos: puedes pedir una demo de 30 días para verlo con tus datos.",
  },
];
