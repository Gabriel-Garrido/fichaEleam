import {
  nullIfBlank,
  optionalNumber,
  parseWithSchema,
  requiredText,
  selectField,
  z,
} from "../../utils/formValidation";

export const BED_TYPE_VALUES = ["estandar", "clinica", "bariatrica", "otra"];
export const BED_STATUS_VALUES = ["operativa", "mantenimiento", "inactiva"];

const roomSchema = z.object({
  id: z.string().optional().nullable(),
  codigo: requiredText("Código", 40),
  nombre: z.string().optional().nullable().transform((value) => nullIfBlank(value, 120)),
  piso: z.string().optional().nullable().transform((value) => nullIfBlank(value, 80)),
  sector: z.string().optional().nullable().transform((value) => nullIfBlank(value, 120)),
  estado: selectField("Estado", BED_STATUS_VALUES, { required: true }),
  orden: optionalNumber("Orden", { min: 0, max: 9999, integer: true }).transform((value) => value ?? 0),
  notas: z.string().optional().nullable().transform((value) => nullIfBlank(value, 500)),
});

const bedSchema = z.object({
  id: z.string().optional().nullable(),
  habitacion_id: requiredText("Habitación"),
  codigo: requiredText("Código", 40),
  nombre: z.string().optional().nullable().transform((value) => nullIfBlank(value, 120)),
  tipo: selectField("Tipo", BED_TYPE_VALUES, { required: true }),
  estado: selectField("Estado", BED_STATUS_VALUES, { required: true }),
  orden: optionalNumber("Orden", { min: 0, max: 9999, integer: true }).transform((value) => value ?? 0),
  notas: z.string().optional().nullable().transform((value) => nullIfBlank(value, 500)),
});

export function validateRoomForm(form) {
  return parseWithSchema(roomSchema, form);
}

export function validateBedForm(form) {
  return parseWithSchema(bedSchema, form);
}
