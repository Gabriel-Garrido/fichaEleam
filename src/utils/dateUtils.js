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
