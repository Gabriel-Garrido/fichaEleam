// Regex más estricto: dominio con TLD de al menos 2 caracteres
export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email?.trim() ?? "");

// Formato UUID v4
export const isValidUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str ?? "");

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
