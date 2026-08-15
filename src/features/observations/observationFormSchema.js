import {
  nullIfBlank,
  parseWithSchema,
  requiredDateTime,
  requiredText,
  selectField,
  z,
} from "../../utils/formValidation";

export const OBSERVATION_TYPES = [
  ["observacion_general", "Estado general"],
  ["cambio_clinico", "Cambio clínico o síntoma"],
  ["dolor", "Dolor"],
  ["piel_heridas", "Piel o heridas"],
  ["conducta_animo", "Conducta o estado de ánimo"],
];

export const OBSERVATION_CATEGORY_GUIDANCE = {
  observacion_general: {
    help: "Resume sólo cambios relevantes respecto del estado habitual, usando hechos observables y lenguaje claro.",
    descriptionLabel: "Evolución observada",
    descriptionPlaceholder: "Ej.: se mantiene alerta y colaborador; durante la tarde presenta mayor somnolencia que de costumbre, sin otras molestias referidas.",
    actionsLabel: "Atención, respuesta y plan",
    actionsPlaceholder: "Indica qué se hizo, cómo respondió y qué debe continuar. Si no fue necesario intervenir, puedes dejarlo vacío.",
    actionsHint: "Incluye la respuesta del residente cuando se haya realizado alguna acción.",
    actionsRequired: false,
  },
  cambio_clinico: {
    help: "Describe el inicio, evolución y características del síntoma o cambio. Los signos vitales se registran en su formulario específico.",
    descriptionLabel: "Síntoma o cambio observado",
    descriptionPlaceholder: "Indica cuándo comenzó, cómo evolucionó, manifestaciones observables y lo referido por el residente.",
    actionsLabel: "Atención realizada y respuesta",
    actionsPlaceholder: "Registra la evaluación o medidas realizadas, a quién se informó, indicaciones recibidas y respuesta del residente.",
    actionsHint: "Este campo es obligatorio ante un cambio clínico.",
    actionsRequired: true,
  },
  dolor: {
    help: "Registra ubicación, intensidad de 0 a 10, inicio, duración y factores que alivian o agravan el dolor.",
    descriptionLabel: "Características del dolor",
    descriptionPlaceholder: "Ej.: dolor de rodilla derecha 6/10 desde las 14:00, aumenta al caminar y disminuye en reposo.",
    actionsLabel: "Medidas realizadas y respuesta",
    actionsPlaceholder: "Indica medidas de alivio, aviso al profesional, indicaciones y nueva intensidad del dolor si fue reevaluado.",
    actionsHint: "Este campo es obligatorio al registrar dolor.",
    actionsRequired: true,
  },
  piel_heridas: {
    help: "Describe ubicación, aspecto, tamaño aproximado y cambios de la piel o herida, sin duplicar una tarea rutinaria de cuidado.",
    descriptionLabel: "Estado de la piel o herida",
    descriptionPlaceholder: "Ej.: enrojecimiento de 2 cm en talón derecho, piel íntegra, sin secreción y sensible al contacto.",
    actionsLabel: "Cuidado realizado y respuesta",
    actionsPlaceholder: "Indica protección o curación realizada, productos utilizados, aviso profesional y respuesta observada.",
    actionsHint: "Este campo es obligatorio al registrar piel o heridas.",
    actionsRequired: true,
  },
  conducta_animo: {
    help: "Registra conductas o cambios emocionales observables, su contexto y posibles desencadenantes, evitando etiquetas o juicios.",
    descriptionLabel: "Conducta o estado de ánimo observado",
    descriptionPlaceholder: "Ej.: se muestra inquieto al anochecer, camina por el pasillo y pregunta repetidamente por su familia.",
    actionsLabel: "Apoyo realizado y respuesta",
    actionsPlaceholder: "Indica acompañamiento, estrategias utilizadas, comunicación al equipo y respuesta del residente.",
    actionsHint: "Déjalo vacío únicamente si no fue necesario intervenir.",
    actionsRequired: false,
  },
};

export const OBSERVATION_TURNS = [
  ["mañana", "Mañana"],
  ["tarde", "Tarde"],
  ["noche", "Noche"],
];

const typeValues = OBSERVATION_TYPES.map(([value]) => value);
const turnValues = OBSERVATION_TURNS.map(([value]) => value);

const observationSchema = z.object({
  residente_id: requiredText("Residente"),
  fecha_hora: requiredDateTime("Fecha y hora"),
  turno: selectField("Turno", turnValues, { required: true }),
  tipo: selectField("Tipo de observación", typeValues, { required: true }),
  descripcion: requiredText("Descripción", 2000),
  acciones_tomadas: z.string().optional().nullable().transform((value) => nullIfBlank(value, 1000)),
  requiere_seguimiento: z.boolean().default(false),
  seguimiento_fecha: z.string().optional().nullable().transform((value) => nullIfBlank(value)),
  seguimiento_turno: z.string().optional().nullable().transform((value) => nullIfBlank(value)),
}).superRefine((data, ctx) => {
  if (OBSERVATION_CATEGORY_GUIDANCE[data.tipo]?.actionsRequired && !data.acciones_tomadas) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["acciones_tomadas"], message: "Registra la atención realizada y la respuesta del residente." });
  }
  if (data.requiere_seguimiento) {
    if (!data.seguimiento_fecha) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["seguimiento_fecha"], message: "Indica la fecha del seguimiento." });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.seguimiento_fecha)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["seguimiento_fecha"], message: "La fecha del seguimiento debe ser válida." });
    }
    if (!data.seguimiento_turno || !turnValues.includes(data.seguimiento_turno)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["seguimiento_turno"], message: "Indica el turno del seguimiento." });
    }
  }
});

export function normalizeObservationForm(form) {
  const parsed = observationSchema.parse(form);
  return {
    ...parsed,
    seguimiento_fecha: parsed.requiere_seguimiento ? parsed.seguimiento_fecha : null,
    seguimiento_turno: parsed.requiere_seguimiento ? parsed.seguimiento_turno : null,
    seguimiento_estado: "pendiente",
  };
}

export function validateObservationForm(form) {
  return parseWithSchema(observationSchema.transform(normalizeObservationForm), form);
}
