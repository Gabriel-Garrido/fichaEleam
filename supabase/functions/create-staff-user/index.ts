// POST /functions/v1/create-staff-user
//
// Body: { nombre: string, email: string, rol?: 'funcionario' | 'familiar', residente_id?: uuid }
//
// Para correos Gmail (@gmail.com): crea una invitación en funcionario_invitaciones
// y el usuario puede ingresar directamente con Google OAuth. No necesita contraseña.
//
// Para otros correos: crea el usuario con una contraseña aleatoria interna y le
// envía por correo un enlace para definir su propia contraseña. La contraseña
// interna nunca se devuelve. El trigger handle_new_user valida la app_metadata
// firmada por Admin API; esta función provisiona el profile y permite rollback.
// Nunca confiar en user_metadata para eleam_id/rol.
//
// Reglas:
//   • Admin ELEAM con suscripción activa/en_gracia puede crear funcionarios y familiares.
//   • Funcionario del ELEAM puede crear familiares vinculados a residentes activos.
//   • Si rol='familiar' → residente_id obligatorio y debe pertenecer al ELEAM.
//   • Si rol='funcionario' → respeta max_funcionarios del plan.
//   • La contraseña nunca se devuelve; el acceso se entrega por enlace al correo.
//   • Si Resend no está configurado o falla, retorna email_sent=false y email_error.

