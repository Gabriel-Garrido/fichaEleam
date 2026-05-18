// CORS + helpers de respuesta para las Edge Functions de FichaEleam.
//
// Origenes permitidos:
//   - ALLOWED_ORIGINS (env, coma-separadas) si esta definida.
//   - En caso contrario, solo el dominio de produccion.
//   - localhost se agrega solo cuando APP_ENV !== "production".
// Nunca se usa "*": un origen no permitido no recibe cabeceras CORS y el
// preflight responde 403.

const PRODUCTION_ORIGIN = "https://fichaeleam.cl";

const APP_ENV = (Deno.env.get("APP_ENV") ?? "production").trim().toLowerCase();
const IS_PRODUCTION = APP_ENV === "production";

const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
];

function buildAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS")?.trim();
  const configured = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : [PRODUCTION_ORIGIN];
  const origins = new Set(configured);
  if (!IS_PRODUCTION) {
    for (const dev of DEV_ORIGINS) origins.add(dev);
  }
  return [...origins];
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

function isAllowedOrigin(origin: string): boolean {
  return origin !== "" && ALLOWED_ORIGINS.includes(origin);
}

// Cabeceras CORS para un origen permitido. Si el origen no esta permitido no
// se devuelve ningun Access-Control-Allow-*, asi el navegador bloquea que
// otra web lea la respuesta.
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = { Vary: "Origin" };
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] =
      "authorization, x-client-info, apikey, content-type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

export function preflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  const origin = req.headers.get("origin") ?? "";
  if (!isAllowedOrigin(origin)) {
    // Origen no permitido: 403 sin cabeceras CORS permisivas.
    return new Response(null, { status: 403, headers: { Vary: "Origin" } });
  }
  return new Response("ok", { headers: corsHeaders(req) });
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

// Error interno: mensaje generico al cliente. El detalle real (la excepcion)
// debe quedar solo en los logs, vía console.error en quien la captura.
export function internalErrorResponse(req: Request): Response {
  return jsonResponse(req, { error: "Error interno. Intenta nuevamente." }, 500);
}
