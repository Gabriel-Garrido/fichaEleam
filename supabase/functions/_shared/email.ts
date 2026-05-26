// Resend email helper for FichaEleam edge functions.
// Configure RESEND_API_KEY in Supabase project secrets to enable delivery.
// Optional: RESEND_FROM_EMAIL="FichaEleam <no-reply@fichaeleam.cl>"

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  // Overrides opcionales. Si no se pasan, se usan los defaults globales.
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
  providerStatus?: number;
  providerResponse?: string;
  providerMessageId?: string;
}

const DEFAULT_FROM = "FichaEleam <no-reply@fichaeleam.cl>";

function getFromEmail(): string {
  return Deno.env.get("RESEND_FROM_EMAIL")?.trim() || DEFAULT_FROM;
}

function compactProviderResponse(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!apiKey) {
    const error = "RESEND_API_KEY no configurado";
    console.warn("Email no enviado", { to: payload.to, subject: payload.subject, error });
    return { sent: false, skipped: true, error };
  }

  try {
    const body: Record<string, unknown> = {
      from: payload.from?.trim() || getFromEmail(),
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    };
    if (payload.replyTo?.trim()) {
      body.reply_to = payload.replyTo.trim();
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const responseText = await res.text().catch(() => "");
    if (!res.ok) {
      const providerResponse = compactProviderResponse(responseText);
      const error = `Resend respondió ${res.status}${providerResponse ? `: ${providerResponse}` : ""}`;
      console.error("Email no enviado", {
        to: payload.to,
        subject: payload.subject,
        status: res.status,
        providerResponse,
      });
      return {
        sent: false,
        error,
        providerStatus: res.status,
        providerResponse,
      };
    }

    // Parse Resend message id si esta disponible (para trazabilidad).
    let providerMessageId: string | undefined;
    try {
      const parsed = JSON.parse(responseText) as { id?: string };
      if (parsed?.id) providerMessageId = parsed.id;
    } catch { /* ignore */ }
    return { sent: true, providerMessageId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("Email no enviado por error de red/proveedor", {
      to: payload.to,
      subject: payload.subject,
      error,
    });
    return { sent: false, error };
  }
}

export function staffWelcomeEmail({
  nombre,
  email,
  eleamNombre,
  rol,
  setupUrl,
}: {
  nombre: string;
  email: string;
  eleamNombre: string;
  rol: string;
  setupUrl: string;
}): string {
  const safeNombre = escapeHtml(nombre);
  const safeEmail = escapeHtml(email);
  const safeEleamNombre = escapeHtml(eleamNombre);
  const safeSetupUrl = escapeHtml(setupUrl);
  const rolLabel = rol === "familiar" ? "Familiar" : "Funcionario";
  const safeRolLabel = escapeHtml(rolLabel);
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden">
    <div style="background:#2563eb;padding:32px 40px">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">FichaEleam</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px">Plataforma digital para ELEAM</p>
    </div>
    <div style="padding:32px 40px">
      <p style="color:#1e293b;font-size:16px;margin:0 0 8px">Hola, <strong>${safeNombre}</strong></p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">
        El administrador de <strong>${safeEleamNombre}</strong> te ha creado una cuenta como <strong>${safeRolLabel}</strong>.
        Para activarla, define tu contraseña con el botón de abajo.
      </p>

      <a href="${safeSetupUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
        Activar mi cuenta
      </a>

      <p style="color:#64748b;font-size:13px;margin:24px 0 0">
        Correo de tu cuenta: <strong>${safeEmail}</strong>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin:16px 0 0">
        El enlace es personal y caduca por seguridad. Si expira, solicita uno nuevo desde
        "¿Olvidaste tu contraseña?" en la página de inicio de sesión.
        Si no esperabas este correo, ignóralo. Para soporte: soporte@fichaeleam.cl
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function gmailStaffWelcomeEmail({
  nombre,
  email,
  eleamNombre,
  rol,
  loginUrl,
}: {
  nombre: string;
  email: string;
  eleamNombre: string;
  rol: string;
  loginUrl: string;
}): string {
  const safeNombre = escapeHtml(nombre);
  const safeEmail = escapeHtml(email);
  const safeEleamNombre = escapeHtml(eleamNombre);
  const safeLoginUrl = escapeHtml(loginUrl);
  const rolLabel = rol === "familiar" ? "Familiar" : "Funcionario";
  const safeRolLabel = escapeHtml(rolLabel);
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden">
    <div style="background:#2563eb;padding:32px 40px">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">FichaEleam</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px">Plataforma digital para ELEAM</p>
    </div>
    <div style="padding:32px 40px">
      <p style="color:#1e293b;font-size:16px;margin:0 0 8px">Hola, <strong>${safeNombre}</strong></p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">
        El administrador de <strong>${safeEleamNombre}</strong> te ha habilitado el acceso como <strong>${safeRolLabel}</strong>.
      </p>

      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:.05em">Acceso con Google</p>
        <p style="margin:0 0 8px;font-size:14px;color:#1e293b">
          Tu cuenta ha sido configurada para ingresar directamente con Google.<br>
          <strong>No necesitas contraseña</strong> — usa el botón de Google en la página de inicio de sesión.
        </p>
        <p style="margin:8px 0 0;font-size:13px;color:#475569">Correo habilitado: <strong>${safeEmail}</strong></p>
      </div>

      <a href="${safeLoginUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
        Ingresar con Google a FichaEleam
      </a>

      <p style="color:#94a3b8;font-size:12px;margin:32px 0 0">
        Si no esperabas este correo, ignóralo. Para soporte: soporte@fichaeleam.cl
      </p>
    </div>
  </div>
</body>
</html>`;
}

function formatClp(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CL")} CLP`;
}

function formatDateEs(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function paymentReceiptHtml({
  adminNombre,
  eleamNombre,
  planNombre,
  monto,
  moneda,
  fechaPago,
  proximoCobro,
}: {
  adminNombre: string;
  eleamNombre: string;
  planNombre: string;
  monto: number;
  moneda: string;
  fechaPago: string;
  proximoCobro?: string | null;
}): string {
  const safe = escapeHtml;
  const montoStr = moneda === "CLP" ? formatClp(monto) : `${monto} ${moneda}`;
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden">
    <div style="background:#0d9488;padding:32px 40px">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">FichaEleam</h1>
      <p style="color:#99f6e4;margin:4px 0 0;font-size:14px">Comprobante de pago</p>
    </div>
    <div style="padding:32px 40px">
      <p style="color:#1e293b;font-size:16px;margin:0 0 8px">Hola, <strong>${safe(adminNombre)}</strong></p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">
        Confirmamos el pago de tu suscripción a FichaEleam para <strong>${safe(eleamNombre)}</strong>.
      </p>

      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#0d9488;text-transform:uppercase;letter-spacing:.06em">Detalle del cobro</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0">Plan</td>
            <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right">${safe(planNombre)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0">Monto</td>
            <td style="font-size:15px;color:#0d9488;font-weight:700;text-align:right">${safe(montoStr)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0">Fecha de pago</td>
            <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right">${safe(formatDateEs(fechaPago))}</td>
          </tr>
          ${proximoCobro ? `<tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0">Próximo cobro</td>
            <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right">${safe(formatDateEs(proximoCobro))}</td>
          </tr>` : ""}
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0">Establecimiento</td>
            <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right">${safe(eleamNombre)}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:24px">
        <a href="https://fichaeleam.cl/pago" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
          Ver suscripción
        </a>
      </div>

      <p style="color:#94a3b8;font-size:12px;margin:0">
        Este pago fue procesado por MercadoPago. Si tienes dudas, escríbenos a soporte@fichaeleam.cl
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function paymentAdminNotificationHtml({
  eleamNombre,
  planNombre,
  monto,
  moneda,
  fechaPago,
  adminNombre,
  adminEmail,
  preapprovalId,
  authorizedPaymentId,
  proximoCobro,
}: {
  eleamNombre: string;
  planNombre: string;
  monto: number;
  moneda: string;
  fechaPago: string;
  adminNombre: string;
  adminEmail: string;
  preapprovalId: string;
  authorizedPaymentId: string;
  proximoCobro?: string | null;
}): string {
  const safe = escapeHtml;
  const montoStr = moneda === "CLP" ? formatClp(monto) : `${monto} ${moneda}`;
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden">
    <div style="background:#1e293b;padding:32px 40px">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">FichaEleam</h1>
      <p style="color:#94a3b8;margin:4px 0 0;font-size:14px">Notificación interna — nuevo pago confirmado</p>
    </div>
    <div style="padding:32px 40px">
      <p style="color:#1e293b;font-size:15px;font-weight:600;margin:0 0 4px">Nuevo pago confirmado</p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">
        Se registró un pago exitoso de MercadoPago para el ELEAM <strong>${safe(eleamNombre)}</strong>.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:16px">
        <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Datos del pago</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0;width:50%">ELEAM</td>
            <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right">${safe(eleamNombre)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0">Plan</td>
            <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right">${safe(planNombre)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0">Monto</td>
            <td style="font-size:15px;color:#0d9488;font-weight:700;text-align:right">${safe(montoStr)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0">Fecha de pago</td>
            <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right">${safe(formatDateEs(fechaPago))}</td>
          </tr>
          ${proximoCobro ? `<tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0">Próximo cobro</td>
            <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right">${safe(formatDateEs(proximoCobro))}</td>
          </tr>` : ""}
        </table>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:16px">
        <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Contacto del admin ELEAM</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0">Nombre</td>
            <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right">${safe(adminNombre)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0">Email</td>
            <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right">${safe(adminEmail)}</td>
          </tr>
        </table>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em">IDs MercadoPago</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="font-size:12px;color:#64748b;padding:4px 0">Preapproval ID</td>
            <td style="font-size:12px;color:#475569;font-family:monospace;text-align:right">${safe(preapprovalId)}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#64748b;padding:4px 0">Authorized Payment ID</td>
            <td style="font-size:12px;color:#475569;font-family:monospace;text-align:right">${safe(authorizedPaymentId)}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center">
        <a href="https://fichaeleam.cl/superadmin" style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px">
          Ver en panel CRM
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function demoWelcomeEmail({
  nombre,
  email,
  eleamNombre,
  setupUrl,
}: {
  nombre: string;
  email: string;
  eleamNombre: string;
  setupUrl: string;
}): string {
  const safeNombre = escapeHtml(nombre);
  const safeEmail = escapeHtml(email);
  const safeEleamNombre = escapeHtml(eleamNombre);
  const safeSetupUrl = escapeHtml(setupUrl);
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden">
    <div style="background:#0d9488;padding:32px 40px">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">FichaEleam</h1>
      <p style="color:#99f6e4;margin:4px 0 0;font-size:14px">Tu demo está lista</p>
    </div>
    <div style="padding:32px 40px">
      <p style="color:#1e293b;font-size:16px;margin:0 0 8px">Hola, <strong>${safeNombre}</strong></p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">
        Tu acceso a la demo de FichaEleam para <strong>${safeEleamNombre}</strong> ha sido activado.
        Abre el enlace para crear o restablecer tu contraseña. En esa misma pantalla también podrás entrar con Google usando este correo.
      </p>

      <a href="${safeSetupUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
        Crear contraseña o entrar con Google
      </a>

      <p style="color:#64748b;font-size:13px;margin:24px 0 0">
        Correo de tu cuenta: <strong>${safeEmail}</strong>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin:16px 0 0">
        El enlace es personal y caduca por seguridad. Si expira, solicita uno nuevo desde
        "¿Olvidaste tu contraseña?" en la página de inicio de sesión.
        ¿Tienes preguntas? Escríbenos a soporte@fichaeleam.cl
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── CRM prospecting templates ──────────────────────────────────────

export const CRM_DEFAULT_FROM = "Gabriel Garrido <gabriel@fichaeleam.cl>";
export const CRM_DEFAULT_REPLY_TO = "contacto@fichaeleam.cl";

export function getCrmFromEmail(): string {
  return Deno.env.get("RESEND_CRM_FROM_EMAIL")?.trim() || CRM_DEFAULT_FROM;
}

export function getCrmReplyTo(): string {
  return Deno.env.get("RESEND_CRM_REPLY_TO")?.trim() || CRM_DEFAULT_REPLY_TO;
}

// Convierte un texto plano a HTML preservando saltos de linea. Escapa todo
// el contenido para evitar XSS antes de inyectar <br/>.
function textBlockToHtml(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, "<br/>");
}

function buildCrmFallbackBody(eleamNombre: string, comuna: string | null | undefined): string {
  const zona = comuna && comuna.trim() ? comuna.trim() : "tu zona";
  return `Sabemos que administrar un ELEAM exige tiempo, orden y coordinación todos los días. Cuando la información está dispersa, el equipo pierde horas, las familias preguntan más y cada revisión se vuelve más pesada.\n\n` +
    `FichaEleam ayuda a residencias como ${eleamNombre} en ${zona} a reunir documentos, cuidados, medicamentos, signos vitales y reportes claros en un solo lugar. ` +
    `Además, trabajamos con precios justos para ELEAM pequeños y grandes, para que digitalizarse sea una decisión viable, no un lujo.`;
}

const CRM_TEMPLATE_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const CRM_TEMPLATE_VARIABLES = new Set([
  "eleam_nombre",
  "comuna",
  "telefono",
  "email",
  "origen",
  "canal_preferido",
  "digitalizacion_estado",
  "software_actual",
  "dolor_principal",
  "decision_maker_nombre",
  "decision_maker_cargo",
  "cargo_contacto",
  "num_residentes",
  "urgencia",
  "fit_score",
  "proxima_accion_fecha",
  "competidor",
]);

function crmDigitalizationLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    desconocido: "estado digital no identificado",
    papel_excel_whatsapp: "papel, Excel o WhatsApp",
    software_generico: "software generico",
    software_eleam: "software ELEAM actual",
    mixto: "operacion mixta",
  };
  return labels[value || "desconocido"] || value || "estado digital no identificado";
}

export function renderCrmTemplate(template: string | null | undefined, prospect: Record<string, unknown>, fallback = ""): string {
  const source = String(template || fallback || "");
  const context: Record<string, unknown> = {
    eleam_nombre: prospect.eleam_nombre || "tu ELEAM",
    comuna: prospect.comuna || "tu comuna",
    telefono: prospect.telefono || "",
    email: prospect.email || "",
    origen: prospect.origen || "",
    canal_preferido: prospect.canal_preferido || "",
    digitalizacion_estado: crmDigitalizationLabel(String(prospect.digitalizacion_estado || "desconocido")),
    software_actual: prospect.software_actual || "sin software identificado",
    dolor_principal: prospect.dolor_principal || "ordenar la operacion y ahorrar tiempo",
    decision_maker_nombre: prospect.decision_maker_nombre || "direccion",
    decision_maker_cargo: prospect.decision_maker_cargo || "decisor",
    cargo_contacto: prospect.cargo_contacto || "",
    num_residentes: prospect.num_residentes || "",
    urgencia: prospect.urgencia || "",
    fit_score: prospect.fit_score ?? "",
    proxima_accion_fecha: prospect.proxima_accion_fecha || "",
    competidor: prospect.competidor || prospect.software_actual || "",
  };
  return source.replace(CRM_TEMPLATE_RE, (_match, name) => String(context[name] ?? ""));
}

export function findUnknownCrmTemplateVariables(...templates: Array<string | null | undefined>): string[] {
  const unknown = new Set<string>();
  for (const template of templates) {
    String(template || "").replace(CRM_TEMPLATE_RE, (_match, name) => {
      if (!CRM_TEMPLATE_VARIABLES.has(name)) unknown.add(name);
      return "";
    });
  }
  return Array.from(unknown);
}

export function buildCrmProspectingEmail(params: {
  prospect: {
    eleam_nombre: string;
    comuna?: string | null;
    telefono?: string | null;
    email?: string | null;
    origen?: string | null;
    canal_preferido?: string | null;
    digitalizacion_estado?: string | null;
    software_actual?: string | null;
    dolor_principal?: string | null;
    decision_maker_nombre?: string | null;
    decision_maker_cargo?: string | null;
    cargo_contacto?: string | null;
    num_residentes?: number | null;
    urgencia?: string | null;
    fit_score?: number | null;
    proxima_accion_fecha?: string | null;
    competidor?: string | null;
  };
  campaign: {
    cuerpo_default?: string | null;
  };
  unsubscribeUrl: string;
}): string {
  const { prospect, campaign } = params;
  const safeEleam = escapeHtml(prospect.eleam_nombre);
  const safeUnsubscribeUrl = escapeHtml(params.unsubscribeUrl);
  // Prioridad: cuerpo personalizado del prospecto > cuerpo default de la
  // campaña > fallback construido con nombre/comuna.
  const bodyRaw =
    renderCrmTemplate(campaign.cuerpo_default, prospect, buildCrmFallbackBody(prospect.eleam_nombre, prospect.comuna ?? null));
  const bodyHtml = textBlockToHtml(bodyRaw);

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#fff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden">
        <tr><td style="background:#0d9488;padding:28px 36px">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.01em">FichaEleam</h1>
          <p style="color:#99f6e4;margin:4px 0 0;font-size:13px">Software para Establecimientos de Larga Estadía para Adultos Mayores</p>
        </td></tr>
        <tr><td style="padding:32px 36px 8px">
          <p style="color:#1e293b;font-size:16px;margin:0 0 16px">Estimado equipo de <strong>${safeEleam}</strong>,</p>
          <div style="color:#334155;font-size:14px;line-height:1.65;margin:0 0 24px">${bodyHtml}</div>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px">
            <tr><td style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:16px 20px">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#0d9488;text-transform:uppercase;letter-spacing:.06em">Qué incluye FichaEleam</p>
              <ul style="margin:0;padding:0 0 0 18px;color:#334155;font-size:13px;line-height:1.7">
                <li>Ordena en un solo lugar lo que hoy puede estar repartido entre carpetas, planillas y WhatsApp.</li>
                <li>Reduce el riesgo de enfrentar una revisión buscando papeles a última hora: registros y reportes claros cuando los necesiten.</li>
                <li>Facilita el trabajo diario del equipo con cuidados, medicamentos y signos vitales simples de registrar.</li>
                <li>Si ya usan otro sistema, les mostramos una alternativa pensada para ELEAM, fácil de adoptar y con soporte cercano en Chile.</li>
                <li>Planes con precios justos para residencias pequeñas y grandes, para que modernizarse tenga sentido desde el primer mes.</li>
              </ul>
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 16px">
            <tr><td style="border-radius:10px;background:#0d9488">
              <a href="https://fichaeleam.cl/#demo" style="display:inline-block;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
                Conoce FichaEleam — solicita una demo gratis
              </a>
            </td></tr>
          </table>

          <p style="color:#64748b;font-size:13px;margin:24px 0 0;text-align:center">
            Respondemos en menos de 24 horas hábiles. También puedes escribirnos respondiendo directamente este correo.
          </p>
        </td></tr>
        <tr><td style="padding:24px 36px 28px;border-top:1px solid #e2e8f0;background:#f8fafc">
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6">
            FichaEleam · Santiago, Chile · <a href="https://fichaeleam.cl" style="color:#94a3b8">fichaeleam.cl</a><br/>
            Si no quieres recibir más correos comerciales, puedes <a href="${safeUnsubscribeUrl}" style="color:#64748b;text-decoration:underline">darte de baja aquí</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildCrmUnsubscribePage(reason: string, email?: string | null): string {
  const safeEmail = email ? escapeHtml(email) : "";
  let title = "Operación inválida";
  let message = "El enlace de baja no es válido o ha sido manipulado. Si recibiste este correo y deseas darte de baja, contáctanos en contacto@fichaeleam.cl.";
  let badgeColor = "#dc2626";
  let badgeIcon = "&#10005;"; // ✕

  if (reason === "baja_efectiva") {
    title = "Te has dado de baja";
    message = `Listo. No volveremos a contactarte por correo${safeEmail ? ` a <strong>${safeEmail}</strong>` : ""}. Lamentamos no haber sido relevantes esta vez.`;
    badgeColor = "#0d9488";
    badgeIcon = "&#10003;"; // ✓
  } else if (reason === "ya_dado_de_baja") {
    title = "Ya estabas dado de baja";
    message = `Tu correo${safeEmail ? ` <strong>${safeEmail}</strong>` : ""} ya estaba marcado como "no contactar". No volveremos a escribirte.`;
    badgeColor = "#0d9488";
    badgeIcon = "&#10003;";
  } else if (reason === "token_invalido") {
    title = "Enlace inválido";
    message = "Este enlace de baja no corresponde a ningún prospecto activo. Es posible que ya haya expirado o haya sido manipulado.";
    badgeColor = "#f59e0b";
    badgeIcon = "&#33;"; // !
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} · FichaEleam</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1e293b">
  <div style="max-width:520px;margin:64px auto;padding:0 16px">
    <div style="background:#fff;border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,.06);overflow:hidden">
      <div style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:28px 32px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.01em">FichaEleam</h1>
      </div>
      <div style="padding:36px 32px 32px;text-align:center">
        <div style="width:64px;height:64px;border-radius:50%;background:${badgeColor};display:inline-flex;align-items:center;justify-content:center;margin:0 auto 20px">
          <span style="color:#fff;font-size:32px;font-weight:700;line-height:1">${badgeIcon}</span>
        </div>
        <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a">${escapeHtml(title)}</h2>
        <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6">${message}</p>
        <a href="https://fichaeleam.cl" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px">
          Conocer FichaEleam
        </a>
      </div>
    </div>
    <p style="margin:20px 0 0;text-align:center;color:#94a3b8;font-size:12px">
      Para cualquier consulta, escríbenos a
      <a href="mailto:contacto@fichaeleam.cl" style="color:#0d9488;text-decoration:none">contacto@fichaeleam.cl</a>
    </p>
  </div>
</body>
</html>`;
}
