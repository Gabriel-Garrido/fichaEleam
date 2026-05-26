// Regex más estricto: dominio con TLD de al menos 2 caracteres
export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email?.trim() ?? "");

// Formato UUID RFC 4122 / compatible con PostgreSQL uuid
export const isValidUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str ?? "");

/**
 * Valida RUT chileno con algoritmo módulo-11.
 * Acepta: 12345678-9, 12.345.678-9, sin formato.
 * Retorna true si está vacío (campo opcional).
 */
export const validateRut = (rut) => {
  if (!rut) return true;
  const clean = rut.replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1);
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const expected   = 11 - (sum % 11);
  const dvExpected = expected === 11 ? "0" : expected === 10 ? "K" : String(expected);
  return dv === dvExpected;
};

/**
 * Formatea un RUT al estilo XX.XXX.XXX-X.
 */
export const formatRut = (rut) => {
  if (!rut) return "";
  const clean = rut.replace(/[.\-\s]/g, "").toUpperCase();
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1);
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
};

/**
 * Valida número de teléfono chileno.
 * Retorna true si está vacío (campo opcional).
 */
export const validatePhone = (phone) => {
  if (!phone) return true;
  const clean = phone.replace(/[\s\-().+]/g, "");
  return /^(56)?9\d{8}$/.test(clean) || /^\d{9,12}$/.test(clean);
};

export const normalizeWhitespace = (value) =>
  String(value ?? "").trim().replace(/\s+/g, " ");

export const normalizePhone = (phone) =>
  normalizeWhitespace(phone).replace(/[()]/g, "");

/**
 * Normaliza una URL agregando https:// si falta el protocolo.
 * Retorna null si está vacío.
 */
export const normalizeUrl = (url) => {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/**
 * Valida una URL aceptando "ejemplo.cl" (sin protocolo). Retorna true si
 * está vacío (campo opcional).
 */
export const validateUrl = (url) => {
  if (!url) return true;
  const normalized = normalizeUrl(url);
  if (!normalized) return true;
  try {
    const parsed = new URL(normalized);
    // Requiere host con punto (ej: "ejemplo.cl"), no localhost ni IPs.
    return /[^.]+\.[^.]+/.test(parsed.host);
  } catch {
    return false;
  }
};
