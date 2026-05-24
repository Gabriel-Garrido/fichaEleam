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

export function requiredDate(label) {
  return z.string()
    .transform((value) => cleanText(value))
    .refine((value) => value.length > 0, `${label} es obligatoria.`)
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), `${label} debe tener formato válido.`);
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
