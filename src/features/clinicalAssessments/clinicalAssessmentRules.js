import { formatDateOnly } from "../../utils/dateUtils";

export const ASSESSMENT_TYPES = ["barthel", "katz", "mna", "mmse", "tinetti"];

export const ASSESSMENT_LABEL = {
  barthel: "Índice de Barthel",
  katz: "Escala de Katz",
  mna: "Mini Nutritional Assessment (MNA)",
  mmse: "Mini-Mental State Examination (MMSE)",
  tinetti: "Test de Tinetti (POMA)",
};

export const ASSESSMENT_SHORT_LABEL = {
  barthel: "Barthel",
  katz: "Katz",
  mna: "MNA",
  mmse: "MMSE",
  tinetti: "Tinetti",
};

export const ASSESSMENT_HELP = {
  barthel:
    "Índice de Barthel: escala del 0 al 100 que mide cuánta ayuda necesita la persona en actividades básicas como comer, vestirse o caminar. Mayor puntaje = más autonomía.",
  katz:
    "Escala de Katz: clasifica el grado de independencia en 6 actividades básicas (bañarse, vestirse, ir al baño, moverse, controlar esfínteres y alimentarse). Resultado A = totalmente independiente, G = totalmente dependiente.",
  mna:
    "MNA: evaluación nutricional geriátrica de 30 puntos. Mayor puntaje = menor riesgo nutricional.",
  mmse:
    "MMSE: tamizaje cognitivo de 30 puntos. Mayor puntaje = mejor rendimiento cognitivo.",
  tinetti:
    "Test de Tinetti (POMA): evalúa equilibrio (16 pts) y marcha (12 pts), total 28 pts. Puntaje ≥ 25 = bajo riesgo de caída; 19–24 = riesgo moderado; < 19 = alto riesgo.",
};

export const MOTIVO_OPTIONS = [
  { value: "ingreso", label: "Al ingreso", help: "Primera evaluación tras el ingreso del residente." },
  { value: "rutina", label: "Control de rutina", help: "Reevaluación periódica programada (cada 6 meses según norma MINSAL)." },
  { value: "post_hospitalizacion", label: "Después de hospitalización", help: "Reevaluación tras alta hospitalaria; debe registrarse dentro de 7 días." },
  { value: "caida", label: "Después de una caída", help: "Reevaluación tras una caída significativa; idealmente dentro de 14 días." },
  { value: "cambio_clinico", label: "Cambio en el estado de salud", help: "Cambio relevante (deterioro cognitivo, nueva enfermedad, cambio de medicación)." },
  { value: "solicitud_medica", label: "Solicitud médica", help: "Reevaluación indicada por médico tratante." },
];

export const MOTIVO_LABEL = MOTIVO_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

export const REEVALUATION_INTERVALS = {
  ingreso: 30,
  rutina: 180,
  post_hospitalizacion: 7,
  caida: 14,
  cambio_clinico: 30,
  solicitud_medica: 30,
};

