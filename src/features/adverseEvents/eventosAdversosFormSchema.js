import { z } from "zod";
import {
  optionalDate,
  optionalText,
  parseWithSchema,
  requiredDate,
  requiredText,
  selectField,
} from "../../utils/formValidation";
import {
  ACCION_TIPOS,
  CATEGORIAS,
  ESTADOS,
  MEDIOS_NOTIFICACION_FAMILIA,
  SEVERIDADES,
  TURNOS,
} from "./eventosAdversosUtils";

function optionalTime() {
  return z.string()
    .optional()
    .nullable()
    .transform((v) => (typeof v === "string" ? v.trim() : v))
    .transform((v) => (v ? v : null))
    .refine((v) => {
      if (!v) return true;
      const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(v);
      if (!m) return false;
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      const ss = m[3] ? Number(m[3]) : 0;
      return hh >= 0 && hh < 24 && mm >= 0 && mm < 60 && ss >= 0 && ss < 60;
    }, "Hora inválida (HH:MM, 00:00–23:59).");
}

export const ADVERSE_EVENT_EMPTY = {
  residente_id: "",
  observacion_id: "",
  fecha_evento: new Date().toISOString().slice(0, 10),
  hora_evento: "",
  turno: "",
  lugar: "",
  categoria: "",
  severidad: "leve",
  descripcion: "",
  causas_probables: "",
  acciones_inmediatas: "",
  testigos: "",
  estado: "registrado",
  requiere_seguimiento: true,
  fecha_compromiso_cierre: "",
  notificado_familia: false,
  fecha_notificacion_familia: "",
  medio_notificacion_familia: "",
  visible_familiar: false,
  resumen_familiar: "",
};

export function adverseEventSchema() {
  return z.object({
    residente_id: z.string().trim().optional().nullable().transform((v) => v && v.length > 0 ? v : null),
    observacion_id: z.string().trim().optional().nullable().transform((v) => v && v.length > 0 ? v : null),
    fecha_evento: requiredDate("Fecha del evento"),
    hora_evento: optionalTime(),
    turno: selectField("Turno", TURNOS),
    lugar: optionalText("Lugar", 200),
    categoria: selectField("Categoría", CATEGORIAS, { required: true }),
    severidad: selectField("Severidad", SEVERIDADES, { required: true }),
    descripcion: requiredText("Descripción", 4000)
      .refine((v) => v.length >= 10, "La descripción debe tener al menos 10 caracteres."),
    causas_probables: optionalText("Causas probables", 2000),
    acciones_inmediatas: optionalText("Acciones inmediatas", 2000),
    testigos: optionalText("Testigos", 500),
    estado: selectField("Estado", ESTADOS, { required: true }),
    requiere_seguimiento: z.boolean().default(true),
    fecha_compromiso_cierre: optionalDate("Fecha de compromiso de cierre"),
    notificado_familia: z.boolean().default(false),
    fecha_notificacion_familia: z.string().optional().nullable().transform((v) => v && v.trim() ? v.trim() : null),
    medio_notificacion_familia: selectField("Medio de notificación a familia", MEDIOS_NOTIFICACION_FAMILIA),
    visible_familiar: z.boolean().default(false),
    resumen_familiar: optionalText("Resumen para familia", 500),
  }).superRefine((value, ctx) => {
    if (value.visible_familiar && !value.resumen_familiar) {
      ctx.addIssue({
        code: "custom",
        path: ["resumen_familiar"],
        message: "Si vas a mostrar el evento al familiar, escribe un resumen seguro para ellos.",
      });
    }
    if (value.notificado_familia && !value.medio_notificacion_familia) {
      ctx.addIssue({
        code: "custom",
        path: ["medio_notificacion_familia"],
        message: "Indica por qué medio se contactó a la familia.",
      });
    }
  });
}

export function validateAdverseEventForm(data) {
  return parseWithSchema(adverseEventSchema(), data);
}

export const ADVERSE_EVENT_ACTION_EMPTY = {
  tipo: "nota",
  descripcion: "",
};

export function adverseEventActionSchema() {
  return z.object({
    tipo: selectField("Tipo de acción", ACCION_TIPOS, { required: true }),
    descripcion: requiredText("Descripción", 2000),
  });
}

export function validateAdverseEventActionForm(data) {
  return parseWithSchema(adverseEventActionSchema(), data);
}

export const ADVERSE_EVENT_CLOSE_EMPTY = {
  conclusiones: "",
};

export function adverseEventCloseSchema() {
  return z.object({
    conclusiones: requiredText("Conclusiones", 2000)
      .refine((v) => v.length >= 10, "Las conclusiones deben tener al menos 10 caracteres."),
  });
}

export function validateAdverseEventCloseForm(data) {
  return parseWithSchema(adverseEventCloseSchema(), data);
}
