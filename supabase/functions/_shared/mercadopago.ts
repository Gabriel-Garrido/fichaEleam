// Wrapper minimalista del REST de MercadoPago para suscripciones (preapproval).
// Usa fetch nativo de Deno — no depende del SDK Node de MP.
//
// Requisitos de entorno:
//   MP_ACCESS_TOKEN   (Bearer token, secreto)
//   MP_WEBHOOK_SECRET (secreto compartido para validar x-signature)
//
// Documentación oficial:
//   https://www.mercadopago.cl/developers/es/reference/subscriptions/_preapproval/post
//   https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/payment-notifications

const MP_API = "https://api.mercadopago.com";

function compactText(value: string, max = 1000): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
}

function tryParseJson(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function stringifyCause(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return String(item ?? "");
        const row = item as Record<string, unknown>;
        return String(row.description ?? row.message ?? row.code ?? "");
      })
      .filter(Boolean)
      .join(" ");
  }
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return String(row.description ?? row.message ?? row.code ?? "");
  }
  return String(value ?? "");
}

export class MercadoPagoApiError extends Error {
  status: number;
  responseText: string;
  responseJson: Record<string, unknown> | null;
  operation: string;

  constructor(operation: string, status: number, responseText: string) {
    const compact = compactText(responseText);
    super(`MP ${operation} ${status}${compact ? `: ${compact}` : ""}`);
    this.name = "MercadoPagoApiError";
    this.operation = operation;
    this.status = status;
    this.responseText = compact;
    this.responseJson = tryParseJson(responseText);
  }
}

export function publicMercadoPagoError(error: unknown): {
  status: number;
  body: { code: string; error: string; mp_status?: number };
} | null {
  if (!(error instanceof MercadoPagoApiError)) return null;

  const json = error.responseJson ?? {};
  const messageParts = [
    json.message,
    json.error,
    stringifyCause(json.cause),
    error.responseText,
  ].map((value) => String(value ?? "").toLowerCase()).join(" ");

  if (error.status === 401 || error.status === 403) {
    return {
      status: 502,
      body: {
        code: "mp_credentials_error",
        error: "MercadoPago rechazó las credenciales de la integración. Revisa MP_ACCESS_TOKEN en Supabase.",
        mp_status: error.status,
      },
    };
  }

  if (
    error.status === 400 &&
    (
      (messageParts.includes("payer") && messageParts.includes("collector")) ||
      messageParts.includes("same user") ||
      messageParts.includes("same account") ||
      messageParts.includes("misma cuenta") ||
      messageParts.includes("mismo usuario")
    )
  ) {
    return {
      status: 409,
      body: {
        code: "mp_payer_equals_collector",
        error: "La cuenta de MercadoPago asociada a tu correo no puede pagar esta suscripción porque coincide con la cuenta vendedora. Usa otra cuenta de MercadoPago o contacta a soporte.",
        mp_status: error.status,
      },
    };
  }

  if (
    error.status === 400 &&
    (
      messageParts.includes("country") ||
      messageParts.includes("different countries") ||
      messageParts.includes("país") ||
      messageParts.includes("pais")
    )
  ) {
    return {
      status: 409,
      body: {
        code: "mp_account_country_mismatch",
        error: "MercadoPago rechazó la suscripción porque la cuenta compradora y la cuenta vendedora no son compatibles. Usa cuentas del mismo país y ambiente.",
        mp_status: error.status,
      },
    };
  }

  if (error.status === 400) {
    return {
      status: 502,
      body: {
        code: "mp_bad_request",
        error: "MercadoPago rechazó los datos de la suscripción. Revisa el plan seleccionado y la cuenta compradora.",
        mp_status: error.status,
      },
    };
  }

  if (error.status === 429) {
    return {
      status: 503,
      body: {
        code: "mp_rate_limited",
        error: "MercadoPago está limitando temporalmente las solicitudes. Intenta nuevamente en unos minutos.",
        mp_status: error.status,
      },
    };
  }

  return {
    status: 502,
    body: {
      code: "mp_api_error",
      error: "MercadoPago no pudo crear la suscripción en este momento. Intenta nuevamente o contacta soporte.",
      mp_status: error.status,
    },
  };
}

export function getAccessToken(): string {
  const token = Deno.env.get("MP_ACCESS_TOKEN");
  if (!token) throw new Error("MP_ACCESS_TOKEN no está configurado");
  return token;
}

export function getWebhookSecret(): string {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) throw new Error("MP_WEBHOOK_SECRET no está configurado");
  return secret;
}

// Timeout duro para llamadas a MercadoPago (15s). Si MP se cuelga,
// el Edge Function no debe quedar bloqueado hasta el límite de ejecución.
const MP_TIMEOUT_MS = 15_000;

