export const PASSWORD_MAX_LENGTH = 128;

export function getPasswordStrength(password) {
  const pw = String(password ?? "");
  if (!pw) return null;
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const long = pw.length >= 8;
  const veryLong = pw.length >= 12;
  const score = [hasUpper, hasNum, long, veryLong].filter(Boolean).length;
  if (score <= 1) return { txt: "Débil", cls: "bg-rose-500", bar: "w-1/4" };
  if (score === 2) return { txt: "Regular", cls: "bg-amber-400", bar: "w-2/4" };
  if (score === 3) return { txt: "Buena", cls: "bg-sky-500", bar: "w-3/4" };
  return { txt: "Muy fuerte", cls: "bg-emerald-500", bar: "w-full" };
}

export function validatePassword(password, confirm) {
  const pw = String(password ?? "");
  const confirmation = String(confirm ?? "");
  if (pw.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (pw.length > PASSWORD_MAX_LENGTH) return `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`;
  if (!/[A-Z]/.test(pw)) return "La contraseña debe incluir al menos una letra mayúscula.";
  if (!/[0-9]/.test(pw)) return "La contraseña debe incluir al menos un número.";
  if (pw !== confirmation) return "Las contraseñas no coinciden.";
  return null;
}
