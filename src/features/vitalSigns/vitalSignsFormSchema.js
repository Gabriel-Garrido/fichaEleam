import {
  nullIfBlank,
  optionalNumber,
  parseWithSchema,
  requiredDateTime,
  requiredText,
  selectField,
  z,
} from "../../utils/formValidation";

export const VITAL_TURNS = ["mañana", "tarde", "noche"];

export const VITAL_NUMERIC_RULES = {
  presion_sistolica: ["P/A sistólica", 50, 300, true],
  presion_diastolica: ["P/A diastólica", 30, 200, true],
  frecuencia_cardiaca: ["Frecuencia cardiaca", 20, 300, true],
  frecuencia_respiratoria: ["Frecuencia respiratoria", 5, 60, true],
  temperatura: ["Temperatura", 30, 45, false],
  saturacion_oxigeno: ["SatO₂", 0, 100, true],
  glucosa: ["Glucosa", 20, 800, true],
  peso: ["Peso", 10, 300, false],
  dolor_escala: ["Dolor", 0, 10, true],
};

const vitalSignsSchema = z.object({
  residente_id: requiredText("Residente"),
  fecha_hora: requiredDateTime("Fecha y hora"),
  turno: selectField("Turno", VITAL_TURNS, { required: true }),
  presion_sistolica: optionalNumber("P/A sistólica", { min: 50, max: 300, integer: true }),
  presion_diastolica: optionalNumber("P/A diastólica", { min: 30, max: 200, integer: true }),
  frecuencia_cardiaca: optionalNumber("Frecuencia cardiaca", { min: 20, max: 300, integer: true }),
  frecuencia_respiratoria: optionalNumber("Frecuencia respiratoria", { min: 5, max: 60, integer: true }),
  temperatura: optionalNumber("Temperatura", { min: 30, max: 45 }),
  saturacion_oxigeno: optionalNumber("SatO₂", { min: 0, max: 100, integer: true }),
  glucosa: optionalNumber("Glucosa", { min: 20, max: 800, integer: true }),
  peso: optionalNumber("Peso", { min: 10, max: 300 }),
  dolor_escala: optionalNumber("Dolor", { min: 0, max: 10, integer: true }),
  estado_conciencia: selectField("Estado de conciencia", ["alerta", "somnoliento", "estuporoso", "coma"]),
  observaciones: z.string().optional().nullable().transform((value) => nullIfBlank(value, 1000)),
  requiere_seguimiento: z.boolean().default(false),
  seguimiento_fecha: z.string().optional().nullable().transform((value) => nullIfBlank(value)),
  seguimiento_turno: z.string().optional().nullable().transform((value) => nullIfBlank(value)),
}).superRefine((data, ctx) => {
  if (!data.requiere_seguimiento) return;
  if (!data.seguimiento_fecha) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["seguimiento_fecha"], message: "Indica la fecha del seguimiento." });
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.seguimiento_fecha)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["seguimiento_fecha"], message: "La fecha del seguimiento debe ser válida." });
  }
  if (!data.seguimiento_turno || !VITAL_TURNS.includes(data.seguimiento_turno)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["seguimiento_turno"], message: "Indica el turno del seguimiento." });
  }
});

export function normalizeVitalSignsForm(form) {
  const parsed = vitalSignsSchema.parse(form);
  return {
    ...parsed,
    seguimiento_fecha: parsed.requiere_seguimiento ? parsed.seguimiento_fecha : null,
    seguimiento_turno: parsed.requiere_seguimiento ? parsed.seguimiento_turno : null,
  };
}

export function validateVitalSignsForm(form) {
  return parseWithSchema(vitalSignsSchema.transform(normalizeVitalSignsForm), form);
}
