// POST /functions/v1/create-staff-user
//
// Body: { nombre: string, email: string, rol?: 'funcionario' | 'familiar', residente_id?: uuid }
//
// Crea un usuario directamente con contraseña temporal generada aquí.
// El trigger handle_new_user crea el profile automáticamente.
// Al iniciar sesión por primera vez, el usuario es redirigido a /cambiar-clave.
//
// Reglas:
//   • Solo admin_eleam con suscripción activa/en_gracia puede crear usuarios.
//   • Si rol='familiar' → residente_id obligatorio y debe pertenecer al ELEAM.
//   • Si rol='funcionario' → respeta max_funcionarios del plan.
//   • La contraseña temporal se devuelve una sola vez en la respuesta.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";
import { sendEmail, staffWelcomeEmail } from "../_shared/email.ts";

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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
    if (profile.rol !== "admin_eleam" || !profile.eleam_id) {
      return jsonResponse(req, { error: "Solo el administrador del ELEAM puede crear usuarios" }, 403);
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
    if (rol === "familiar" && !residenteId) {
      return jsonResponse(req, { error: "Para crear un familiar debes seleccionar un residente" }, 400);
    }

    const sb = adminClient();

    // Verificar estado del ELEAM
    const { data: eleam } = await sb
      .from("eleams")
      .select("id, subscription_status, plan_id, max_funcionarios, nombre")
      .eq("id", profile.eleam_id)
      .maybeSingle();
    if (!eleam) return jsonResponse(req, { error: "ELEAM no encontrado" }, 404);

    if (!["activo", "en_gracia"].includes(eleam.subscription_status)) {
      return jsonResponse(req, { error: "El ELEAM no tiene suscripción activa" }, 403);
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

    const tempPassword = generatePassword();

    // Crear usuario vía Admin API — el trigger handle_new_user crea el profile
    const { data: created, error: createError } = await sb.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        nombre,
        must_reset_password: true,
        eleam_id_direct: profile.eleam_id,
        rol_direct: rol,
        ...(rol === "familiar" && residenteId ? { residente_id_direct: residenteId } : {}),
      },
    });

    if (createError) {
      console.error("create-staff-user error:", createError);
      if (
        createError.message?.toLowerCase().includes("already been registered") ||
        createError.message?.toLowerCase().includes("already registered") ||
        createError.message?.toLowerCase().includes("duplicate")
      ) {
        return jsonResponse(req, { error: "Este correo ya tiene una cuenta registrada." }, 409);
      }
      return jsonResponse(req, { error: "No se pudo crear el usuario." }, 500);
    }

    // Enviar email de bienvenida si Resend está configurado
    const appUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://fichaeleam.cl";
    const emailSent = await sendEmail({
      to: cleanEmail,
      subject: `Tu acceso a FichaEleam — ${eleam.nombre}`,
      html: staffWelcomeEmail({
        nombre,
        email: cleanEmail,
        tempPassword,
        eleamNombre: eleam.nombre,
        rol,
        loginUrl: `${appUrl}/login`,
      }),
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
