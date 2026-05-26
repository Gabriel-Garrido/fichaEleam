import { z } from "zod";
import {
  formatRut,
  normalizePhone,
  normalizeWhitespace,
  validateEmail,
  validatePhone,
  validateRut,
} from "./validators";

export { z };

export const EMPTY_TO_NULL = Symbol("EMPTY_TO_NULL");

export function cleanText(value, max = null) {
  const text = normalizeWhitespace(value);
  return max ? text.slice(0, max) : text;
}

export function nullIfBlank(value, max = null) {
  const text = cleanText(value, max);
  return text || null;
}

export function splitCommaList(value) {
  return cleanText(value)
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function requiredText(label, max = null) {
  let schema = z.string().transform((value) => cleanText(value));
  schema = schema.refine((value) => value.length > 0, `${label} es obligatorio.`);
  if (max) schema = schema.refine((value) => value.length <= max, `${label} no puede superar ${max} caracteres.`);
  return schema;
}

export function optionalText(label, max = null) {
  let schema = z.string().optional().nullable().transform((value) => nullIfBlank(value));
  if (max) schema = schema.refine((value) => !value || value.length <= max, `${label} no puede superar ${max} caracteres.`);
  return schema;
}

export function emailField(label = "Correo electrónico") {
  return z.string()
    .transform((value) => cleanText(value, 254).toLowerCase())
    .refine((value) => value.length > 0, `${label} es obligatorio.`)
    .refine((value) => validateEmail(value), `${label} no tiene un formato válido.`);
}

export function phoneField(label = "Teléfono") {
  return z.string()
    .transform((value) => normalizePhone(value))
    .refine((value) => value.length > 0, `${label} es obligatorio.`)
    .refine((value) => value.length <= 40, `${label} no puede superar 40 caracteres.`)
    .refine((value) => validatePhone(value), `${label} debe ser un número chileno válido.`);
}

export function optionalRut() {
  return z.string()
    .optional()
    .nullable()
    .transform((value) => cleanText(value))
    .refine((value) => !value || validateRut(value), "RUT inválido. Revisa el dígito verificador.")
    .transform((value) => (value ? formatRut(value) : null));
}

export function optionalDate(label) {
  return z.string()
    .optional()
    .nullable()
    .transform((value) => cleanText(value) || null)
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), `${label} debe tener formato válido.`);
}

export function optionalDateTime(label) {
  return z.string()
    .optional()
    .nullable()
    .transform((value) => cleanText(value) || null)
    .refine(
      (value) => !value || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value),
      `${label} debe tener fecha y hora válidas.`
    );
}

export function requiredDate(label) {
  return z.string()
    .transform((value) => cleanText(value))
    .refine((value) => value.length > 0, `${label} es obligatoria.`)
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), `${label} debe tener formato válido.`);
}

export function requiredDateTime(label) {
  return z.string()
    .transform((value) => cleanText(value))
    .refine((value) => value.length > 0, `${label} es obligatoria.`)
    .refine((value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value), `${label} debe tener fecha y hora válidas.`);
}

export function selectField(label, allowed, { required = false } = {}) {
  return z.string()
    .optional()
    .nullable()
    .transform((value) => cleanText(value))
    .refine((value) => !required || value.length > 0, `${label} es obligatorio.`)
    .refine((value) => !value || allowed.includes(value), `${label} no es válido.`)
    .transform((value) => value || null);
}

export function optionalNumber(label, { min = null, max = null, integer = false } = {}) {
  return z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined || value === "") return null;
      if (typeof value === "string" && cleanText(value) === "") return null;
      return Number(value);
    })
    .refine((value) => value === null || Number.isFinite(value), `${label} debe ser un número válido.`)
    .refine((value) => value === null || !integer || Number.isInteger(value), `${label} debe ser un número entero.`)
    .refine((value) => value === null || min === null || value >= min, `${label} debe ser mayor o igual a ${min}.`)
    .refine((value) => value === null || max === null || value <= max, `${label} debe ser menor o igual a ${max}.`);
}

export function requiredNumber(label, { min = null, max = null, integer = false } = {}) {
  return optionalNumber(label, { min, max, integer })
    .refine((value) => value !== null, `${label} es obligatorio.`);
}

export function zodToFieldErrors(error) {
  if (!error) return {};
  const issues = error.issues ?? error.errors ?? [];
  return issues.reduce((acc, issue) => {
    const key = issue.path?.join(".");
    if (key && !acc[key]) acc[key] = issue.message;
    return acc;
  }, {});
}

export function parseWithSchema(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data, errors: {} };
  return { ok: false, data: null, errors: zodToFieldErrors(result.error) };
}

export function setFieldErrorCleared(setErrors, field) {
  setErrors((prev) => {
    if (!prev[field]) return prev;
    const next = { ...prev };
    delete next[field];
    return next;
  });
}

export function scrollToFirstError(errors = {}) {
  const first = Object.keys(errors).find(Boolean);
  if (!first || typeof document === "undefined") return;
  const id = first.replace(/\./g, "_");
  const element = document.getElementById(id) || document.querySelector(`[name="${first}"]`);
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (typeof element?.focus === "function") {
    window.setTimeout(() => element.focus({ preventScroll: true }), 220);
  }
}

export function userFacingFormError(error, fallback = "No se pudo completar la acción. Revisa los datos e intenta nuevamente.") {
  const message = String(error?.message || "").trim();
  if (!message) return fallback;

  const lower = message.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("fetch")) {
    return "No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.";
  }
  if (lower.includes("duplicate key") || lower.includes("unique constraint") || lower.includes("already exists")) {
    return "Ya existe un registro con esos datos. Revisa campos únicos como RUT, correo o código.";
  }
  if (lower.includes("violates check constraint") || lower.includes("invalid input syntax")) {
    return "Uno o más campos tienen un formato no permitido. Revisa los campos marcados e intenta nuevamente.";
  }
  if (lower.includes("not authorized") || lower.includes("no autorizado") || lower.includes("permission denied")) {
    return "Tu cuenta no tiene permisos para completar esta acción.";
  }
  if (message.length > 180 || /^[A-Z0-9_]+:/.test(message)) return fallback;
  return message;
}