async function mpFetch(
  method: string,
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getAccessToken()}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MP_TIMEOUT_MS);
  try {
    return await fetch(`${MP_API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export interface PreapprovalCreateInput {
  reason: string;
  external_reference: string;
  payer_email: string;
  back_url: string;
  notification_url?: string;
  auto_recurring: {
    frequency: number;
    frequency_type: "days" | "months";
    transaction_amount: number;
    currency_id: string; // "CLP" para Chile
    start_date?: string;
    end_date?: string;
  };
  status?: "pending" | "authorized";
  card_token_id?: string;
}

export interface PreapprovalResponse {
  id: string;
  status: string;
  init_point?: string;
  external_reference?: string;
  payer_email?: string;
  payer_id?: number;
  reason?: string;
  date_created?: string;
  next_payment_date?: string;
  auto_recurring?: PreapprovalCreateInput["auto_recurring"];
  [k: string]: unknown;
}

export async function createPreapproval(
  input: PreapprovalCreateInput,
  idempotencyKey: string,
): Promise<PreapprovalResponse> {
  const res = await mpFetch("POST", "/preapproval", input, idempotencyKey);
  const text = await res.text();
  if (!res.ok) {
    throw new MercadoPagoApiError("createPreapproval", res.status, text);
  }
  return JSON.parse(text) as PreapprovalResponse;
}

export async function getPreapproval(
  id: string,
): Promise<PreapprovalResponse> {
  const res = await mpFetch("GET", `/preapproval/${encodeURIComponent(id)}`);
  const text = await res.text();
  if (!res.ok) {
    throw new MercadoPagoApiError("getPreapproval", res.status, text);
  }
  return JSON.parse(text) as PreapprovalResponse;
}

export async function updatePreapprovalStatus(
  id: string,
  status: "paused" | "cancelled" | "authorized",
): Promise<PreapprovalResponse> {
  const res = await mpFetch(
    "PUT",
    `/preapproval/${encodeURIComponent(id)}`,
    { status },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new MercadoPagoApiError("updatePreapproval", res.status, text);
  }
  return JSON.parse(text) as PreapprovalResponse;
}

export async function getPayment(id: string): Promise<{
  id: number | string;
  status: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
  date_approved?: string;
  date_created?: string;
  payer?: { email?: string };
  [k: string]: unknown;
}> {
  const res = await mpFetch("GET", `/v1/payments/${encodeURIComponent(id)}`);
  const text = await res.text();
  if (!res.ok) {
    throw new MercadoPagoApiError("getPayment", res.status, text);
  }
  return JSON.parse(text);
}

export async function getAuthorizedPayment(id: string): Promise<{
  id: number | string;
  status: string;
  payment_id?: number | string;
  preapproval_id?: string;
  transaction_amount?: number;
  currency_id?: string;
  date_created?: string;
  payment_date?: string;
  debit_date?: string;
  next_payment_date?: string;
  [k: string]: unknown;
}> {
  const res = await mpFetch(
    "GET",
    `/authorized_payments/${encodeURIComponent(id)}`,
  );
  const text = await res.text();
  if (!res.ok) {
    throw new MercadoPagoApiError("getAuthorizedPayment", res.status, text);
  }
  return JSON.parse(text);
}

// ─────────────────────────────────────────────────────────────────
// Verificación HMAC-SHA256 del header `x-signature` enviado por MP.
//
// Manifest format (oficial MP):
//   id:<dataId>;request-id:<requestId>;ts:<ts>;
//
// Headers/queries:
//   x-signature: ts=<ts>,v1=<hex_hmac>
//   x-request-id: <uuid>
//   query: data.id=<dataId>
// ─────────────────────────────────────────────────────────────────

function parseSignature(header: string): { ts?: string; v1?: string } {
  const out: Record<string, string> = {};
  for (const part of header.split(",")) {
    const [k, v] = part.split("=");
    if (k && v) out[k.trim()] = v.trim();
  }
  return { ts: out.ts, v1: out.v1 };
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", keyData, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function signatureTimestampToMs(ts: number): number {
  if (ts > 1e14) return Math.floor(ts / 1000); // microseconds
  if (ts < 1e12) return ts * 1000; // seconds
  return ts; // milliseconds
}

export interface WebhookHeadersAndQuery {
  signature: string | null;     // header x-signature
  requestId: string | null;     // header x-request-id
  dataId: string | null;        // query data.id
  toleranceSeconds?: number;    // tolerancia de timestamp (default 600s)
}

export async function verifyWebhookSignature(
  hq: WebhookHeadersAndQuery,
): Promise<{ ok: boolean; reason?: string; ts?: string }> {
  if (!hq.signature) return { ok: false, reason: "missing x-signature" };
  if (!hq.requestId) return { ok: false, reason: "missing x-request-id" };
  if (!hq.dataId) return { ok: false, reason: "missing data.id" };

  const { ts, v1 } = parseSignature(hq.signature);
  if (!ts || !v1) return { ok: false, reason: "malformed x-signature" };

  // Anti-replay: rechazar si el ts es muy antiguo o en el futuro
  const tolerance = (hq.toleranceSeconds ?? 600) * 1000;
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: "invalid ts" };
  const skew = Math.abs(Date.now() - signatureTimestampToMs(tsNum));
  if (skew > tolerance) return { ok: false, reason: "ts out of tolerance" };

  const dataIdLower = hq.dataId.toLowerCase();
  const manifest =
    `id:${dataIdLower};request-id:${hq.requestId};ts:${ts};`;

  let secret: string;
  try {
    secret = getWebhookSecret();
  } catch (e) {
    return { ok: false, reason: String(e instanceof Error ? e.message : e), ts };
  }

  const expected = await hmacSha256Hex(secret, manifest);
  const ok = timingSafeEqualHex(expected, v1);
  return ok
    ? { ok: true, ts }
    : { ok: false, reason: "signature mismatch", ts };
}
