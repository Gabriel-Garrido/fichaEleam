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
  tempPassword,
  eleamNombre,
  rol,
  loginUrl,
}: {
  nombre: string;
  email: string;
  tempPassword: string;
  eleamNombre: string;
  rol: string;
  loginUrl: string;
}): string {
  const safeNombre = escapeHtml(nombre);
  const safeEmail = escapeHtml(email);
  const safeTempPassword = escapeHtml(tempPassword);
  const safeEleamNombre = escapeHtml(eleamNombre);
  const safeLoginUrl = escapeHtml(loginUrl);
  const rolLabel = rol === "familiar" ? "Familiar" : "Funcionario";
  const safeRolLabel = escapeHtml(rolLabel);
  const googleHint = email.toLowerCase().endsWith("@gmail.com")
    ? " Si tu correo es Gmail, después de entrar con esta contraseña temporal podrás vincular Google como método de acceso."
    : "";
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
      </p>

      <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Tus credenciales de acceso</p>
        <p style="margin:0 0 8px;font-size:14px;color:#1e293b"><strong>Correo:</strong> ${safeEmail}</p>
        <p style="margin:0;font-size:14px;color:#1e293b"><strong>Contraseña temporal:</strong>
          <span style="font-family:monospace;background:#e2e8f0;padding:2px 8px;border-radius:4px;font-size:15px">${safeTempPassword}</span>
        </p>
      </div>

      <p style="color:#64748b;font-size:13px;margin:0 0 24px">
        Al ingresar por primera vez deberás establecer una contraseña personal.${googleHint}
      </p>

      <a href="${safeLoginUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
        Ingresar a FichaEleam
      </a>

      <p style="color:#94a3b8;font-size:12px;margin:32px 0 0">
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

export function demoWelcomeEmail({
  nombre,
  email,
  tempPassword,
  eleamNombre,
  loginUrl,
}: {
  nombre: string;
  email: string;
  tempPassword: string;
  eleamNombre: string;
  loginUrl: string;
}): string {
  const safeNombre = escapeHtml(nombre);
  const safeEmail = escapeHtml(email);
  const safeTempPassword = escapeHtml(tempPassword);
  const safeEleamNombre = escapeHtml(eleamNombre);
  const safeLoginUrl = escapeHtml(loginUrl);
  const googleHint = email.toLowerCase().endsWith("@gmail.com")
    ? " Si tu correo es Gmail, después de entrar con esta contraseña temporal podrás vincular Google como método de acceso."
    : "";
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
        Explora tu entorno de prueba durante el período demo; podrás cargar residentes, equipo y documentos cuando lo necesites.
      </p>

      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#0f766e;text-transform:uppercase;letter-spacing:.05em">Acceso a tu demo</p>
        <p style="margin:0 0 8px;font-size:14px;color:#1e293b"><strong>Correo:</strong> ${safeEmail}</p>
        <p style="margin:0;font-size:14px;color:#1e293b"><strong>Contraseña temporal:</strong>
          <span style="font-family:monospace;background:#ccfbf1;padding:2px 8px;border-radius:4px;font-size:15px">${safeTempPassword}</span>
        </p>
      </div>

      <p style="color:#64748b;font-size:13px;margin:0 0 24px">
        Al ingresar por primera vez deberás elegir una contraseña personal.${googleHint}
      </p>

      <a href="${safeLoginUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
        Ingresar a mi demo
      </a>

      <p style="color:#94a3b8;font-size:12px;margin:32px 0 0">
        ¿Tienes preguntas? Escríbenos a soporte@fichaeleam.cl
      </p>
    </div>
  </div>
</body>
</html>`;
}
