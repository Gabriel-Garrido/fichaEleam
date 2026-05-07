// POST /functions/v1/create-staff-user
//
// Body: { nombre: string, email: string, rol?: 'funcionario' | 'familiar', residente_id?: uuid }
//
// Crea un usuario directamente con contraseña temporal generada aquí.
// El trigger handle_new_user crea el profile automáticamente usando app_metadata
// firmado por Admin API. Nunca confiar en user_metadata para eleam_id/rol.
// Al iniciar sesión por primera vez, el usuario es redirigido a /cambiar-clave.
//
// Reglas:
//   • Admin ELEAM con suscripción activa/en_gracia puede crear funcionarios y familiares.
//   • Funcionario del ELEAM puede crear familiares vinculados a residentes activos.
//   • Si rol='familiar' → residente_id obligatorio y debe pertenecer al ELEAM.
//   • Si rol='funcionario' → respeta max_funcionarios del plan.
//   • La contraseña temporal se devuelve una sola vez en la respuesta.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";
import { sendEmail, staffWelcomeEmail } from "../_shared/email.ts";
import {
  findAuthUserByEmail,
  isDuplicateAuthUserError,
} from "../_shared/authUsers.ts";

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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

// Genera contraseña de 12 chars alfanuméricos sin caracteres ambiguos (0/O/I/l/1)
function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .slice(0, 12)
    .join("");
}

async function sendStaffCredentials({
  email,
  nombre,
  tempPassword,
  eleamNombre,
  rol,
}: {
  email: string;
  nombre: string;
  tempPassword: string;
  eleamNombre: string;
  rol: string;
}) {
  const appUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://fichaeleam.cl";
  return await sendEmail({
    to: email,
    subject: `Tu acceso a FichaEleam — ${eleamNombre}`,
    html: staffWelcomeEmail({
      nombre,
      email,
      tempPassword,
      eleamNombre,
      rol,
      loginUrl: `${appUrl}/login`,
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
    const nombre = String(body.nombre ?? "").trim();
    const cleanEmail = String(body.email ?? "").trim().toLowerCase();
    const rol = String(body.rol ?? "funcionario").trim();
    const residenteId: string | null = body.residente_id
      ? String(body.residente_id).trim()
      : null;

    if (!nombre) {
      return jsonResponse(req, { error: "El nombre es obligatorio" }, 400);
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

        // Sumar invitaciones pendientes para evitar superar el límite del plan
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

    const { user: existingAuthUser, error: authLookupErr } = await findAuthUserByEmail(sb, cleanEmail);
    if (authLookupErr) {
      console.error("staff auth user lookup", authLookupErr);
      return jsonResponse(req, { error: "No se pudo validar si el correo ya existe en Auth." }, 500);
    }

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

      const emailSent = await sendStaffCredentials({
        email: cleanEmail,
        nombre,
        tempPassword,
        eleamNombre: eleam.nombre,
        rol,
      });

      return jsonResponse(req, {
        ok: true,
        repaired_existing_auth_user: true,
        temp_password: tempPassword,
        profile_id: existingAuthUser.id,
        email: cleanEmail,
        rol,
        email_sent: emailSent,
      });
    }

    // Crear usuario vía Admin API — el trigger handle_new_user crea el profile
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
      },
    });

    if (createError) {
      console.error("create-staff-user error:", createError);
      if (isDuplicateAuthUserError(createError)) {
        return jsonResponse(req, {
          error: "Este correo ya existe en Auth. Actualiza la lista y vuelve a intentarlo para reparar la cuenta, o revisa Auth > Users si el problema persiste.",
        }, 409);
      }
      return jsonResponse(req, { error: "No se pudo crear el usuario." }, 500);
    }

    const emailSent = await sendStaffCredentials({
      email: cleanEmail,
      nombre,
      tempPassword,
      eleamNombre: eleam.nombre,
      rol,
    });

    return jsonResponse(req, {
      ok: true,
      temp_password: tempPassword,
      profile_id: created.user.id,
      email: cleanEmail,
      rol,
      email_sent: emailSent,
    });
  } catch (e) {
    console.error("create-staff-user", e);
    return jsonResponse(req, { error: "Error interno", detail: String(e?.message ?? e) }, 500);
  }
});
