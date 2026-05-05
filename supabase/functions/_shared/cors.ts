// Reusable CORS helper for the FichaEleam Edge Functions.
// Allowed origins se configuran via env var ALLOWED_ORIGINS (coma-separadas).
// Si la variable no está definida, se usa "*" en desarrollo.

const RAW = Deno.env.get("ALLOWED_ORIGINS") ?? "*";
const ALLOWED: string[] = RAW.split(",").map((s) => s.trim()).filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  let allow = "*";
  if (RAW !== "*") {
    allow = ALLOWED.includes(origin) ? origin : ALLOWED[0] ?? "";
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  return null;
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
