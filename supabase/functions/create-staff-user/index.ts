// POST /functions/v1/create-staff-user
//
// Body: { nombre: string, email: string, telefono?: string, rol?: 'funcionario' }
//
// Crea el usuario con una contraseña aleatoria interna y le
// envía por correo un enlace para definir su propia contraseña. La contraseña
// interna nunca se devuelve. El trigger handle_new_user valida la app_metadata
// firmada por Admin API; esta función provisiona el profile y permite rollback.
// Nunca confiar en user_metadata para eleam_id/rol.
//
// Reglas:
//   • Solo el admin ELEAM con suscripción activa/en_gracia puede crear funcionarios.
//   • El alta respeta max_funcionarios del plan.
//   • La contraseña nunca se devuelve; el acceso se entrega por enlace al correo.
//   • Si Resend no está configurado o falla, retorna email_sent=false y email_error.

import { preflight, jsonResponse, internalErrorResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";
import { sendEmail, staffWelcomeEmail, type EmailResult } from "../_shared/email.ts";
import {
  findAuthUserByEmail,
  isDuplicateAuthUserError,
} from "../_shared/authUsers.ts";
import {
  EMAIL_RE,
  createAuthProvisionRequest,
  deleteAuthProvisionRequest,
  generateAccessLink,
  generatePassword,
} from "../_shared/provisioning.ts";


function eleamHasAccess(eleam: {
  subscription_status?: string | null;
  pago_activo?: boolean | null;
  fecha_vencimiento_suscripcion?: string | null;
}): boolean {
  if (eleam.pago_activo === true) return true;
  if (["activo", "en_gracia"].includes(String(eleam.subscription_status ?? ""))) return true;
  if (eleam.subscription_status === "cancelado" && eleam.fecha_vencimiento_suscripcion) {
    const until = new Date(eleam.fecha_vencimiento_suscripcion);
    return !Number.isNaN(until.valueOf()) && until > new Date();
  }
  return false;
}

function cleanText(value: unknown, max = 500): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function normalizePhone(value: unknown): string {
  return cleanText(value, 40)
    .replace(/[^\d+]/g, "")
    .replace(/(?!^)\+/g, "");
}

function isValidChilePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 12 && (/^(56)?9\d{8}$/.test(digits) || /^(56)?[2-9]\d{7,8}$/.test(digits));
}

