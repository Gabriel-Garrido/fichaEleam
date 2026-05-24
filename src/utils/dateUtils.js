// Devuelve la fecha actual local en formato ISO (YYYY-MM-DD).
// Es la fuente canónica para todos los selectores de fecha de la app.
export function todayIso(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Para strings de solo fecha (YYYY-MM-DD): usa T12:00:00 para evitar el
// desfase de zona horaria que convertiría "2025-01-15" en 14 ene en UTC-3.
export function formatDateOnly(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return "—"; }
}

export function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return "—"; }
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

// Diferencia relativa en español a partir de un ISO date (YYYY-MM-DD).
// Devuelve "hoy", "ayer", "hace N días", "hace N meses" o "hace N años".
export function formatRelativeDays(isoDate) {
  if (!isoDate) return null;
  const [y, m, d] = String(isoDate).split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  const diff = Math.floor((today - target) / 86_400_000);
  if (diff <= 0) return "hoy";
  if (diff === 1) return "ayer";
  if (diff < 30) return `hace ${diff} días`;
  const months = Math.round(diff / 30);
  if (months === 1) return "hace 1 mes";
  if (months < 12) return `hace ${months} meses`;
  const years = Math.round(diff / 365);
  return years === 1 ? "hace 1 año" : `hace ${years} años`;
}
