// Validacion pura de eventos de landing, aislada de Deno para poder probarla.
// La usa track-landing-event/index.ts antes de insertar en landing_events.

export const ALLOWED_EVENT_TYPES = new Set([
  "page_view",
  "cta_click",
  "nav_click",
  "scroll_depth",
  "section_view",
  "form_view",
  "form_submit",
]);

// Longitudes maximas por campo. La Edge Function sanea antes de insertar y
// supabase_schema.sql replica estos límites con constraints de BD.
export const FIELD_MAX = {
  tipo: 64,
  pagina: 256,
  elemento: 128,
  valor: 256,
  session_id: 64,
  utm: 128,
  referrer: 512,
};

export function cleanField(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export interface LandingEventRow {
  tipo: string;
  pagina: string | null;
  elemento: string | null;
  valor: string | null;
  session_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
}

// Devuelve la fila lista para insertar, o null si el body no es objeto o el
// tipo no esta en la allowlist (la funcion lo ignora sin error).
export function normalizeLandingEvent(body: unknown): LandingEventRow | null {
  const obj = body && typeof body === "object"
    ? body as Record<string, unknown>
    : {};

  const tipo = cleanField(obj.tipo, FIELD_MAX.tipo);
  if (!tipo || !ALLOWED_EVENT_TYPES.has(tipo)) return null;

  return {
    tipo,
    pagina: cleanField(obj.pagina, FIELD_MAX.pagina),
    elemento: cleanField(obj.elemento, FIELD_MAX.elemento),
    valor: cleanField(obj.valor, FIELD_MAX.valor),
    session_id: cleanField(obj.session_id, FIELD_MAX.session_id),
    utm_source: cleanField(obj.utm_source, FIELD_MAX.utm),
    utm_medium: cleanField(obj.utm_medium, FIELD_MAX.utm),
    utm_campaign: cleanField(obj.utm_campaign, FIELD_MAX.utm),
    referrer: cleanField(obj.referrer, FIELD_MAX.referrer),
  };
}