export const BARTHEL_ITEMS = [
  {
    key: "alimentacion",
    label: "Alimentación",
    help: "¿Puede comer sin ayuda al servirle la comida?",
    options: [
      { value: 0, label: "Necesita ser alimentado" },
      { value: 5, label: "Necesita ayuda para cortar o usar utensilios" },
      { value: 10, label: "Come solo sin asistencia" },
    ],
  },
  {
    key: "bano",
    label: "Baño",
    help: "¿Puede bañarse o ducharse sin ayuda?",
    options: [
      { value: 0, label: "Necesita ayuda" },
      { value: 5, label: "Lo hace solo" },
    ],
  },
  {
    key: "vestido",
    label: "Vestido",
    help: "¿Puede vestirse y desvestirse sin asistencia?",
    options: [
      { value: 0, label: "Necesita que lo vistan" },
      { value: 5, label: "Necesita algo de ayuda" },
      { value: 10, label: "Se viste solo" },
    ],
  },
  {
    key: "aseo_personal",
    label: "Aseo personal",
    help: "Lavarse cara y manos, peinarse, cepillarse los dientes, afeitarse.",
    options: [
      { value: 0, label: "Necesita ayuda" },
      { value: 5, label: "Lo hace solo" },
    ],
  },
  {
    key: "uso_wc",
    label: "Uso del baño (WC)",
    help: "Llegar al baño, usarlo y vestirse después.",
    options: [
      { value: 0, label: "Dependiente, no llega al baño" },
      { value: 5, label: "Necesita algo de ayuda" },
      { value: 10, label: "Independiente" },
    ],
  },
  {
    key: "traslado",
    label: "Trasladarse cama-silla",
    help: "Pasar de la cama a la silla y volver.",
    options: [
      { value: 0, label: "No puede, requiere grúa o dos personas" },
      { value: 5, label: "Necesita mucha ayuda física" },
      { value: 10, label: "Necesita supervisión o ayuda mínima" },
      { value: 15, label: "Lo hace solo" },
    ],
  },
  {
    key: "deambulacion",
    label: "Desplazarse",
    help: "Caminar por superficie plana o usar silla de ruedas.",
    options: [
      { value: 0, label: "Inmóvil" },
      { value: 5, label: "Independiente en silla de ruedas" },
      { value: 10, label: "Camina con ayuda de una persona u apoyo" },
      { value: 15, label: "Camina solo (puede usar bastón)" },
    ],
  },
  {
    key: "escaleras",
    label: "Subir/bajar escaleras",
    help: "Subir y bajar un piso de escaleras.",
    options: [
      { value: 0, label: "No puede" },
      { value: 5, label: "Necesita ayuda o apoyo" },
      { value: 10, label: "Lo hace solo" },
    ],
  },
  {
    key: "heces",
    label: "Control de heces",
    help: "Continencia y uso del baño para deposición.",
    options: [
      { value: 0, label: "Incontinente" },
      { value: 5, label: "Episodios ocasionales o necesita ayuda" },
      { value: 10, label: "Continente" },
    ],
  },
  {
    key: "orina",
    label: "Control de orina",
    help: "Continencia urinaria; manejo de sonda si corresponde.",
    options: [
      { value: 0, label: "Incontinente o sonda no manejada" },
      { value: 5, label: "Episodios ocasionales" },
      { value: 10, label: "Continente" },
    ],
  },
];

export const KATZ_ITEMS = [
  { key: "bano", label: "Baño", help: "¿Puede bañarse sin asistencia (o sólo en una parte del cuerpo)?" },
  { key: "vestido", label: "Vestido", help: "¿Puede tomar la ropa y vestirse sin ayuda? (Salvo amarrar zapatos.)" },
  { key: "uso_wc", label: "Uso del baño", help: "¿Puede ir al baño, usarlo y vestirse después sin ayuda?" },
  { key: "movilidad", label: "Movilidad / Transferencia", help: "¿Puede acostarse, levantarse y sentarse sin ayuda?" },
  { key: "continencia", label: "Continencia", help: "¿Controla esfínteres sin ayuda?" },
  { key: "alimentacion", label: "Alimentación", help: "¿Puede comer sin ayuda? (Salvo cortar la carne o untar mantequilla.)" },
];

