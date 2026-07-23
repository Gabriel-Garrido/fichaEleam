// Actualiza los datos editables de un funcionario o envía su recuperación de contraseña.
// Solo el admin del mismo ELEAM puede ejecutar estas acciones. El correo es inmutable.

import { preflight, jsonResponse, internalErrorResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";
import { sendEmail, staffPasswordRecoveryEmail } from "../_shared/email.ts";
import { generateAccessLink, UUID_RE } from "../_shared/provisioning.ts";

function cleanText(value: unknown, max: number): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function normalizePhone(value: unknown): string {
  return cleanText(value, 40).replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonResponse(req, { error: "Método no permitido" }, 405);

  try {
    const { profile, error } = await getCallerProfile(req);
    if (error || !profile) return jsonResponse(req, { error: "No autenticado" }, 401);
    if (profile.rol !== "admin_eleam" || !profile.eleam_id) {
      return jsonResponse(req, { error: "Solo el administrador puede gestionar funcionarios" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const profileId = cleanText(body.profile_id, 36);
    const action = cleanText(body.action, 30);
    if (!UUID_RE.test(profileId)) return jsonResponse(req, { error: "Funcionario inválido" }, 400);
    if (!["update", "reset_password"].includes(action)) return jsonResponse(req, { error: "Acción inválida" }, 400);

    const sb = adminClient();
    const { data: target, error: targetError } = await sb
      .from("profiles")
      .select("id, nombre, email, telefono, rol, eleam_id")
      .eq("id", profileId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return jsonResponse(req, { error: "Funcionario no encontrado" }, 404);
    if (target.eleam_id !== profile.eleam_id || target.rol !== "funcionario") {
      return jsonResponse(req, { error: "No puedes modificar este usuario" }, 403);
    }

    if (action === "reset_password") {
      const { data: eleam } = await sb.from("eleams").select("nombre").eq("id", profile.eleam_id).single();
      const linkResult = await generateAccessLink(sb, target.email);
      if (!linkResult.link) return jsonResponse(req, { error: "No se pudo generar el enlace de recuperación" }, 500);
      const emailResult = await sendEmail({
        to: target.email,
        subject: "Restablece tu contraseña de FichaEleam",
        html: staffPasswordRecoveryEmail({
          nombre: target.nombre || target.email,
          eleamNombre: eleam?.nombre || "tu ELEAM",
          recoveryUrl: linkResult.link,
        }),
      });
      if (!emailResult.sent) {
        console.error("update-staff-user recovery email", emailResult.error);
        return jsonResponse(req, { error: "No se pudo enviar el correo de recuperación" }, 502);
      }
      return jsonResponse(req, { ok: true, email_sent: true });
    }

    const nombre = cleanText(body.nombre, 160);
    const telefono = normalizePhone(body.telefono);
    const cargo = cleanText(body.cargo, 120);
    const tipoDotacion = cleanText(body.tipo_dotacion, 40);
    const activo = body.activo !== false;
    if (nombre.length < 2) return jsonResponse(req, { error: "Ingresa un nombre válido" }, 400);
    if (!tipoDotacion) return jsonResponse(req, { error: "Selecciona la función en el equipo" }, 400);

    const { error: profileUpdateError } = await sb.from("profiles").update({
      nombre,
      telefono: telefono || null,
    }).eq("id", profileId);
    if (profileUpdateError) throw profileUpdateError;

    const { data: staff, error: staffUpdateError } = await sb.from("staff_members").update({
      nombre,
      telefono: telefono || null,
      cargo: cargo || null,
      tipo_dotacion: tipoDotacion,
      activo,
      actualizado_en: new Date().toISOString(),
    }).eq("profile_id", profileId).eq("eleam_id", profile.eleam_id).select("id").maybeSingle();
    if (staffUpdateError) throw staffUpdateError;
    if (!staff) return jsonResponse(req, { error: "No se encontró la ficha del funcionario" }, 404);

    const { data: authUser } = await sb.auth.admin.getUserById(profileId);
    const currentMetadata = authUser?.user?.user_metadata && typeof authUser.user.user_metadata === "object"
      ? authUser.user.user_metadata
      : {};
    const { error: authUpdateError } = await sb.auth.admin.updateUserById(profileId, {
      user_metadata: { ...currentMetadata, nombre, telefono: telefono || null },
    });
    if (authUpdateError) console.warn("No se pudo sincronizar user_metadata", authUpdateError);

    return jsonResponse(req, { ok: true });
  } catch (error) {
    console.error("update-staff-user", error);
    return internalErrorResponse(req);
  }
});
