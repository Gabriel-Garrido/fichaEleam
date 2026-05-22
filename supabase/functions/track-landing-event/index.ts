// POST /functions/v1/track-landing-event
//
// Registra eventos anonimos de la landing en public.landing_events.
// Reemplaza el insert directo del cliente: anon ya no escribe la tabla.
// La validacion de tipo y longitudes vive en eventValidation.ts (testeable);
// aqui se aplica el rate limit por session_id y se inserta con service role.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { normalizeLandingEvent } from "./eventValidation.ts";

// Rate limit basico: máximo de eventos por session_id en la ventana.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 40;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return jsonResponse(req, { ok: false, error: "Método no permitido" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const event = normalizeLandingEvent(body);
    if (!event) {
      // Tipo desconocido o ausente: se ignora sin error para no afectar la landing.
      return jsonResponse(req, { ok: false, ignored: true });
    }

    const sb = adminClient();

    // Rate limit por sesion: si supero el limite en la ventana, se descarta.
    if (event.session_id) {
      const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
      const { count } = await sb
        .from("landing_events")
        .select("id", { head: true, count: "exact" })
        .eq("session_id", event.session_id)
        .gt("creado_en", since);
      if ((count ?? 0) >= RATE_MAX) {
        return jsonResponse(req, { ok: false, rate_limited: true });
      }
    }

    const { error } = await sb.from("landing_events").insert(event);
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