import { preflight, jsonResponse, internalErrorResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";
import { sendEmail, staffWelcomeEmail, gmailStaffWelcomeEmail, type EmailResult } from "../_shared/email.ts";
import {
  findAuthUserByEmail,
  isDuplicateAuthUserError,
} from "../_shared/authUsers.ts";
import {
  EMAIL_RE,
  GMAIL_RE,
  UUID_RE,
  createAuthProvisionRequest,
  deleteAuthProvisionRequest,
  generateAccessLink,
  generatePassword,
  getAppUrl,
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

async function sendGmailInvite({
  email,
  nombre,
  eleamNombre,
  rol,
}: {
  email: string;
  nombre: string;
  eleamNombre: string;
  rol: string;
}) {
  return await sendEmail({
    to: email,
    subject: `Tu acceso a FichaEleam — ${eleamNombre}`,
    html: gmailStaffWelcomeEmail({
      nombre,
      email,
      eleamNombre,
      rol,
      loginUrl: `${getAppUrl()}/login`,
    }),
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
    const nombre = String(body.nombre ?? "").trim().replace(/\s+/g, " ");
    const cleanEmail = String(body.email ?? "").trim().toLowerCase();
    const rol = String(body.rol ?? "funcionario").trim();
    const residenteId: string | null = body.residente_id
      ? String(body.residente_id).trim()
      : null;

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
    if (!["funcionario", "familiar"].includes(rol)) {
      return jsonResponse(req, { error: "Rol inválido" }, 400);
    }
    if (profile.rol === "funcionario" && rol !== "familiar") {
      return jsonResponse(req, {
        error: "Un funcionario solo puede crear cuentas familiares vinculadas a residentes.",
      }, 403);
    }
    if (rol === "familiar" && !residenteId) {
      return jsonResponse(req, { error: "Para crear un familiar debes seleccionar un residente" }, 400);
    }
    if (residenteId && !UUID_RE.test(residenteId)) {
      return jsonResponse(req, { error: "residente_id tiene formato inválido" }, 400);
    }

    const isGmail = GMAIL_RE.test(cleanEmail);

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

    // Validar residente para familiar
    if (rol === "familiar") {
      const { data: res } = await sb
        .from("residentes")
        .select("id, eleam_id, estado")
        .eq("id", residenteId!)
        .maybeSingle();
      if (!res || res.eleam_id !== eleam.id) {
        return jsonResponse(req, { error: "El residente no pertenece a tu ELEAM" }, 400);
      }
      if (res.estado !== "activo") {
        return jsonResponse(req, { error: "Solo puedes vincular familiares a residentes activos" }, 400);
      }
    }

    // Dedupe de invitaciones Gmail antes de contar límites: reintentar el alta
    // de la misma persona no debe consumir cupos ni crear invitaciones paralelas.
    if (isGmail) {
      const nowIso = new Date().toISOString();
      const { data: existingInvite, error: inviteLookupErr } = await sb
        .from("funcionario_invitaciones")
        .select("id")
        .eq("eleam_id", eleam.id)
        .ilike("email", cleanEmail)
        .eq("usado", false)
        .gt("expira_en", nowIso)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inviteLookupErr) {
        console.error("gmail invitation lookup", inviteLookupErr);
        return jsonResponse(req, { error: "No se pudo validar si ya existe una invitación pendiente." }, 500);
      }

      if (existingInvite) {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const { error: inviteUpdateErr } = await sb
          .from("funcionario_invitaciones")
          .update({
            rol,
            residente_id: residenteId || null,
            expira_en: expiresAt,
            creado_por: user.id,
          })
          .eq("id", existingInvite.id);

        if (inviteUpdateErr) {
          console.error("gmail invitation refresh", inviteUpdateErr);
          return jsonResponse(req, { error: "No se pudo actualizar la invitación pendiente." }, 500);
        }

        const emailResult = await sendGmailInvite({ email: cleanEmail, nombre, eleamNombre: eleam.nombre, rol });

        return jsonResponse(req, {
          ok: true,
          is_gmail: true,
          google_only: true,
          pending_invitation: true,
          profile_id: null,
          email: cleanEmail,
          rol,
          email_sent: emailResult.sent,
          email_skipped: emailResult.skipped === true,
          ...(emailResult.error ? { email_error: emailResult.error } : {}),
        });
      }
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

    // ── Flujo Gmail: invitación para login con Google ────────────────────────
    if (isGmail) {
      const { user: existingAuthUser, error: authLookupErr } = await findAuthUserByEmail(sb, cleanEmail);
      if (authLookupErr) {
        console.error("gmail auth user lookup", authLookupErr);
        return jsonResponse(req, { error: "No se pudo validar si el correo ya existe en Auth." }, 500);
      }

      if (existingAuthUser) {
        // Verificar si ya usa Google OAuth
        const identities = (existingAuthUser as { identities?: Array<{ provider?: string }> }).identities ?? [];
        const hasGoogle = identities.some((i) => i.provider === "google");

        if (!hasGoogle) {
          return jsonResponse(req, {
            error: "Este correo ya tiene una cuenta con contraseña. El usuario debe usar su correo y contraseña para ingresar.",
          }, 409);
        }

        // Usuario Google existente sin perfil: insertar perfil directamente
        const { error: profileInsertErr } = await sb.from("profiles").insert({
          id: existingAuthUser.id,
          nombre,
          email: cleanEmail,
          rol,
          eleam_id: profile.eleam_id,
          must_reset_password: false,
        });

        if (profileInsertErr) {
          console.error("gmail profile insert for existing google user", profileInsertErr);
          return jsonResponse(req, {
            error: "No se pudo crear el perfil para el usuario de Google existente.",
          }, 500);
        }

        if (rol === "familiar" && residenteId) {
          const { error: linkErr } = await sb.from("familiar_residentes").insert({
            profile_id: existingAuthUser.id,
            residente_id: residenteId,
            creado_por: user.id,
          });
          if (linkErr) {
            await sb.from("profiles").delete().eq("id", existingAuthUser.id);
            console.error("gmail familiar link for existing user", linkErr);
            return jsonResponse(req, {
              error: "No se pudo vincular el familiar al residente seleccionado.",
            }, 500);
          }
        }

        const currentAppMeta =
          existingAuthUser.app_metadata && typeof existingAuthUser.app_metadata === "object"
            ? existingAuthUser.app_metadata
            : {};

        await sb.auth.admin.updateUserById(existingAuthUser.id, {
          app_metadata: {
            ...currentAppMeta,
            fichaeleam_account_source: "admin_created_google",
            eleam_id_direct: profile.eleam_id,
            rol_direct: rol,
            ...(rol === "familiar" && residenteId ? { residente_id_direct: residenteId } : {}),
          },
        });

        const emailResult = await sendGmailInvite({ email: cleanEmail, nombre, eleamNombre: eleam.nombre, rol });

        return jsonResponse(req, {
          ok: true,
          is_gmail: true,
          google_only: true,
          existing_google_user: true,
          profile_id: existingAuthUser.id,
          email: cleanEmail,
          rol,
          email_sent: emailResult.sent,
          email_skipped: emailResult.skipped === true,
          ...(emailResult.error ? { email_error: emailResult.error } : {}),
        });
      }

      // No hay cuenta en Auth: crear invitación para que el usuario entre con Google
      // El token es requerido por la tabla pero no se usa en el flujo Google OAuth
      const invToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 días

      const { error: invError } = await sb.from("funcionario_invitaciones").insert({
        eleam_id: profile.eleam_id,
        email: cleanEmail,
        token: invToken,
        expira_en: expiresAt,
        rol,
        residente_id: residenteId || null,
        creado_por: user.id,
      });

      if (invError) {
        console.error("gmail invitation insert", invError);
        return jsonResponse(req, { error: "No se pudo preparar el acceso de Google." }, 500);
      }

      const emailResult = await sendGmailInvite({ email: cleanEmail, nombre, eleamNombre: eleam.nombre, rol });

      return jsonResponse(req, {
        ok: true,
        is_gmail: true,
        google_only: true,
        profile_id: null,
        email: cleanEmail,
        rol,
        email_sent: emailResult.sent,
        email_skipped: emailResult.skipped === true,
        ...(emailResult.error ? { email_error: emailResult.error } : {}),
      });
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

      if (rol === "familiar" && residenteId) {
        const { error: familiarLinkErr } = await sb.from("familiar_residentes").insert({
          profile_id: existingAuthUser.id,
          residente_id: residenteId,
          creado_por: user.id,
        });

        if (familiarLinkErr) {
          await sb.from("profiles").delete().eq("id", existingAuthUser.id);
          console.error("staff familiar repair link", familiarLinkErr);
          return jsonResponse(req, {
            error: "No se pudo vincular el familiar al residente seleccionado.",
          }, 500);
        }
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
          ...(rol === "familiar" && residenteId ? { residente_id_direct: residenteId } : {}),
        },
        user_metadata: {
          ...currentUserMetadata,
          nombre,
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
      residenteId,
    });

    if (provisionErr || !provisionId) {
      console.error("staff auth provision create", provisionErr);
      return jsonResponse(req, {
        error: "No se pudo preparar la provisión Auth. Aplica supabase_schema.sql actualizado y vuelve a intentar.",
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
        ...(rol === "familiar" && residenteId ? { residente_id_direct: residenteId } : {}),
      },
      user_metadata: {
        nombre,
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
      const detail = String(createError.message ?? createError);
      return jsonResponse(req, {
        error: detail.includes("Database error creating new user")
          ? "Auth rechazó la creación por un trigger de base de datos. Aplica supabase_schema.sql y vuelve a desplegar la función."
          : "No se pudo crear el usuario.",
      }, 500);
    }

    const createdUserId = created.user.id;
    const { error: profileProvisionErr } = await sb.from("profiles").upsert({
      id: createdUserId,
      nombre,
      email: cleanEmail,
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
        error: "Auth creó el usuario, pero no se pudo crear su perfil. Aplica supabase_schema.sql y vuelve a intentar.",
      }, 500);
    }

    if (rol === "familiar" && residenteId) {
      const { error: familiarProvisionErr } = await sb.from("familiar_residentes").upsert({
        profile_id: createdUserId,
        residente_id: residenteId,
        creado_por: user.id,
      }, { onConflict: "profile_id,residente_id" });

      if (familiarProvisionErr) {
        await sb.auth.admin.deleteUser(createdUserId);
        console.error("staff familiar link after auth create", familiarProvisionErr);
        return jsonResponse(req, {
          error: "Auth creó el usuario, pero no se pudo vincular el familiar al residente.",
        }, 500);
      }
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