async function sendStaffAccessLink({
  email,
  nombre,
  setupUrl,
  eleamNombre,
  rol,
}: {
  email: string;
  nombre: string;
  setupUrl: string;
  eleamNombre: string;
  rol: string;
}) {
  return await sendEmail({
    to: email,
    subject: `Tu acceso a FichaEleam — ${eleamNombre}`,
    html: staffWelcomeEmail({ nombre, email, eleamNombre, rol, setupUrl }),
  });
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
    if (!["admin_eleam", "funcionario"].includes(profile.rol) || !profile.eleam_id) {
      return jsonResponse(req, { error: "Tu cuenta no puede crear usuarios para un ELEAM" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const nombre = cleanText(body.nombre, 120);
    const cleanEmail = String(body.email ?? "").trim().toLowerCase();
    const telefono = normalizePhone(body.telefono);
    const requestedRole = String(body.rol ?? "funcionario").trim();
    const rol = "funcionario" as const;

    if (!nombre) {
      return jsonResponse(req, { error: "El nombre es obligatorio" }, 400);
    }
    if (nombre.length > 120) {
      return jsonResponse(req, { error: "El nombre no puede superar 120 caracteres" }, 400);
    }
    if (cleanEmail.length > 254) {
      return jsonResponse(req, { error: "Email inválido" }, 400);
    }
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      return jsonResponse(req, { error: "Email inválido" }, 400);
    }
    if (requestedRole !== rol) {
      return jsonResponse(req, { error: "Solo se pueden crear cuentas de funcionarios" }, 400);
    }
    if (profile.rol !== "admin_eleam") {
      return jsonResponse(req, {
        error: "Solo el administrador del ELEAM puede crear funcionarios.",
      }, 403);
    }
    if (telefono && !isValidChilePhone(telefono)) {
      return jsonResponse(req, { error: "Teléfono inválido. Usa un número chileno, por ejemplo +56 9 1234 5678." }, 400);
    }

    const sb = adminClient();

    // Verificar estado del ELEAM
    const { data: eleam } = await sb
      .from("eleams")
      .select("id, subscription_status, pago_activo, fecha_vencimiento_suscripcion, plan_id, max_funcionarios, nombre")
      .eq("id", profile.eleam_id)
      .maybeSingle();
    if (!eleam) return jsonResponse(req, { error: "ELEAM no encontrado" }, 404);

    if (!eleamHasAccess(eleam)) {
      return jsonResponse(req, { error: "El ELEAM no tiene acceso activo" }, 403);
    }

    // Verificar límite de funcionarios del plan
    if (rol === "funcionario") {
      const { data: plan } = eleam.plan_id
        ? await sb.from("planes").select("max_funcionarios").eq("id", eleam.plan_id).maybeSingle()
        : { data: null } as { data: { max_funcionarios: number | null } | null };
      const maxFunc = plan?.max_funcionarios ?? eleam.max_funcionarios ?? null;

      if (maxFunc !== null) {
        const { count: actuales } = await sb
          .from("profiles")
          .select("id", { head: true, count: "exact" })
          .eq("eleam_id", eleam.id)
          .eq("rol", "funcionario");

        const { count: pendingInvites } = await sb
          .from("funcionario_invitaciones")
          .select("id", { head: true, count: "exact" })
          .eq("eleam_id", eleam.id)
          .eq("rol", "funcionario")
          .eq("usado", false)
          .gt("expira_en", new Date().toISOString());

        const total = (actuales ?? 0) + (pendingInvites ?? 0);
        if (total >= maxFunc) {
          return jsonResponse(req, {
            error: `El plan permite máximo ${maxFunc} funcionarios. Actualiza el plan para agregar más.`,
          }, 409);
        }
      }
    }

    const { data: existingProfiles, error: existingProfilesErr } = await sb
      .from("profiles")
      .select("id, email, rol, eleam_id")
      .ilike("email", cleanEmail)
      .limit(2);

    if (existingProfilesErr) {
      console.error("staff profiles lookup", existingProfilesErr);
      return jsonResponse(req, { error: "No se pudo validar si el correo ya tiene perfil." }, 500);
    }

    if ((existingProfiles ?? []).length > 0) {
      return jsonResponse(req, {
        error: "Este correo ya tiene una cuenta registrada en FichaEleam.",
      }, 409);
    }

    // ── Flujo estándar: contraseña temporal ──────────────────────────────────
    const { user: existingAuthUser, error: authLookupErr } = await findAuthUserByEmail(sb, cleanEmail);
    if (authLookupErr) {
      console.error("staff auth user lookup", authLookupErr);
      return jsonResponse(req, { error: "No se pudo validar si el correo ya existe en Auth." }, 500);
    }

    // Contraseña aleatoria interna: el usuario nunca la ve ni la recibe.
    // Define la suya con el enlace de recuperación que se envía por correo.
    const tempPassword = generatePassword();

    if (existingAuthUser) {
      const { error: profileInsertErr } = await sb.from("profiles").insert({
        id: existingAuthUser.id,
        nombre,
        email: cleanEmail,
        telefono: telefono || null,
        rol,
        eleam_id: profile.eleam_id,
        must_reset_password: true,
      });

      if (profileInsertErr) {
        console.error("staff profile repair insert", profileInsertErr);
        return jsonResponse(req, {
          error: "El correo existe en Auth, pero no se pudo reparar su perfil. Revisa si ya pertenece a otro flujo.",
        }, 409);
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
          fichaeleam_account_source: profile.rol === "admin_eleam" ? "admin_created" : "funcionario_created",
          eleam_id_direct: profile.eleam_id,
          rol_direct: rol,
        },
        user_metadata: {
          ...currentUserMetadata,
          nombre,
          telefono: telefono || null,
          must_reset_password: true,
        },
      });

      if (updateAuthErr) {
        await sb.from("profiles").delete().eq("id", existingAuthUser.id);
        console.error("staff auth repair update", updateAuthErr);
        return jsonResponse(req, {
          error: "El correo existe en Auth, pero no se pudo habilitar para este ELEAM.",
        }, 500);
      }

      const linkResult = await generateAccessLink(sb, cleanEmail);
      const emailResult: EmailResult = linkResult.link
        ? await sendStaffAccessLink({
            email: cleanEmail,
            nombre,
            setupUrl: linkResult.link,
            eleamNombre: eleam.nombre,
            rol,
          })
        : { sent: false, error: linkResult.error ?? "No se pudo generar el enlace de acceso" };

      return jsonResponse(req, {
        ok: true,
        repaired_existing_auth_user: true,
        profile_id: existingAuthUser.id,
        email: cleanEmail,
        rol,
        email_sent: emailResult.sent,
        email_skipped: emailResult.skipped === true,
        ...(emailResult.error ? { email_error: emailResult.error } : {}),
      });
    }

    const { id: provisionId, error: provisionErr } = await createAuthProvisionRequest(sb, {
      email: cleanEmail,
      eleamId: profile.eleam_id,
      rol,
      accountSource: profile.rol === "admin_eleam" ? "admin_created" : "funcionario_created",
    });

    if (provisionErr || !provisionId) {
      console.error("staff auth provision create", provisionErr);
      return jsonResponse(req, {
        error: "No se pudo preparar la cuenta del funcionario. Intenta nuevamente o contacta a soporte.",
      }, 500);
    }

    // Crear usuario vía Admin API. El trigger handle_new_user valida la
    // metadata; el profile se provisiona aquí para poder hacer rollback claro.
    const { data: created, error: createError } = await sb.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        fichaeleam_account_source: profile.rol === "admin_eleam" ? "admin_created" : "funcionario_created",
        eleam_id_direct: profile.eleam_id,
        rol_direct: rol,
      },
      user_metadata: {
        nombre,
        telefono: telefono || null,
        must_reset_password: true,
        fichaeleam_provision_id: provisionId,
      },
    });

    if (createError) {
      await deleteAuthProvisionRequest(sb, provisionId);
      console.error("create-staff-user error:", createError);
      if (isDuplicateAuthUserError(createError)) {
        return jsonResponse(req, {
          error: "Este correo ya existe en Auth. Actualiza la lista y vuelve a intentarlo para reparar la cuenta, o revisa Auth > Users si el problema persiste.",
        }, 409);
      }
      return jsonResponse(req, {
        error: "No se pudo crear la cuenta del funcionario. Intenta nuevamente o contacta a soporte.",
      }, 500);
    }

    const createdUserId = created.user.id;
    const { error: profileProvisionErr } = await sb.from("profiles").upsert({
      id: createdUserId,
      nombre,
      email: cleanEmail,
      telefono: telefono || null,
      rol,
      eleam_id: profile.eleam_id,
      must_reset_password: true,
    }, { onConflict: "id" });

    if (profileProvisionErr) {
      await sb.auth.admin.deleteUser(createdUserId);
      console.error("staff profile provision after auth create", profileProvisionErr);
      const message = String(profileProvisionErr.message ?? "");
      if (message.includes("El plan permite máximo")) {
        return jsonResponse(req, { error: message }, 409);
      }
      return jsonResponse(req, {
        error: "No se pudo completar la cuenta del funcionario. Intenta nuevamente o contacta a soporte.",
      }, 500);
    }

    const linkResult = await generateAccessLink(sb, cleanEmail);
    const emailResult: EmailResult = linkResult.link
      ? await sendStaffAccessLink({
          email: cleanEmail,
          nombre,
          setupUrl: linkResult.link,
          eleamNombre: eleam.nombre,
          rol,
        })
      : { sent: false, error: linkResult.error ?? "No se pudo generar el enlace de acceso" };

    return jsonResponse(req, {
      ok: true,
      profile_id: createdUserId,
      email: cleanEmail,
      rol,
      email_sent: emailResult.sent,
      email_skipped: emailResult.skipped === true,
      ...(emailResult.error ? { email_error: emailResult.error } : {}),
    });
  } catch (e) {
    console.error("create-staff-user", e);
    return internalErrorResponse(req);
  }
});
