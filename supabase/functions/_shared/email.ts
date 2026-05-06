// Resend email helper for FichaEleam edge functions.
// If RESEND_API_KEY is not set, sendEmail is a no-op and returns false.
// Configure the key in Supabase project secrets to enable email delivery.

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

const FROM = "FichaEleam <no-reply@fichaeleam.cl>";

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });
    return res.ok;
  } catch {
    return false;
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
  const rolLabel = rol === "familiar" ? "Familiar" : "Funcionario";
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
      <p style="color:#1e293b;font-size:16px;margin:0 0 8px">Hola, <strong>${nombre}</strong></p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">
        El administrador de <strong>${eleamNombre}</strong> te ha creado una cuenta como <strong>${rolLabel}</strong>.
      </p>

      <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Tus credenciales de acceso</p>
        <p style="margin:0 0 8px;font-size:14px;color:#1e293b"><strong>Correo:</strong> ${email}</p>
        <p style="margin:0;font-size:14px;color:#1e293b"><strong>Contraseña temporal:</strong>
          <span style="font-family:monospace;background:#e2e8f0;padding:2px 8px;border-radius:4px;font-size:15px">${tempPassword}</span>
        </p>
      </div>

      <p style="color:#64748b;font-size:13px;margin:0 0 24px">
        Al ingresar por primera vez deberás establecer una contraseña personal.
        ${email.endsWith("@gmail.com") ? "Si prefieres, también puedes iniciar sesión con tu cuenta de Google." : ""}
      </p>

      <a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
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
      <p style="color:#1e293b;font-size:16px;margin:0 0 8px">Hola, <strong>${nombre}</strong></p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">
        Tu acceso a la demo de FichaEleam para <strong>${eleamNombre}</strong> ha sido activado.
        Explora la plataforma con datos reales durante tu período de prueba.
      </p>

      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#0f766e;text-transform:uppercase;letter-spacing:.05em">Acceso a tu demo</p>
        <p style="margin:0 0 8px;font-size:14px;color:#1e293b"><strong>Correo:</strong> ${email}</p>
        <p style="margin:0;font-size:14px;color:#1e293b"><strong>Contraseña temporal:</strong>
          <span style="font-family:monospace;background:#ccfbf1;padding:2px 8px;border-radius:4px;font-size:15px">${tempPassword}</span>
        </p>
      </div>

      <p style="color:#64748b;font-size:13px;margin:0 0 24px">
        Al ingresar por primera vez deberás elegir una contraseña personal.
        ${email.endsWith("@gmail.com") ? "También puedes iniciar sesión directamente con tu cuenta de Google." : ""}
      </p>

      <a href="${loginUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
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
