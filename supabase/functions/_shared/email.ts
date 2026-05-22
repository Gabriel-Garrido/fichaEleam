// Resend email helper for FichaEleam edge functions.
// Configure RESEND_API_KEY in Supabase project secrets to enable delivery.
// Optional: RESEND_FROM_EMAIL="FichaEleam <no-reply@fichaeleam.cl>"

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface EmailResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
  providerStatus?: number;
  providerResponse?: string;
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
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getFromEmail(),
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
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

    return { sent: true };
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