export const MNA_ITEMS = [
  {
    key: "ingesta",
    label: "Disminución de ingesta",
    help: "Cambios de apetito o consumo alimentario reciente.",
    options: [
      { value: 0, label: "Disminución severa" },
      { value: 1, label: "Disminución moderada" },
      { value: 2, label: "Sin disminución" },
    ],
  },
  {
    key: "peso",
    label: "Pérdida de peso",
    help: "Pérdida de peso reciente o desconocida.",
    options: [
      { value: 0, label: "Pérdida mayor a 3 kg" },
      { value: 1, label: "No sabe" },
      { value: 2, label: "Pérdida entre 1 y 3 kg" },
      { value: 3, label: "Sin pérdida de peso" },
    ],
  },
  {
    key: "movilidad",
    label: "Movilidad",
    help: "Capacidad para levantarse, salir y desplazarse.",
    options: [
      { value: 0, label: "En cama o silla" },
      { value: 1, label: "Se levanta, no sale" },
      { value: 2, label: "Sale del lugar" },
    ],
  },
  {
    key: "estres",
    label: "Estrés o enfermedad aguda",
    help: "Evento psicológico o enfermedad aguda reciente.",
    options: [
      { value: 0, label: "Sí" },
      { value: 2, label: "No" },
    ],
  },
  {
    key: "neuropsicologico",
    label: "Problemas neuropsicológicos",
    help: "Demencia, depresión u otro compromiso neuropsicológico.",
    options: [
      { value: 0, label: "Severo" },
      { value: 1, label: "Leve" },
      { value: 2, label: "Sin problemas" },
    ],
  },
  {
    key: "imc",
    label: "IMC",
    help: "Índice de masa corporal.",
    options: [
      { value: 0, label: "Menor a 19" },
      { value: 1, label: "19 a menos de 21" },
      { value: 2, label: "21 a menos de 23" },
      { value: 3, label: "23 o más" },
    ],
  },
  {
    key: "vive_independiente",
    label: "Vive independiente",
    help: "Situación de vivienda previa o actual.",
    options: [
      { value: 0, label: "No" },
      { value: 1, label: "Sí" },
    ],
  },
  {
    key: "medicamentos",
    label: "Más de 3 medicamentos al día",
    help: "Uso habitual de múltiples fármacos.",
    options: [
      { value: 0, label: "Sí" },
      { value: 1, label: "No" },
    ],
  },
  {
    key: "lesiones",
    label: "Lesiones o úlceras por presión",
    help: "Presencia de lesiones cutáneas o úlceras.",
    options: [
      { value: 0, label: "Sí" },
      { value: 1, label: "No" },
    ],
  },
  {
    key: "comidas",
    label: "Comidas completas al día",
    help: "Cantidad habitual de comidas completas.",
    options: [
      { value: 0, label: "Una" },
      { value: 1, label: "Dos" },
      { value: 2, label: "Tres" },
    ],
  },
  {
    key: "proteinas",
    label: "Consumo de proteínas",
    help: "Marcadores de ingesta proteica habitual.",
    options: [
      { value: 0, label: "Bajo" },
      { value: 0.5, label: "Intermedio" },
      { value: 1, label: "Adecuado" },
    ],
  },
  {
    key: "frutas_verduras",
    label: "Frutas o verduras",
    help: "Consumo diario de frutas o verduras.",
    options: [
      { value: 0, label: "No" },
      { value: 1, label: "Sí" },
    ],
  },
  {
    key: "liquidos",
    label: "Líquidos al día",
    help: "Cantidad diaria aproximada de líquidos.",
    options: [
      { value: 0, label: "Menos de 3 vasos" },
      { value: 0.5, label: "3 a 5 vasos" },
      { value: 1, label: "Más de 5 vasos" },
    ],
  },
  {
    key: "alimentacion",
    label: "Forma de alimentarse",
    help: "Grado de ayuda necesaria para comer.",
    options: [
      { value: 0, label: "Necesita ayuda" },
      { value: 1, label: "Come con dificultad" },
      { value: 2, label: "Come sin ayuda" },
    ],
  },
  {
    key: "autopercepcion_nutricion",
    label: "Autopercepción nutricional",
    help: "Cómo percibe su propio estado nutricional.",
    options: [
      { value: 0, label: "Malnutrición" },
      { value: 1, label: "No sabe o riesgo" },
      { value: 2, label: "Sin problema" },
    ],
  },
  {
    key: "autopercepcion_salud",
    label: "Autopercepción de salud",
    help: "Comparación subjetiva con otras personas de edad similar.",
    options: [
      { value: 0, label: "Peor" },
      { value: 0.5, label: "No sabe" },
      { value: 1, label: "Igual" },
      { value: 2, label: "Mejor" },
    ],
  },
  {
    key: "circunferencia_braquial",
    label: "Circunferencia braquial",
    help: "Medición de circunferencia braquial.",
    options: [
      { value: 0, label: "Menor a 21 cm" },
      { value: 0.5, label: "21 a 22 cm" },
      { value: 1, label: "Mayor a 22 cm" },
    ],
  },
  {
    key: "circunferencia_pantorrilla",
    label: "Circunferencia de pantorrilla",
    help: "Medición de circunferencia de pantorrilla.",
    options: [
      { value: 0, label: "Menor a 31 cm" },
      { value: 1, label: "31 cm o más" },
    ],
  },
];

