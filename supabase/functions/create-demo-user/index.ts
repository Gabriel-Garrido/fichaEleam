// POST /functions/v1/create-demo-user
//
// Body: { lead_id: uuid }
//
// Crea una cuenta real de admin_eleam para un lead aprobado.
// Esta función crea primero el ELEAM demo y luego crea el usuario Auth con
// app_metadata firmado por Admin API. El trigger handle_new_user solo acepta
// cuentas admin ELEAM si vienen por este canal server-side.
// Activa el ELEAM en modo demo (subscription_status = 'activo').
// Envía email de bienvenida vía Resend si RESEND_API_KEY está configurado.
// Si falta configuración o Resend falla, la respuesta incluye email_sent=false
// y email_error para que la UI pueda mostrar el motivo.
//
// Solo superadmin puede llamar esta función.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";
import { sendEmail, demoWelcomeEmail, type EmailResult } from "../_shared/email.ts";
import {
  findAuthUserByEmail,
  isDuplicateAuthUserError,
} from "../_shared/authUsers.ts";

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUTHORIZABLE_STATES = new Set(["nuevo", "contactado", "demo_activo"]);

function success(req: Request, code: string, message: string, payload: Record<string, unknown> = {}) {
  return jsonResponse(req, {
    ok: true,
    code,
    message,
    email_sent: false,
    ...payload,
  });
}

function fail(
  req: Request,
  code: string,
  message: string,
  status = 400,
  payload: Record<string, unknown> = {},
) {
  return jsonResponse(req, {
    ok: false,
    code,
    message,
    email_sent: false,
    ...payload,
  }, status);
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .slice(0, 12)
    .join("");
}

function getAppUrl(): string {
  const rawAppUrl = Deno.env.get("PUBLIC_APP_URL")?.trim() || "https://fichaeleam.cl";
  return rawAppUrl.replace(/\/+$/, "");
}

