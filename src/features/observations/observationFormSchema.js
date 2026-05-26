import {
  nullIfBlank,
  parseWithSchema,
  requiredDateTime,
  requiredText,
  selectField,
  z,
} from "../../utils/formValidation";

export const OBSERVATION_TYPES = [
  ["observacion_general", "Observación general"],
  ["caida", "Caída"],
  ["incidente", "Incidente"],
  ["curacion", "Curación / Procedimiento"],
  ["visita_medica", "Visita médica"],
  ["administracion_medicamento", "Administración de medicamento"],
  ["cambio_posicion", "Cambio de posición"],
  ["higiene", "Higiene y cuidados"],
  ["alimentacion", "Alimentación"],
  ["eliminacion", "Eliminación"],
  ["actividad", "Actividad recreativa / rehabilitación"],
  ["otro", "Otro"],
];

// Agrupación por categoría para selector visual; el value sigue siendo el mismo.
export const OBSERVATION_TYPE_GROUPS = [
  {
    id: "clinica",
    label: "Clínica",
    description: "Eventos y procedimientos con impacto clínico directo.",
    types: ["caida", "incidente", "curacion", "visita_medica", "administracion_medicamento"],
  },
  {
    id: "cuidado",
    label: "Cuidados básicos",
    description: "Rutinas asistenciales del día a día.",
    types: ["cambio_posicion", "higiene", "alimentacion", "eliminacion"],
  },
  {
    id: "psicosocial",
    label: "Psicosocial",
    description: "Actividades, bienestar y contacto familiar.",
    types: ["actividad"],
  },
  {
    id: "general",
    label: "Otras",
    description: "Notas generales y casos sin categoría específica.",
    types: ["observacion_general", "otro"],
  },
];

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
  visible_familiar: z.boolean().default(false),
  resumen_familiar: z.string().optional().nullable().transform((value) => nullIfBlank(value, 240)),
}).superRefine((data, ctx) => {
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
  if (data.visible_familiar && !data.resumen_familiar) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["resumen_familiar"],
      message: "Escribe un resumen para familia antes de publicar esta observación.",
    });
  }
});

export function normalizeObservationForm(form) {
  const parsed = observationSchema.parse(form);
  return {
    ...parsed,
    seguimiento_fecha: parsed.requiere_seguimiento ? parsed.seguimiento_fecha : null,
    seguimiento_turno: parsed.requiere_seguimiento ? parsed.seguimiento_turno : null,
    seguimiento_estado: "pendiente",
    visible_familiar: parsed.visible_familiar,
    resumen_familiar: parsed.visible_familiar ? parsed.resumen_familiar : null,
  };
}

export function validateObservationForm(form) {
  return parseWithSchema(observationSchema.transform(normalizeObservationForm), form);
}