export const MMSE_ITEMS = [
  { key: "orientacion_tiempo", label: "Orientación temporal", max: 5, help: "Puntaje de 0 a 5." },
  { key: "orientacion_lugar", label: "Orientación espacial", max: 5, help: "Puntaje de 0 a 5." },
  { key: "registro", label: "Registro de palabras", max: 3, help: "Puntaje de 0 a 3." },
  { key: "atencion_calculo", label: "Atención y cálculo", max: 5, help: "Puntaje de 0 a 5." },
  { key: "recuerdo", label: "Recuerdo diferido", max: 3, help: "Puntaje de 0 a 3." },
  { key: "nominacion", label: "Nominación", max: 2, help: "Puntaje de 0 a 2." },
  { key: "repeticion", label: "Repetición", max: 1, help: "Puntaje de 0 a 1." },
  { key: "orden_tres_pasos", label: "Orden de tres pasos", max: 3, help: "Puntaje de 0 a 3." },
  { key: "lectura", label: "Lectura", max: 1, help: "Puntaje de 0 a 1." },
  { key: "escritura", label: "Escritura", max: 1, help: "Puntaje de 0 a 1." },
  { key: "copia", label: "Copia de figura", max: 1, help: "Puntaje de 0 a 1." },
];

const KATZ_OPTIONS = [
  { value: "independiente", label: "Independiente" },
  { value: "dependiente", label: "Dependiente" },
];

export function getKatzOptions() {
  return KATZ_OPTIONS;
}

function isBarthelComplete(detalle) {
  return BARTHEL_ITEMS.every((item) => isAssessmentItemComplete("barthel", item, detalle));
}

function isKatzComplete(detalle) {
  return KATZ_ITEMS.every((item) => isAssessmentItemComplete("katz", item, detalle));
}

function hasNumericValue(value) {
  return value !== null && value !== undefined && value !== "" && !Number.isNaN(Number(value));
}

function matchesOption(item, value) {
  return item.options.some((opt) => String(opt.value) === String(value));
}

export function isAssessmentItemComplete(tipo, item, detalle = {}) {
  const value = detalle[item.key];
  if (tipo === "barthel" || tipo === "mna") {
    return matchesOption(item, value);
  }
  if (tipo === "katz") {
    return value === "independiente" || value === "dependiente";
  }
  if (tipo === "mmse") {
    if (!hasNumericValue(value)) return false;
    const numeric = Number(value);
    return Number.isInteger(numeric) && numeric >= 0 && numeric <= item.max;
  }
  if (tipo === "tinetti") {
    return matchesOption(item, value);
  }
  return false;
}

function isMnaComplete(detalle) {
  return MNA_ITEMS.every((item) => isAssessmentItemComplete("mna", item, detalle));
}

function isMmseComplete(detalle) {
  return MMSE_ITEMS.every((item) => isAssessmentItemComplete("mmse", item, detalle));
}

export function isAssessmentComplete(tipo, detalle = {}) {
  if (tipo === "barthel") return isBarthelComplete(detalle);
  if (tipo === "katz") return isKatzComplete(detalle);
  if (tipo === "mna") return isMnaComplete(detalle);
  if (tipo === "mmse") return isMmseComplete(detalle);
  if (tipo === "tinetti") return isTinettiComplete(detalle);
  return false;
}

export function computeBarthel(detalle = {}) {
  const puntaje = BARTHEL_ITEMS.reduce((sum, item) => sum + (Number(detalle[item.key]) || 0), 0);
  const resultado = puntaje >= 100 ? "Independiente"
    : puntaje >= 91 ? "Dependencia leve"
    : puntaje >= 61 ? "Dependencia moderada"
    : puntaje >= 21 ? "Dependencia severa"
    : "Dependencia total";
  return { puntaje, resultado };
}

