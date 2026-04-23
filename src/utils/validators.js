export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Valida RUT chileno (con o sin puntos y guión).
 * Retorna true si es válido o si está vacío (campo opcional).
 */
export const validateRut = (rut) => {
  if (!rut) return true;
  const clean = rut.replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const expected = 11 - (sum % 11);
  const dvExpected =
    expected === 11 ? "0" : expected === 10 ? "K" : String(expected);
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
  const dv = clean.slice(-1);
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
};
