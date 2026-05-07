// POST /functions/v1/create-demo-user
//
// Body: { lead_id: uuid }
//
// Crea una cuenta real de admin_eleam para un lead aprobado.
// El trigger handle_new_user crea el ELEAM automáticamente.
// Activa el ELEAM en modo demo (subscription_status = 'activo').
// Envía email de bienvenida vía Resend si RESEND_API_KEY está configurado.
//
// Solo superadmin puede llamar esta función.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";
import { sendEmail, demoWelcomeEmail } from "../_shared/email.ts";

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .slice(0, 12)
    .join("");
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Método no permitido" }, 405);
  }

  try {
    const { user, profile, error } = await getCallerProfile(req);
    if (error || !user || !profile) {
      return jsonResponse(req, { error: "No autenticado" }, 401);
    }
    if (profile.rol !== "superadmin") {
      return jsonResponse(req, { error: "Solo superadmin puede crear usuarios demo" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const leadId = String(body.lead_id ?? "").trim();
    if (!leadId) {
      return jsonResponse(req, { error: "lead_id es obligatorio" }, 400);
    }

    const sb = adminClient();

    // Obtener datos del lead
    const { data: lead, error: leadErr } = await sb
      .from("demo_leads")
      .select("id, nombre, email, eleam_nombre, demo_token, demo_user_id")
      .eq("id", leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return jsonResponse(req, { error: "Lead no encontrado" }, 404);
    }
    const cleanEmail = String(lead.email ?? "").trim().toLowerCase();
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      return jsonResponse(req, { error: "El lead no tiene email válido" }, 400);
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const eleamNombre = lead.eleam_nombre || "Demo ELEAM";

    if (lead.demo_user_id) {
      return jsonResponse(req, {
        ok: true,
        already_active: true,
        profile_id: lead.demo_user_id,
        email: cleanEmail,
        email_sent: false,
      });
    }

    // Si el correo ya tiene perfil, no intentamos crear otro usuario Auth.
    // Para admins ELEAM reutilizamos la cuenta y activamos su ELEAM demo.
    // Para otros roles bloqueamos para evitar mezclar accesos.
    const { data: existingProfiles, error: existingErr } = await sb
      .from("profiles")
      .select("id, email, rol, eleam_id")
      .ilike("email", cleanEmail)
      .limit(2);

    if (existingErr) {
      console.error("profiles lookup", existingErr);
      return jsonResponse(req, { error: "No se pudo validar el correo del lead." }, 500);
    }

    const existingProfile = existingProfiles?.[0] ?? null;
    if (existingProfile) {
      if (existingProfile.rol !== "admin_eleam" || !existingProfile.eleam_id) {
        return jsonResponse(req, {
          error: "Este correo ya pertenece a otra cuenta de FichaEleam. Usa otro correo para crear el demo.",
        }, 409);
      }

      await sb.from("eleams").update({
        nombre: eleamNombre,
        subscription_status: "activo",
        pago_activo: true,
        fecha_vencimiento_suscripcion: expiresAt,
      }).eq("id", existingProfile.eleam_id);

      await sb.from("demo_leads").update({
        demo_user_id: existingProfile.id,
        demo_access_granted_at: new Date().toISOString(),
        demo_expires_at: expiresAt,
        estado: "demo_activo",
      }).eq("id", leadId);

      return jsonResponse(req, {
        ok: true,
        reused_existing_user: true,
        profile_id: existingProfile.id,
        eleam_id: existingProfile.eleam_id,
        email: cleanEmail,
        email_sent: false,
      });
    }

    const tempPassword = generatePassword();

    // Crear usuario vía Admin API.
    // Sin eleam_id_direct ni rol_direct → el trigger handle_new_user
    // crea el profile como admin_eleam con un ELEAM nuevo.
    const { data: created, error: createError } = await sb.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        nombre: lead.nombre,
        must_reset_password: true,
      },
    });

    if (createError) {
      if (
        createError.message?.toLowerCase().includes("already been registered") ||
        createError.message?.toLowerCase().includes("already registered") ||
        createError.message?.toLowerCase().includes("duplicate")
      ) {
        return jsonResponse(req, {
          error: "Este correo ya existe en Auth, pero no tiene un perfil asociado. Revisa Auth > Users o usa otro correo.",
        }, 409);
      }
      return jsonResponse(req, { error: "No se pudo crear el usuario." }, 500);
    }

    const profileId = created.user.id;

    // Esperar a que el trigger cree el profile + ELEAM (máx 2s)
    let eleamId: string | null = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((r) => setTimeout(r, 250));
      const { data: profileRow } = await sb
        .from("profiles")
        .select("eleam_id")
        .eq("id", profileId)
        .maybeSingle();
      if (profileRow?.eleam_id) {
        eleamId = profileRow.eleam_id;
        break;
      }
    }

    if (eleamId) {
      // Actualizar nombre del ELEAM y activar para demo
      await sb.from("eleams").update({
        nombre: eleamNombre,
        subscription_status: "activo",
        pago_activo: true,
        fecha_vencimiento_suscripcion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq("id", eleamId);
    }

    // Actualizar lead con el profile_id del usuario creado
    await sb.from("demo_leads").update({
      demo_user_id: profileId,
      demo_access_granted_at: new Date().toISOString(),
      demo_expires_at: expiresAt,
      estado: "demo_activo",
    }).eq("id", leadId);

    // Enviar email de bienvenida si Resend está configurado
    const appUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://fichaeleam.cl";
    const loginUrl = `${appUrl}/login`;
    const emailSent = await sendEmail({
      to: lead.email,
      subject: `Tu demo de FichaEleam está lista, ${lead.nombre}`,
      html: demoWelcomeEmail({
        nombre: lead.nombre,
        email: lead.email,
        tempPassword,
        eleamNombre,
        loginUrl,
      }),
    });

    return jsonResponse(req, {
      ok: true,
      profile_id: profileId,
      eleam_id: eleamId,
      email: cleanEmail,
      temp_password: tempPassword,
      email_sent: emailSent,
    });
  } catch (e) {
    console.error("create-demo-user", e);
    return jsonResponse(req, { error: "Error interno", detail: String(e?.message ?? e) }, 500);
  }
});
