import { z } from "zod";
import {
  cleanText,
  nullIfBlank,
  optionalDate,
  optionalNumber,
  optionalText,
  parseWithSchema,
  requiredText,
} from "../../utils/formValidation";
import {
  normalizePhone,
  normalizeUrl,
  validateEmail,
  validatePhone,
  validateUrl,
} from "../../utils/validators";
import {
  CAMPAIGN_VARIABLES,
  CHANNEL_OPTIONS,
  CRM_FUNNEL_STAGES,
  DEFAULT_CALL_SCRIPT,
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_RRSS_TEMPLATE,
  DIGITALIZATION_OPTIONS,
  ORIGIN_OPTIONS,
  URGENCY_OPTIONS,
  findUnknownTemplateVariables,
  getTemplateVariableNames,
} from "./crm/crmSalesPlaybook";

// ─── Campos opcionales reusables ─────────────────────────────────

function isNotFound(value) {
  return cleanText(value).toLowerCase() === "no encontrado";
}

function optionalTextOrNotFound(label, max) {
  return optionalText(label, max).transform((value) => (isNotFound(value) ? null : value));
}

function optionalEmail(label = "Correo electrónico") {
  return z.string()
    .optional()
    .nullable()
    .transform((value) => {
      if (isNotFound(value)) return null;
      const text = cleanText(value, 254).toLowerCase();
      return text || null;
    })
    .refine((value) => !value || validateEmail(value), `${label} no tiene un formato válido.`);
}

function optionalPhone(label = "Teléfono") {
  return z.string()
    .optional()
    .nullable()
    .transform((value) => {
      if (isNotFound(value)) return null;
      const text = normalizePhone(value).slice(0, 30);
      return text || null;
    })
    .refine((value) => !value || validatePhone(value), `${label} debe ser un número válido.`);
}

function optionalUrl(label) {
  return z.string()
    .optional()
    .nullable()
    .transform((value) => {
      if (isNotFound(value)) return null;
      const text = cleanText(value, 500);
      return text ? normalizeUrl(text) : null;
    })
    .refine((value) => !value || validateUrl(value), `${label} no tiene un formato válido.`);
}

// ─── Schemas ──────────────────────────────────────────────────────

export const PROSPECT_ESTADOS = [
  ...CRM_FUNNEL_STAGES,
];

const DIGITALIZATION_VALUES = DIGITALIZATION_OPTIONS.map(([value]) => value);
const ORIGIN_VALUES = ORIGIN_OPTIONS.map(([value]) => value);
const CHANNEL_VALUES = CHANNEL_OPTIONS.map(([value]) => value);
const URGENCY_VALUES = URGENCY_OPTIONS.map(([value]) => value);

function optionalEnum(label, allowed, fallback) {
  return z.string()
    .optional()
    .nullable()
    .transform((value) => cleanText(value) || fallback)
    .refine((value) => allowed.includes(value), `${label} no es válido.`);
}

function templateText(label, max) {
  return optionalText(label, max).superRefine((value, ctx) => {
    const unknown = findUnknownTemplateVariables(value);
    if (unknown.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: `${label} usa variables no permitidas: ${unknown.map((v) => `{{${v}}}`).join(", ")}.`,
      });
    }
  });
}

function requiredTemplateText(label, max) {
  return requiredText(label, max).superRefine((value, ctx) => {
    const unknown = findUnknownTemplateVariables(value);
    if (unknown.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: `${label} usa variables no permitidas: ${unknown.map((v) => `{{${v}}}`).join(", ")}.`,
      });
    }
  });
}

