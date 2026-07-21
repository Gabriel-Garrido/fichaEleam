import {
  optionalDate,
  optionalRut,
  optionalText,
  parseWithSchema,
  requiredDate,
  requiredText,
  selectField,
  splitCommaList,
  z,
} from "../../utils/formValidation";

export const GRUPOS_SANGUINEOS = [
  ["", "No especificado"],
  ["A+", "A+"], ["A-", "A-"],
  ["B+", "B+"], ["B-", "B-"],
  ["AB+", "AB+"], ["AB-", "AB-"],
  ["O+", "O+"], ["O-", "O-"],
];

export const RESIDENT_EMPTY = {
  nombre: "",
  apellido: "",
  rut: "",
  fecha_nacimiento: "",
  sexo: "",
  nacionalidad: "Chilena",
  estado_civil: "",
  direccion_anterior: "",
  prevision: "",
  diagnostico_principal: "",
  alergias: "",
  grupo_sanguineo: "",
  nivel_dependencia: "",
  condicion_salud_grave: false,
  condicion_salud_grave_detalle: "",
  fecha_ingreso: new Date().toISOString().split("T")[0],
  estado: "activo",
  fecha_egreso: "",
  motivo_egreso: "",
};

const SEXO = ["masculino", "femenino", "otro"];
const CIVIL = ["soltero", "casado", "viudo", "divorciado", "otro"];
const ESTADOS_CREATE = ["activo", "hospitalizado"];
const ESTADOS_EDIT = ["activo", "hospitalizado", "egresado", "fallecido"];
const SANGRE = GRUPOS_SANGUINEOS.map(([value]) => value).filter(Boolean);
const DEPENDENCIA = ["autovalente", "leve", "moderado", "severo", "total"];

function localNoon(value) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export function residentSchema({ isEditing = false } = {}) {
  const allowedStates = isEditing ? ESTADOS_EDIT : ESTADOS_CREATE;
  return z.object({
    nombre: requiredText("Nombre", 120),
    apellido: requiredText("Apellido", 120),
    rut: optionalRut(),
    fecha_nacimiento: optionalDate("Fecha de nacimiento"),
    sexo: selectField("Sexo", SEXO),
    nacionalidad: optionalText("Nacionalidad", 80).transform((value) => value || "Chilena"),
    estado_civil: selectField("Estado civil", CIVIL),
    direccion_anterior: optionalText("Domicilio previo", 300),
    prevision: optionalText("Previsión", 120),
    diagnostico_principal: optionalText("Diagnóstico principal", 500),
    alergias: z.string().optional().nullable().transform(splitCommaList),
    grupo_sanguineo: selectField("Grupo sanguíneo", SANGRE),
    nivel_dependencia: selectField("Nivel de dependencia", DEPENDENCIA),
    condicion_salud_grave: z.boolean().optional().default(false),
    condicion_salud_grave_detalle: optionalText("Detalle condición de salud grave", 500),
    fecha_ingreso: requiredDate("Fecha de ingreso"),
    estado: selectField("Estado", allowedStates, { required: true }),
    fecha_egreso: optionalDate("Fecha de egreso"),
    motivo_egreso: optionalText("Motivo de egreso", 300),
  }).superRefine((value, ctx) => {
    const birth = localNoon(value.fecha_nacimiento);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    if (birth && birth > today) {
      ctx.addIssue({ code: "custom", path: ["fecha_nacimiento"], message: "La fecha de nacimiento no puede ser futura." });
    }

    const ingreso = localNoon(value.fecha_ingreso);
    const egreso = localNoon(value.fecha_egreso);
    if (egreso && ingreso && egreso < ingreso) {
      ctx.addIssue({ code: "custom", path: ["fecha_egreso"], message: "La fecha de egreso no puede ser anterior al ingreso." });
    }
    if (egreso && egreso > today) {
      ctx.addIssue({ code: "custom", path: ["fecha_egreso"], message: "La fecha de egreso no puede ser futura." });
    }

    if (["egresado", "fallecido"].includes(value.estado)) {
      if (!value.fecha_egreso) {
        ctx.addIssue({ code: "custom", path: ["fecha_egreso"], message: "La fecha de egreso es obligatoria para este estado." });
      }
      if (!value.motivo_egreso) {
        ctx.addIssue({ code: "custom", path: ["motivo_egreso"], message: "Indica el motivo de egreso o fallecimiento." });
      }
    } else if (!isEditing && !ESTADOS_CREATE.includes(value.estado)) {
      ctx.addIssue({ code: "custom", path: ["estado"], message: "El alta solo permite residentes activos u hospitalizados." });
    }

    if (value.condicion_salud_grave && !value.condicion_salud_grave_detalle) {
      ctx.addIssue({ code: "custom", path: ["condicion_salud_grave_detalle"], message: "Describe la condición que requiere revisión técnica." });
    }
  });
}

export function validateResidentForm(form, options) {
  return parseWithSchema(residentSchema(options), form);
}

export function residentToForm(resident = {}) {
  return {
    ...RESIDENT_EMPTY,
    ...resident,
    rut: resident.rut ?? "",
    alergias: Array.isArray(resident.alergias) ? resident.alergias.join(", ") : "",
    fecha_nacimiento: resident.fecha_nacimiento ?? "",
    fecha_ingreso: resident.fecha_ingreso ?? RESIDENT_EMPTY.fecha_ingreso,
    fecha_egreso: resident.fecha_egreso ?? "",
    motivo_egreso: resident.motivo_egreso ?? "",
    sexo: resident.sexo ?? "",
    estado_civil: resident.estado_civil ?? "",
    grupo_sanguineo: resident.grupo_sanguineo ?? "",
    nivel_dependencia: resident.nivel_dependencia ?? "",
    condicion_salud_grave: resident.condicion_salud_grave === true,
    condicion_salud_grave_detalle: resident.condicion_salud_grave_detalle ?? "",
  };
}
