const SESSION_KEY = "fe_sid";

export const LANDING_CONTEXT_LIMITS = {
  utm: 128,
  page: 256,
  referrer: 512,
};

function cleanOptional(value, max) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : null;
}

function currentSearch() {
  return typeof window !== "undefined" ? window.location.search : "";
}

function currentPathname() {
  return typeof window !== "undefined" ? window.location.pathname : null;
}

function currentReferrer() {
  return typeof document !== "undefined" ? document.referrer : null;
}

function fallbackId() {
  return `fe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getLandingUtms(search = currentSearch()) {
  try {
    const params = new URLSearchParams(search ?? "");
    return {
      utm_source: cleanOptional(params.get("utm_source"), LANDING_CONTEXT_LIMITS.utm),
      utm_medium: cleanOptional(params.get("utm_medium"), LANDING_CONTEXT_LIMITS.utm),
      utm_campaign: cleanOptional(params.get("utm_campaign"), LANDING_CONTEXT_LIMITS.utm),
    };
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null };
  }
}

export function getLandingContext({
  search = currentSearch(),
  pathname = currentPathname(),
  referrer = currentReferrer(),
} = {}) {
  return {
    ...getLandingUtms(search),
    pagina_origen: cleanOptional(pathname, LANDING_CONTEXT_LIMITS.page),
    referrer: cleanOptional(referrer, LANDING_CONTEXT_LIMITS.referrer),
  };
}

export function getLandingSessionId({
  storage = typeof localStorage !== "undefined" ? localStorage : null,
  idFactory = () => globalThis.crypto?.randomUUID?.() ?? fallbackId(),
} = {}) {
  try {
    const existing = storage?.getItem?.(SESSION_KEY);
    if (existing) return existing;
    const next = idFactory();
    storage?.setItem?.(SESSION_KEY, next);
    return next;
  } catch {
    return idFactory();
  }
}
