const NETWORK_KEYWORDS    = ["network", "failed to fetch", "networkerror", "fetch"];
const AUTH_KEYWORDS       = ["jwt", "auth", "not authenticated", "unauthorized", "token"];
const LIMIT_KEYWORDS      = ["limit", "max", "exceeded", "quota"];
const PERM_KEYWORDS       = ["permission", "denied", "rls", "policy", "not allowed", "violates"];
const NOTFOUND_KEYWORDS   = ["not found", "does not exist", "no rows"];
const DUPLICATE_KEYWORDS  = ["duplicate", "unique", "already exists", "conflict"];
const RATE_LIMIT_KEYWORDS = ["rate limit", "too many requests", "over_email_send_rate", "429"];
const ERROR_CODE_CONTEXT = {
  "23505": "duplicate",
  "42501": "perm",
  "PGRST116": "notfound",
  "429": "rate_limit",
};

const CONTEXT_MESSAGES = {
  network:    "No pudimos conectarnos al servidor. Revisa tu conexión y vuelve a intentarlo.",
  auth:       "Tu sesión expiró o no tienes acceso. Recarga la página o vuelve a iniciar sesión.",
  limit:      "Tu plan ha alcanzado su límite. Contacta al administrador para ampliarlo.",
  perm:       "No tienes permisos para realizar esta acción. Si crees que es un error, contacta al administrador.",
  notfound:   "El elemento que buscas no existe o fue eliminado.",
  duplicate:  "Ya existe un registro con esos datos. Verifica la información e intenta de nuevo.",
  rate_limit: "Has intentado demasiadas veces. Espera unos minutos antes de reintentar.",
};

function matchesAny(message, keywords) {
  const m = message.toLowerCase();
  return keywords.some((k) => m.includes(k));
}

/**
 * Converts a raw error into a user-facing message with an actionable suggestion.
 * Never exposes stack traces, DB codes, or internal identifiers.
 *
 * @param {unknown} error - The caught error (any shape)
 * @param {string}  [fallback] - Domain-specific fallback (e.g. "No se pudo guardar el documento")
 * @returns {string}
 */
export function friendlyError(error, fallback = "Ocurrió un problema inesperado. Intenta de nuevo.") {
  const code = String(error?.code ?? error?.status ?? error?.statusCode ?? "").toUpperCase();
  const contextFromCode = ERROR_CODE_CONTEXT[code];
  if (contextFromCode) return CONTEXT_MESSAGES[contextFromCode];

  const raw = (
    error?.message ||
    error?.error?.message ||
    (typeof error === "string" ? error : "")
  ).toLowerCase();

  if (!raw) return fallback;

  if (matchesAny(raw, NETWORK_KEYWORDS))    return CONTEXT_MESSAGES.network;
  if (matchesAny(raw, RATE_LIMIT_KEYWORDS)) return CONTEXT_MESSAGES.rate_limit;
  if (matchesAny(raw, AUTH_KEYWORDS))       return CONTEXT_MESSAGES.auth;
  if (matchesAny(raw, LIMIT_KEYWORDS))      return CONTEXT_MESSAGES.limit;
  if (matchesAny(raw, PERM_KEYWORDS))       return CONTEXT_MESSAGES.perm;
  if (matchesAny(raw, NOTFOUND_KEYWORDS))   return CONTEXT_MESSAGES.notfound;
  if (matchesAny(raw, DUPLICATE_KEYWORDS))  return CONTEXT_MESSAGES.duplicate;

  return fallback;
}
