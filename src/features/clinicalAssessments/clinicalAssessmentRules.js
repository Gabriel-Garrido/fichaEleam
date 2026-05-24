import { formatDateOnly } from "../../utils/dateUtils";

export const ASSESSMENT_TYPES = ["barthel", "katz"];

export const ASSESSMENT_LABEL = {
  barthel: "Índice de Barthel",
  katz: "Escala de Katz",
};

export const ASSESSMENT_SHORT_LABEL = {
  barthel: "Barthel",
  katz: "Katz",
};

export const ASSESSMENT_HELP = {
  barthel:
    "Índice de Barthel: escala del 0 al 100 que mide cuánta ayuda necesita la persona en actividades básicas como comer, vestirse o caminar. Mayor puntaje = más autonomía.",
  katz:
    "Escala de Katz: clasifica el grado de independencia en 6 actividades básicas (bañarse, vestirse, ir al baño, moverse, controlar esfínteres y alimentarse). Resultado A = totalmente independiente, G = totalmente dependiente.",
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

const KATZ_OPTIONS = [
  { value: "independiente", label: "Independiente" },
  { value: "dependiente", label: "Dependiente" },
];

export function getKatzOptions() {
  return KATZ_OPTIONS;
}

function isBarthelComplete(detalle) {
  return BARTHEL_ITEMS.every((item) => detalle[item.key] != null && !Number.isNaN(Number(detalle[item.key])));
}

function isKatzComplete(detalle) {
  return KATZ_ITEMS.every((item) => detalle[item.key] === "independiente" || detalle[item.key] === "dependiente");
}

export function isAssessmentComplete(tipo, detalle = {}) {
  if (tipo === "barthel") return isBarthelComplete(detalle);
  if (tipo === "katz") return isKatzComplete(detalle);
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

export function computeAssessment(tipo, detalle = {}) {
  if (tipo === "barthel") return computeBarthel(detalle);
  if (tipo === "katz") return computeKatz(detalle);
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
  return [];
}
