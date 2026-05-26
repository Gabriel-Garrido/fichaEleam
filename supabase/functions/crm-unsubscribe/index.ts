// GET/POST /functions/v1/crm-unsubscribe?token=<uuid>
//
// Endpoint público (sin auth) para que un prospecto pueda darse de baja
// haciendo click en el link del correo. Acepta el token por query string
// o por body JSON. Devuelve HTML server-side renderizado (no JSON) con
// estilos inline para máxima compatibilidad cross-browser.
//
// Seguridad:
//  - Token es uuid v4 (122 bits entropy) → no enumerable.
//  - La RPC `crm_unsubscribe_by_token` es security definer y verifica el
//    token. Si no coincide, devuelve `token_invalido` y la página muestra
//    un mensaje genérico (sin revelar si existe o no).
//  - El endpoint no permite revertir la baja: una vez efectuada, queda.
//
// CORS: se devuelve HTML con headers permisivos; no expone JSON ni
// metadatos sensibles.

import { adminClient } from "../_shared/supabase.ts";
import { buildCrmUnsubscribePage } from "../_shared/email.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

async function extractToken(req: Request): Promise<string | null> {
  try {
    const url = new URL(req.url);
    const fromQuery = url.searchParams.get("token");
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();
  } catch { /* ignore */ }

  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => null) as { token?: string } | null;
      if (body?.token && typeof body.token === "string") return body.token.trim();
    } catch { /* ignore */ }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return htmlResponse(buildCrmUnsubscribePage("token_invalido"), 405);
  }

  const token = await extractToken(req);
  if (!token || !UUID_RE.test(token)) {
    return htmlResponse(buildCrmUnsubscribePage("token_invalido"), 400);
  }

  try {
    const sb = adminClient();
    const { data, error } = await sb.rpc("crm_unsubscribe_by_token", { p_token: token });
    if (error) {
      console.error("crm-unsubscribe rpc error", error);
      return htmlResponse(buildCrmUnsubscribePage("token_invalido"), 500);
    }

    // La RPC devuelve { ok, reason, email? }
    const reason = (data?.reason as string) ?? "token_invalido";
    const email = (data?.email as string | undefined) ?? null;
    return htmlResponse(buildCrmUnsubscribePage(reason, email));
  } catch (err) {
    console.error("crm-unsubscribe unexpected", err);
    return htmlResponse(buildCrmUnsubscribePage("token_invalido"), 500);
  }
});
