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

// ──────────────────────────────────────────────────────────────────
// Postgres / PostgREST error parsing → field-level errors
// ──────────────────────────────────────────────────────────────────
// Mapea errores de la BD a `{ field, message }` para que los formularios
// puedan resaltar el campo culpable en lugar de mostrar un toast genérico.
// Si no se puede identificar el campo (constraint genérico o cross-row),
// devuelve `{ field: null, message }` con mensaje contextual.

const PG_CODES = {
  NOT_NULL: "23502",
  CHECK: "23514",
  UNIQUE: "23505",
  FK: "23503",
  STRING_TOO_LONG: "22001",
  INVALID_INPUT: "22P02",
  RAISE_CUSTOM: "P0001",
};

function extractColumnFromConstraint(constraintName, knownFields) {
  if (!constraintName) return null;
  // 1) Match exacto (constraints custom mapeados externamente).
  if (knownFields?.has?.(constraintName)) return constraintName;

  // 2) Convención PG para constraints auto-nombradas: <table>_<col>_<suffix>
  // donde suffix ∈ {check, key, unique, fkey}. La complicación: tanto la
  // tabla como la columna pueden contener "_" (ej: "crm_prospects" tabla y
  // "max_residentes" columna). Probamos candidatos de columna del más
  // largo al más corto, prefiriendo el primero que matchea knownFields.
  const suffixMatch = constraintName.match(/^(.+)_(check|key|unique|fkey)$/);
  if (!suffixMatch) return null;
  const withoutSuffix = suffixMatch[1];
  const parts = withoutSuffix.split("_");

  if (knownFields && knownFields.size > 0) {
    // De más largo a más corto: si la columna es "max_residentes" y la
    // tabla "eleams", probamos "eleams_max_residentes" → "max_residentes"
    // → "residentes". Devolvemos el primero que matchea.
    for (let i = 1; i <= parts.length; i++) {
      const candidate = parts.slice(parts.length - i).join("_");
      if (knownFields.has(candidate)) return candidate;
    }
  }

  // Fallback sin knownFields: asumir que el último token es la columna.
  return parts[parts.length - 1] || null;
}

function extractColumnFromMessage(message) {
  // "null value in column \"col_name\" of relation"
  const colMatch = message.match(/column "([^"]+)"/i);
  if (colMatch) return colMatch[1];
  return null;
}

/**
 * Parsea un error de Supabase/Postgres y retorna { field, message, code }
 * cuando se puede identificar el campo culpable. `fieldMap` opcional
 * permite traducir constraint names custom a un nombre de campo del form
 * y un mensaje específico (más útil que el genérico).
 *
 * fieldMap shape: { [constraintNameOrColumn]: { field, message } }
 */
export function parsePostgresError(error, fieldMap = {}) {
  if (!error) return null;
  const code = String(error.code || "");
  const message = String(error.message || "");
  const lower = message.toLowerCase();

  // 0) Si el error tiene un fieldMap mapeo directo por constraint name.
  const constraintMatch = message.match(/constraint "([^"]+)"/i);
  if (constraintMatch && fieldMap[constraintMatch[1]]) {
    return { ...fieldMap[constraintMatch[1]], code };
  }

  // NOT NULL: extrae columna del mensaje, mensaje "Este campo es obligatorio".
  if (code === PG_CODES.NOT_NULL) {
    const col = extractColumnFromMessage(message);
    if (col && (!fieldMap || fieldMap[col])) {
      return fieldMap[col] ? { ...fieldMap[col], code } : { field: col, message: "Este campo es obligatorio.", code };
    }
    if (col) return { field: col, message: "Este campo es obligatorio.", code };
    return { field: null, message: "Falta completar un campo obligatorio.", code };
  }

  // UNIQUE: parsea index/constraint name → col.
  if (code === PG_CODES.UNIQUE || lower.includes("duplicate key") || lower.includes("already exists")) {
    if (constraintMatch) {
      const known = new Set(Object.keys(fieldMap));
      const col = extractColumnFromConstraint(constraintMatch[1], known);
      if (col) {
        const mapped = fieldMap[col] || fieldMap[constraintMatch[1]];
        if (mapped) return { ...mapped, code };
        return { field: col, message: "Ya existe un registro con ese valor.", code };
      }
    }
    return { field: null, message: "Ya existe un registro con esos datos.", code };
  }

  // CHECK constraint: parsea name → col.
  if (code === PG_CODES.CHECK) {
    if (constraintMatch) {
      const known = new Set(Object.keys(fieldMap));
      const col = extractColumnFromConstraint(constraintMatch[1], known);
      if (col) {
        const mapped = fieldMap[col];
        if (mapped) return { ...mapped, code };
        return { field: col, message: "Este campo no tiene el formato permitido.", code };
      }
      return { field: null, message: `El valor enviado no cumple la regla "${constraintMatch[1]}". Revisa los campos del formulario.`, code };
    }
    return { field: null, message: "Uno o más campos tienen un formato no permitido.", code };
  }

  // String demasiado largo.
  if (code === PG_CODES.STRING_TOO_LONG) {
    return { field: null, message: "Uno de los campos excede el largo máximo permitido.", code };
  }

  // Invalid input syntax (date/number malformado).
  if (code === PG_CODES.INVALID_INPUT) {
    const typeMatch = message.match(/type (\w+)/);
    const tipo = typeMatch?.[1];
    if (tipo === "integer" || tipo === "numeric") {
      return { field: null, message: "Un campo numérico tiene un valor inválido.", code };
    }
    if (tipo === "date" || tipo === "timestamp" || tipo === "timestamptz") {
      return { field: null, message: "Un campo de fecha tiene un formato inválido.", code };
    }
    if (tipo === "uuid") {
      return { field: null, message: "Un identificador tiene un formato inválido.", code };
    }
    return { field: null, message: "Formato inválido en algún campo.", code };
  }

  // Errores raise custom de RPC/trigger (P0001).
  // Heurística: si el mensaje empieza con "<columna> es obligatorio" o
  // contiene un nombre de columna conocido en fieldMap, lo asociamos al
  // campo. Si no, devolvemos el mensaje completo como general.
  if (code === PG_CODES.RAISE_CUSTOM) {
    const cleaned = message.trim();
    if (fieldMap) {
      for (const key of Object.keys(fieldMap)) {
        // Solo aceptar claves que son nombres de columnas, no constraints.
        if (!key.includes("_check") && !key.includes("_unique") && !key.includes("_key")) {
          // Matching word-boundary del nombre de columna en el mensaje.
          const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
          if (re.test(cleaned)) {
            const mapped = fieldMap[key];
            return { field: mapped.field, message: mapped.message || cleaned, code };
          }
        }
      }
    }
    return { field: null, message: cleaned || "No se pudo guardar el registro.", code };
  }

  return null;
}

/**
 * Aplica `parsePostgresError` y, si encuentra un field, lo setea en `errors`.
 * Si no encuentra field, setea `_form` con el mensaje general.
 * Devuelve `{ field, message }` para que el caller decida si scrollear.
 */
export function applyPostgresErrorToForm(error, setErrors, { fieldMap, fallback } = {}) {
  const parsed = parsePostgresError(error, fieldMap);
  const fallbackMessage = userFacingFormError(error, fallback || "No se pudo completar la acción.");
  if (parsed?.field) {
    setErrors((prev) => ({ ...prev, [parsed.field]: parsed.message }));
    return { field: parsed.field, message: parsed.message };
  }
  const generalMessage = parsed?.message || fallbackMessage;
  setErrors((prev) => ({ ...prev, _form: generalMessage }));
  return { field: null, message: generalMessage };
}
