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
    throw new Error(`MP createPreapproval ${res.status}: ${text}`);
  }
  return JSON.parse(text) as PreapprovalResponse;
}

export async function getPreapproval(
  id: string,
): Promise<PreapprovalResponse> {
  const res = await mpFetch("GET", `/preapproval/${encodeURIComponent(id)}`);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`MP getPreapproval ${res.status}: ${text}`);
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
    throw new Error(`MP updatePreapproval ${res.status}: ${text}`);
  }
  return JSON.parse(text) as PreapprovalResponse;
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
    throw new Error(`MP getAuthorizedPayment ${res.status}: ${text}`);
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
  const skew = Math.abs(Date.now() - tsNum);
  if (skew > tolerance) return { ok: false, reason: "ts out of tolerance" };

  const dataIdLower = hq.dataId.toLowerCase();
  const manifest =
    `id:${dataIdLower};request-id:${hq.requestId};ts:${ts};`;

  const expected = await hmacSha256Hex(getWebhookSecret(), manifest);
  const ok = timingSafeEqualHex(expected, v1);
  return ok
    ? { ok: true, ts }
    : { ok: false, reason: "signature mismatch", ts };
}