const KATZ_HIERARCHY = ["bano", "vestido", "uso_wc", "movilidad", "continencia", "alimentacion"];

function isIndep(detalle, key) {
  return detalle[key] === "independiente";
}

export function computeKatz(detalle = {}) {
  const indepFlags = KATZ_HIERARCHY.map((key) => isIndep(detalle, key));
  const independientes = indepFlags.filter(Boolean).length;

  let letra = "G";
  if (independientes === 6) letra = "A";
  else if (independientes === 5) letra = "B";
  else if (independientes === 4 && indepFlags[0] && (indepFlags[1] || indepFlags[2] || indepFlags[3] || indepFlags[4] || indepFlags[5])) letra = "C";
  else if (independientes === 3 && indepFlags[0] && indepFlags[1]) letra = "D";
  else if (independientes === 2 && indepFlags[0] && indepFlags[1] && indepFlags[2]) letra = "E";
  else if (independientes === 1 && indepFlags[0] && indepFlags[1] && indepFlags[2] && indepFlags[3]) letra = "F";
  else if (independientes >= 1) letra = "Otro";

  const summary = letra === "A" ? "Independiente"
    : letra === "G" ? "Dependiente"
    : letra === "Otro" ? "Dependencia mixta"
    : "Dependencia parcial";
  const resultado = `Katz ${letra} · ${summary}`;
  return { puntaje: independientes, resultado, letra };
}

export function computeMna(detalle = {}) {
  const raw = MNA_ITEMS.reduce((sum, item) => sum + (Number(detalle[item.key]) || 0), 0);
  const puntajeDecimal = Math.round(raw * 10) / 10;
  const puntaje = Math.round(puntajeDecimal);
  const resultado = puntajeDecimal >= 24 ? "Estado nutricional normal"
    : puntajeDecimal >= 17 ? "Riesgo de malnutrición"
    : "Malnutrición";
  return { puntaje, puntajeDecimal, resultado };
}

export function computeMmse(detalle = {}) {
  const puntaje = MMSE_ITEMS.reduce((sum, item) => sum + (Number(detalle[item.key]) || 0), 0);
  const resultado = puntaje >= 27 ? "Rendimiento cognitivo esperado"
    : puntaje >= 24 ? "Sospecha leve"
    : puntaje >= 18 ? "Compromiso moderado"
    : "Compromiso severo";
  return { puntaje, resultado };
}

export function computeAssessment(tipo, detalle = {}) {
  if (tipo === "barthel") return computeBarthel(detalle);
  if (tipo === "katz") return computeKatz(detalle);
  if (tipo === "mna") return computeMna(detalle);
  if (tipo === "mmse") return computeMmse(detalle);
  if (tipo === "tinetti") return computeTinetti(detalle);
  return { puntaje: 0, resultado: "Sin datos" };
}

function todayLocal() {
  return new Date();
}

export function addDaysIso(fechaIso, days) {
  const [y, m, d] = String(fechaIso).split("-").map(Number);
  if (!y || !m || !d) return null;
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + days);
  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function computeNextEvaluation(fechaEvaluacion, motivo = "rutina") {
  const days = REEVALUATION_INTERVALS[motivo] ?? REEVALUATION_INTERVALS.rutina;
  return addDaysIso(fechaEvaluacion, days);
}

export function evaluationStatus(proximaEvaluacion, now = todayLocal()) {
  if (!proximaEvaluacion) {
    return { tone: "slate", label: "Sin registro", state: "missing" };
  }
  const [y, m, d] = String(proximaEvaluacion).split("-").map(Number);
  if (!y || !m || !d) return { tone: "slate", label: "Fecha inválida", state: "missing" };
  const due = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) {
    return {
      tone: "rose",
      label: `Vencida hace ${Math.abs(diff)} ${Math.abs(diff) === 1 ? "día" : "días"}`,
      state: "overdue",
      days: diff,
    };
  }
  if (diff <= 30) {
    return {
      tone: "amber",
      label: diff === 0 ? "Vence hoy" : `Vence en ${diff} ${diff === 1 ? "día" : "días"}`,
      state: "due_soon",
      days: diff,
    };
  }
  return {
    tone: "emerald",
    label: `Próxima: ${formatDateOnly(proximaEvaluacion)}`,
    state: "ok",
    days: diff,
  };
}