// Genera un enlace de recuperación (un solo uso) para que el usuario defina
// su contraseña. El enlace nunca se devuelve al cliente, solo se envía al correo.
async function generateAccessLink(
  sb: ReturnType<typeof adminClient>,
  email: string,
): Promise<{ link: string | null; error: string | null }> {
  const { data, error } = await sb.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${getAppUrl()}/reset-password` },
  });
  if (error) return { link: null, error: String(error.message ?? error) };
  const link = data?.properties?.action_link ?? null;
  if (!link) return { link: null, error: "No se pudo generar el enlace de acceso" };
  return { link, error: null };
}

async function sendDemoAccessLink({
  email,
  nombre,
  setupUrl,
  eleamNombre,
}: {
  email: string;
  nombre: string;
  setupUrl: string;
  eleamNombre: string;
}) {
  return await sendEmail({
    to: email,
    subject: `Tu demo de FichaEleam está lista, ${nombre}`,
    html: demoWelcomeEmail({ nombre, email, eleamNombre, setupUrl }),
  });
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return fail(req, "method_not_allowed", "Método no permitido", 405);
  }

  try {
    const { user, profile, error } = await getCallerProfile(req);
    if (error || !user || !profile) {
      return fail(req, "unauthenticated", "No autenticado", 401);
    }
    if (profile.rol !== "superadmin") {
      return fail(req, "forbidden", "Solo superadmin puede crear usuarios demo", 403);
    }

    const body = await req.json().catch(() => ({}));
    const leadId = String(body.lead_id ?? "").trim();
    if (!leadId) {
      return fail(req, "validation_error", "lead_id es obligatorio", 400);
    }
    if (!UUID_RE.test(leadId)) {
      return fail(req, "validation_error", "lead_id tiene formato inválido", 400);
    }

    const sb = adminClient();

    // Obtener datos del lead
    const { data: lead, error: leadErr } = await sb
      .from("demo_leads")
      .select("id, nombre, email, eleam_nombre, estado, demo_expires_at, demo_user_id")
      .eq("id", leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return fail(req, "not_found", "Lead no encontrado", 404);
    }

    if (!AUTHORIZABLE_STATES.has(String(lead.estado ?? ""))) {
      return fail(
        req,
        "blocked_state",
        "Este lead no puede recibir acceso demo desde su estado actual.",
        409,
        { status: lead.estado ?? null },
      );
    }

    const cleanEmail = String(lead.email ?? "").trim().toLowerCase();
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      return fail(req, "email_invalid", "El lead no tiene un correo válido. Corrígelo antes de aprobar el demo.", 400);
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const eleamNombre = lead.eleam_nombre || "Demo ELEAM";

    if (lead.demo_user_id) {
      return success(req, "already_active", "Este lead ya tiene acceso demo aprobado.", {
        already_active: true,
        profile_id: lead.demo_user_id,
        email: cleanEmail,
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
      return fail(req, "internal_error", "No se pudo validar el correo del lead. Intenta nuevamente.", 500);
    }

    const reusableProfile = (existingProfiles ?? [])
      .find((p) => p.rol === "admin_eleam" && p.eleam_id);
    const hasIncompatibleProfile = (existingProfiles ?? [])
      .some((p) => p.id !== reusableProfile?.id);
    const existingProfile = reusableProfile ?? null;
    if (existingProfile) {
      if (hasIncompatibleProfile) {
        return fail(
          req,
          "conflict",
          "Este correo ya pertenece a otra cuenta de FichaEleam. Revisa el usuario antes de aprobar el demo.",
          409,
        );
      }

      // Verificar que el ELEAM del admin no esté en producción activa antes de
      // sobreescribir sus datos con modo demo — evitar borrar suscripciones reales.
      const { data: eleamCheck } = await sb
        .from("eleams")
        .select("plan, subscription_status")
        .eq("id", existingProfile.eleam_id)
        .maybeSingle();

      if (
        eleamCheck &&
        eleamCheck.plan !== "demo" &&
        (eleamCheck.subscription_status === "activo" || eleamCheck.subscription_status === "en_gracia")
      ) {
        return fail(
          req,
          "production_account",
          "Este correo ya administra un ELEAM con acceso productivo. No se modificó para demo.",
          409,
        );
      }

      const { error: eleamUpdateErr } = await sb.from("eleams").update({
        nombre: eleamNombre,
        plan: "demo",
        subscription_status: "activo",
        pago_activo: true,
        fecha_vencimiento_suscripcion: expiresAt,
        crm_estado: "prueba",
        ultimo_contacto: new Date().toISOString(),
      }).eq("id", existingProfile.eleam_id);

      if (eleamUpdateErr) {
        console.error("demo eleam reuse update", eleamUpdateErr);
        return fail(req, "internal_error", "No se pudo activar el ELEAM demo. Intenta nuevamente.", 500);
      }

      const { error: leadUpdateErr } = await sb.from("demo_leads").update({
        demo_user_id: existingProfile.id,
        demo_access_granted_at: new Date().toISOString(),
        demo_expires_at: expiresAt,
        estado: "demo_activo",
      }).eq("id", leadId);

      if (leadUpdateErr) {
        console.error("demo lead reuse update", leadUpdateErr);
        return fail(req, "internal_error", "La cuenta se habilitó, pero no se pudo actualizar el lead. Recarga y verifica.", 500);
      }

      return success(req, "reused_demo", "Demo activado usando una cuenta existente compatible.", {
        reused_existing_user: true,
        profile_id: existingProfile.id,
        eleam_id: existingProfile.eleam_id,
        email: cleanEmail,
      });
    }

    if ((existingProfiles ?? []).length > 0 && !existingProfile) {
      return fail(req, "conflict", "Este correo ya pertenece a otra cuenta de FichaEleam. Usa otro correo para crear el demo.", 409);
    }

    const { user: existingAuthUser, error: authLookupErr } = await findAuthUserByEmail(sb, cleanEmail);
    if (authLookupErr) {
      console.error("auth user lookup", authLookupErr);
      return fail(req, "internal_error", "No se pudo validar si el correo ya existe. Intenta nuevamente.", 500);
    }

    // Contraseña aleatoria interna: el usuario nunca la ve ni la recibe.
    // Define la suya con el enlace de recuperación que se envía por correo.
    const tempPassword = generatePassword();

    const { data: demoEleam, error: eleamCreateErr } = await sb
      .from("eleams")
      .insert({
        nombre: eleamNombre,
        email_admin: cleanEmail,
        pago_activo: true,
        plan: "demo",
        subscription_status: "activo",
        fecha_vencimiento_suscripcion: expiresAt,
        crm_estado: "prueba",
        origen_lead: "landing_demo",
        ultimo_contacto: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (eleamCreateErr || !demoEleam) {
      console.error("demo eleam create", eleamCreateErr);
      return fail(req, "internal_error", "No se pudo crear el ELEAM demo. Intenta nuevamente.", 500);
    }

    if (existingAuthUser) {
      const profileInsert = await sb.from("profiles").insert({
        id: existingAuthUser.id,
        nombre: lead.nombre,
        email: cleanEmail,
        rol: "admin_eleam",
        eleam_id: demoEleam.id,
        must_reset_password: true,
      });

      if (profileInsert.error) {
        await sb.from("eleams").delete().eq("id", demoEleam.id);
        console.error("demo profile repair insert", profileInsert.error);
        return fail(req, "conflict", "El correo existe en Auth, pero no se pudo reparar su perfil. Revisa el usuario antes de continuar.", 409);
      }

      const currentAppMetadata =
        existingAuthUser.app_metadata && typeof existingAuthUser.app_metadata === "object"
          ? existingAuthUser.app_metadata
          : {};
      const currentUserMetadata =
        existingAuthUser.user_metadata && typeof existingAuthUser.user_metadata === "object"
          ? existingAuthUser.user_metadata
          : {};

      const { error: updateAuthErr } = await sb.auth.admin.updateUserById(existingAuthUser.id, {
        password: tempPassword,
        email_confirm: true,
        app_metadata: {
          ...currentAppMetadata,
          fichaeleam_account_source: "demo_approved",
          eleam_id_direct: demoEleam.id,
          rol_direct: "admin_eleam",
        },
        user_metadata: {
          ...currentUserMetadata,
          nombre: lead.nombre,
          must_reset_password: true,
        },
      });

      if (updateAuthErr) {
        await sb.from("profiles").delete().eq("id", existingAuthUser.id);
        await sb.from("eleams").delete().eq("id", demoEleam.id);
        console.error("demo auth repair update", updateAuthErr);
        return fail(req, "internal_error", "El correo existe en Auth, pero no se pudo habilitar para el demo.", 500);
      }

      const { error: leadUpdateErr } = await sb.from("demo_leads").update({
        demo_user_id: existingAuthUser.id,
        demo_access_granted_at: new Date().toISOString(),
        demo_expires_at: expiresAt,
        estado: "demo_activo",
      }).eq("id", leadId);

      if (leadUpdateErr) {
        await sb.from("profiles").delete().eq("id", existingAuthUser.id);
        await sb.from("eleams").delete().eq("id", demoEleam.id);
        console.error("demo repaired lead update", leadUpdateErr);
        return fail(req, "internal_error", "No se pudo actualizar el lead con la cuenta reparada.", 500);
      }

      const linkResult = await generateAccessLink(sb, cleanEmail);
      const emailResult: EmailResult = linkResult.link
        ? await sendDemoAccessLink({
            email: cleanEmail,
            nombre: lead.nombre,
            setupUrl: linkResult.link,
            eleamNombre,
          })
        : { sent: false, error: linkResult.error ?? "No se pudo generar el enlace de acceso" };

      return success(req, "repaired_auth", "Cuenta Auth reparada y demo aprobado.", {
        repaired_existing_auth_user: true,
        profile_id: existingAuthUser.id,
        eleam_id: demoEleam.id,
        email: cleanEmail,
        email_sent: emailResult.sent,
        email_skipped: emailResult.skipped === true,
        ...(emailResult.error ? { email_error: emailResult.error } : {}),
      });
    }

    // Crear usuario vía Admin API. La autorización de rol/ELEAM viaja en
    // app_metadata; user_metadata queda solo para datos de presentación.
    const { data: created, error: createError } = await sb.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        fichaeleam_account_source: "demo_approved",
        eleam_id_direct: demoEleam.id,
        rol_direct: "admin_eleam",
      },
      user_metadata: {
        nombre: lead.nombre,
        must_reset_password: true,
      },
    });

    if (createError) {
      await sb.from("eleams").delete().eq("id", demoEleam.id);
      if (isDuplicateAuthUserError(createError)) {
        return fail(
          req,
          "conflict",
          "Este correo ya existe en Auth. Actualiza la lista y vuelve a intentarlo para reparar la cuenta.",
          409,
        );
      }
      console.error("demo auth create", createError);
      return fail(req, "internal_error", "No se pudo crear el usuario demo. Intenta nuevamente.", 500);
    }

    const profileId = created.user.id;
    const eleamId: string = demoEleam.id;

    // Esperar a que el trigger cree el profile vinculado al ELEAM demo (máx 2s)
    let profileReady = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((r) => setTimeout(r, 250));
      const { data: profileRow } = await sb
        .from("profiles")
        .select("eleam_id")
        .eq("id", profileId)
        .maybeSingle();
      if (profileRow?.eleam_id === eleamId) {
        profileReady = true;
        break;
      }
    }

    if (!profileReady) {
      console.error("profile not linked after create-demo-user", { profileId, eleamId });
    }

    // Actualizar lead con el profile_id del usuario creado
    const { error: leadUpdateErr } = await sb.from("demo_leads").update({
      demo_user_id: profileId,
      demo_access_granted_at: new Date().toISOString(),
      demo_expires_at: expiresAt,
      estado: "demo_activo",
    }).eq("id", leadId);

    if (leadUpdateErr) {
      console.error("demo created lead update", leadUpdateErr);
      return fail(req, "internal_error", "El usuario se creó, pero no se pudo actualizar el lead. Recarga y verifica.", 500);
    }

    const linkResult = await generateAccessLink(sb, cleanEmail);
    const emailResult: EmailResult = linkResult.link
      ? await sendDemoAccessLink({
          email: cleanEmail,
          nombre: lead.nombre,
          setupUrl: linkResult.link,
          eleamNombre,
        })
      : { sent: false, error: linkResult.error ?? "No se pudo generar el enlace de acceso" };

    return success(req, "created", "Usuario demo creado correctamente.", {
      profile_id: profileId,
      eleam_id: eleamId,
      email: cleanEmail,
      email_sent: emailResult.sent,
      email_skipped: emailResult.skipped === true,
      ...(emailResult.error ? { email_error: emailResult.error } : {}),
    });
  } catch (e) {
    console.error("create-demo-user", e);
    return fail(req, "internal_error", "Error interno al aprobar el demo. Intenta nuevamente.", 500);
  }
});