export function prospectSchema() {
  return z.object({
    list_id: z.string()
      .optional()
      .nullable()
      .transform((value) => nullIfBlank(value)),
    eleam_nombre: requiredText("Nombre del ELEAM", 200),
    comuna: optionalTextOrNotFound("Comuna", 100),
    telefono: optionalPhone(),
    email: optionalEmail(),
    facebook_url: optionalUrl("Facebook"),
    instagram_url: optionalUrl("Instagram"),
    tiktok_url: optionalUrl("TikTok"),
    origen: optionalEnum("Origen", ORIGIN_VALUES, "outbound"),
    canal_preferido: optionalEnum("Canal preferido", CHANNEL_VALUES, "desconocido"),
    cargo_contacto: optionalTextOrNotFound("Cargo contacto", 120),
    decision_maker_nombre: optionalTextOrNotFound("Decisor", 160),
    decision_maker_cargo: optionalTextOrNotFound("Cargo decisor", 120),
    num_residentes: optionalNumber("Residentes", { min: 1, max: 10000, integer: true }),
    digitalizacion_estado: optionalEnum("Estado digital", DIGITALIZATION_VALUES, "desconocido"),
    software_actual: optionalTextOrNotFound("Software actual", 160),
    dolor_principal: optionalTextOrNotFound("Dolor principal", 500),
    urgencia: optionalEnum("Urgencia", URGENCY_VALUES, "desconocida"),
    fit_score: optionalNumber("Fit score", { min: 0, max: 100, integer: true })
      .transform((value) => value ?? 50),
    valor_estimado_clp: optionalNumber("Valor estimado", { min: 0, integer: true }),
    probabilidad_cierre: optionalNumber("Probabilidad de cierre", { min: 0, max: 100, integer: true })
      .transform((value) => value ?? 10),
    proxima_accion_fecha: optionalDate("Próxima acción"),
    motivo_perdida: optionalTextOrNotFound("Motivo de pérdida", 500),
    competidor: optionalTextOrNotFound("Competidor", 160),
    estado: z.enum(PROSPECT_ESTADOS).optional().default("nuevo"),
    notas: optionalTextOrNotFound("Notas", 3000),
  }).superRefine((value, ctx) => {
    if (value.estado === "perdido" && !value.motivo_perdida) {
      ctx.addIssue({
        code: "custom",
        path: ["motivo_perdida"],
        message: "Registra el motivo de pérdida para aprender del cierre.",
      });
    }
  });
}

export function validateProspectForm(data) {
  return parseWithSchema(prospectSchema(), data);
}

export const PROSPECT_FORM_EMPTY = {
  list_id: "",
  eleam_nombre: "",
  comuna: "",
  telefono: "",
  email: "",
  facebook_url: "",
  instagram_url: "",
  tiktok_url: "",
  origen: "outbound",
  canal_preferido: "desconocido",
  cargo_contacto: "",
  decision_maker_nombre: "",
  decision_maker_cargo: "",
  num_residentes: "",
  digitalizacion_estado: "desconocido",
  software_actual: "",
  dolor_principal: "",
  urgencia: "desconocida",
  fit_score: 50,
  valor_estimado_clp: "",
  probabilidad_cierre: 10,
  proxima_accion_fecha: "",
  motivo_perdida: "",
  competidor: "",
  estado: "nuevo",
  notas: "",
};

export const PROSPECT_LIST_EMPTY = {
  nombre: "",
  descripcion: "",
};

export function prospectListSchema() {
  return z.object({
    nombre: requiredText("Nombre de la lista", 120),
    descripcion: optionalText("Descripción", 500),
  });
}

export function validateProspectListForm(data) {
  return parseWithSchema(prospectListSchema(), data);
}

export const CAMPAIGN_FORM_EMPTY = {
  nombre: "",
  objetivo: "",
  audiencia_notas: "",
  asunto_default: "",
  cuerpo_default: DEFAULT_EMAIL_TEMPLATE,
  mensaje_rrss_template: DEFAULT_RRSS_TEMPLATE,
  script_llamada_template: DEFAULT_CALL_SCRIPT,
  from_email: "",
  from_name: "",
  reply_to_email: "",
};

export function campaignSchema() {
  return z.object({
    nombre: requiredText("Nombre de la campaña", 160),
    objetivo: optionalText("Objetivo", 1000),
    audiencia_notas: optionalText("Audiencia", 1000),
    asunto_default: requiredTemplateText("Asunto por defecto", 200),
    cuerpo_default: templateText("Cuerpo del correo", 8000),
    mensaje_rrss_template: templateText("Mensaje RRSS", 4000),
    script_llamada_template: templateText("Script de llamada", 8000),
    from_email: optionalEmail("From"),
    from_name: optionalText("Nombre del remitente", 120),
    reply_to_email: optionalEmail("Reply-To"),
  }).transform((value) => ({
    ...value,
    variables_usadas: Array.from(new Set([
      ...getTemplateVariableNames(value.asunto_default),
      ...getTemplateVariableNames(value.cuerpo_default),
      ...getTemplateVariableNames(value.mensaje_rrss_template),
      ...getTemplateVariableNames(value.script_llamada_template),
    ].filter((name) => CAMPAIGN_VARIABLES.includes(name)))),
  }));
}

export function validateCampaignForm(data) {
  return parseWithSchema(campaignSchema(), data);
}