export function getItems(tipo) {
  if (tipo === "barthel") return BARTHEL_ITEMS;
  if (tipo === "katz") return KATZ_ITEMS;
  if (tipo === "mna") return MNA_ITEMS;
  if (tipo === "mmse") return MMSE_ITEMS;
  if (tipo === "tinetti") return [...TINETTI_EQUILIBRIO_ITEMS, ...TINETTI_MARCHA_ITEMS];
  return [];
}

// ============================================================
// TINETTI POMA (Performance Oriented Mobility Assessment)
// Equilibrio: 16 pts max | Marcha: 12 pts max | Total: 28 pts
// ============================================================

export const TINETTI_EQUILIBRIO_ITEMS = [
  {
    key: "eq_sentado",
    label: "Equilibrio sentado",
    help: "Observar la postura del residente sentado en silla sin reposabrazos.",
    section: "equilibrio",
    options: [
      { value: 0, label: "Se inclina o resbala" },
      { value: 1, label: "Seguro y estable" },
    ],
  },
  {
    key: "eq_levantarse",
    label: "Levantarse",
    help: "¿Puede levantarse de la silla sin ayuda?",
    section: "equilibrio",
    options: [
      { value: 0, label: "Incapaz sin ayuda" },
      { value: 1, label: "Capaz, pero usa los brazos o no es en un movimiento suave" },
      { value: 2, label: "Capaz sin usar los brazos, movimiento fluido" },
    ],
  },
  {
    key: "eq_intentos_levantarse",
    label: "Intentos para levantarse",
    help: "¿Cuántos intentos necesita para ponerse de pie?",
    section: "equilibrio",
    options: [
      { value: 0, label: "Incapaz sin ayuda" },
      { value: 1, label: "Necesita más de un intento" },
      { value: 2, label: "Lo consigue en un único intento" },
    ],
  },
  {
    key: "eq_bipedestacion_inmediata",
    label: "Equilibrio en bipedestación (primeros 5 seg)",
    help: "Evaluar el primer momento al ponerse de pie.",
    section: "equilibrio",
    options: [
      { value: 0, label: "Inestable (tambalea, mueve pies, marcado balanceo del tronco)" },
      { value: 1, label: "Estable pero usa andador, bastón o se agarra de algo" },
      { value: 2, label: "Estable sin soporte" },
    ],
  },
  {
    key: "eq_bipedestacion",
    label: "Equilibrio en bipedestación (prolongado)",
    help: "Pedir al residente que permanezca de pie con los pies juntos.",
    section: "equilibrio",
    options: [
      { value: 0, label: "Inestable" },
      { value: 1, label: "Estable, pero con base de sustentación amplia o necesita soporte" },
      { value: 2, label: "Base estrecha sin soporte" },
    ],
  },
  {
    key: "eq_empujon",
    label: "Empujón (pies juntos)",
    help: "Empujar suavemente 3 veces en el esternón. Observar si pierde el equilibrio.",
    section: "equilibrio",
    options: [
      { value: 0, label: "Comienza a caer" },
      { value: 1, label: "Se tambalea pero se recupera solo" },
      { value: 2, label: "Estable" },
    ],
  },
  {
    key: "eq_ojos_cerrados",
    label: "Equilibrio con ojos cerrados",
    help: "Pedir al residente que cierre los ojos mientras está de pie con los pies juntos.",
    section: "equilibrio",
    options: [
      { value: 0, label: "Inestable" },
      { value: 1, label: "Estable" },
    ],
  },
  {
    key: "eq_giro_360",
    label: "Giro de 360°",
    help: "Pedir al residente que dé una vuelta completa.",
    section: "equilibrio",
    options: [
      { value: 0, label: "Pasos discontinuos o inestable" },
      { value: 1, label: "Pasos continuos y estable" },
    ],
  },
  {
    key: "eq_sentarse",
    label: "Sentarse",
    help: "Observar cómo se sienta.",
    section: "equilibrio",
    options: [
      { value: 0, label: "Inseguro (calcula mal la distancia, cae en la silla)" },
      { value: 1, label: "Usa los brazos o no es un movimiento suave" },
      { value: 2, label: "Seguro, movimiento fluido" },
    ],
  },
];

