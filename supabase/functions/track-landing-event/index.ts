// POST /functions/v1/track-landing-event
//
// Registra eventos anonimos de la landing en public.landing_events.
// Reemplaza el insert directo del cliente: anon ya no escribe la tabla.
// La funcion valida el tipo contra una allowlist, recorta longitudes,
// aplica un rate limit basico por session_id e inserta con service role.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const ALLOWED_TYPES = new Set([
  "cta_click",
  "nav_click",
  "scroll_depth",
  "section_view",
  "form_view",
  "form_submit",
]);

// Longitudes maximas por campo (defensa: la tabla es text sin limite).
const MAX = {
  tipo: 64,
  pagina: 256,
  elemento: 128,
  valor: 256,
  session_id: 64,
  utm: 128,
  referrer: 512,
};

// Rate limit basico: maximo de eventos por session_id en la ventana.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 40;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return jsonResponse(req, { ok: false, error: "Método no permitido" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));

    const tipo = clean(body.tipo, MAX.tipo);
    if (!tipo || !ALLOWED_TYPES.has(tipo)) {
      // Tipo desconocido: se ignora sin error para no afectar la landing.
      return jsonResponse(req, { ok: false, ignored: true });
    }

    const sessionId = clean(body.session_id, MAX.session_id);
    const sb = adminClient();

    // Rate limit por sesion: si supero el limite en la ventana, se descarta.
    if (sessionId) {
      const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
      const { count } = await sb
        .from("landing_events")
        .select("id", { head: true, count: "exact" })
        .eq("session_id", sessionId)
        .gt("creado_en", since);
      if ((count ?? 0) >= RATE_MAX) {
        return jsonResponse(req, { ok: false, rate_limited: true });
      }
    }

    const { error } = await sb.from("landing_events").insert({
      tipo,
      pagina: clean(body.pagina, MAX.pagina),
      elemento: clean(body.elemento, MAX.elemento),
      valor: clean(body.valor, MAX.valor),
      session_id: sessionId,
      utm_source: clean(body.utm_source, MAX.utm),
      utm_medium: clean(body.utm_medium, MAX.utm),
      utm_campaign: clean(body.utm_campaign, MAX.utm),
      referrer: clean(body.referrer, MAX.referrer),
    });

    if (error) {
      console.error("track-landing-event insert", error);
      return jsonResponse(req, { ok: false }, 500);
    }

    return jsonResponse(req, { ok: true });
  } catch (e) {
    console.error("track-landing-event", e);
    return jsonResponse(req, { ok: false }, 500);
  }
});