export const TINETTI_MARCHA_ITEMS = [
  {
    key: "ma_inicio",
    label: "Inicio de la marcha",
    help: "Observar el primer paso después de ordenarle que camine.",
    section: "marcha",
    options: [
      { value: 0, label: "Hesitación o necesita varios intentos" },
      { value: 1, label: "Inicio sin hesitación" },
    ],
  },
  {
    key: "ma_longitud_pie_der",
    label: "Longitud del paso — pie derecho",
    help: "¿El pie derecho sobrepasa al izquierdo al avanzar?",
    section: "marcha",
    options: [
      { value: 0, label: "No sobrepasa el pie contrario" },
      { value: 1, label: "Sobrepasa el pie contrario" },
    ],
  },
  {
    key: "ma_longitud_pie_izq",
    label: "Longitud del paso — pie izquierdo",
    help: "¿El pie izquierdo sobrepasa al derecho al avanzar?",
    section: "marcha",
    options: [
      { value: 0, label: "No sobrepasa el pie contrario" },
      { value: 1, label: "Sobrepasa el pie contrario" },
    ],
  },
  {
    key: "ma_simetria",
    label: "Simetría del paso",
    help: "¿Los pasos son iguales en longitud?",
    section: "marcha",
    options: [
      { value: 0, label: "Asimétrico (un lado da pasos más largos)" },
      { value: 1, label: "Simétrico" },
    ],
  },
  {
    key: "ma_continuidad",
    label: "Continuidad del paso",
    help: "¿La marcha es continua o con detenciones?",
    section: "marcha",
    options: [
      { value: 0, label: "Se detiene o hay discontinuidad" },
      { value: 1, label: "Continua" },
    ],
  },
  {
    key: "ma_trayectoria",
    label: "Trayectoria",
    help: "Observar si se desvía de la línea recta en unos 3 metros.",
    section: "marcha",
    options: [
      { value: 0, label: "Marcada desviación" },
      { value: 1, label: "Desviación leve o usa ayudas" },
      { value: 2, label: "Sin desviación, sin ayudas" },
    ],
  },
  {
    key: "ma_tronco",
    label: "Estabilidad del tronco",
    help: "¿Hay balanceo del tronco, flexión de rodillas o espalda, extensión de brazos?",
    section: "marcha",
    options: [
      { value: 0, label: "Marcado balanceo u otras inestabilidades" },
      { value: 1, label: "Sin balanceo pero con flexión u otras ayudas" },
      { value: 2, label: "Sin balanceo, sin flexión, sin ayudas" },
    ],
  },
];

export const TINETTI_EQUILIBRIO_MAX = TINETTI_EQUILIBRIO_ITEMS.reduce(
  (sum, item) => sum + Math.max(...item.options.map((o) => o.value)), 0
);

export const TINETTI_MARCHA_MAX = TINETTI_MARCHA_ITEMS.reduce(
  (sum, item) => sum + Math.max(...item.options.map((o) => o.value)), 0
);

function isTinettiComplete(detalle) {
  return [...TINETTI_EQUILIBRIO_ITEMS, ...TINETTI_MARCHA_ITEMS].every(
    (item) => matchesOption(item, detalle[item.key])
  );
}

export function computeTinetti(detalle = {}) {
  const equilibrio = TINETTI_EQUILIBRIO_ITEMS.reduce(
    (sum, item) => sum + (Number(detalle[item.key]) || 0), 0
  );
  const marcha = TINETTI_MARCHA_ITEMS.reduce(
    (sum, item) => sum + (Number(detalle[item.key]) || 0), 0
  );
  const puntaje = equilibrio + marcha;
  const resultado = puntaje >= 25 ? "Bajo riesgo de caída"
    : puntaje >= 19 ? "Riesgo moderado de caída"
    : "Alto riesgo de caída";
  return { puntaje, equilibrio, marcha, resultado };
}
