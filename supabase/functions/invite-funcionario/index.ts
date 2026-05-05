// POST /functions/v1/invite-funcionario
//
// Body: { email: string, rol?: 'funcionario' | 'familiar', residente_id?: uuid }
//
// Crea una invitación en `funcionario_invitaciones` y devuelve la URL
// de registro `/register?invite=<token>` para enviársela al destinatario.
//
// Reglas:
//   • Solo admin_eleam puede invitar.
//   • El ELEAM debe estar con suscripción activa o en gracia.
//   • Si rol='familiar' → residente_id es obligatorio y debe pertenecer al ELEAM.
//   • Si rol='funcionario' → respeta max_funcionarios del plan.
//   • El nombre histórico del endpoint se conserva por compatibilidad.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function genToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
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
      return jsonResponse(req, { error: "Solo admin del ELEAM" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const cleanEmail = String(body.email ?? "").trim().toLowerCase();
    const rol = String(body.rol ?? "funcionario").trim();
    const residenteId: string | null = body.residente_id
      ? String(body.residente_id).trim()
      : null;

    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      return jsonResponse(req, { error: "Email inválido" }, 400);
    }
    if (!["funcionario", "familiar"].includes(rol)) {
      return jsonResponse(req, { error: "Rol inválido" }, 400);
    }
    if (rol === "familiar" && !residenteId) {
      return jsonResponse(req, {
        error: "Para invitar a un familiar debes seleccionar un residente",
      }, 400);
    }

    const sb = adminClient();

    // Estado del ELEAM
    const { data: eleam } = await sb
      .from("eleams")
      .select("id, subscription_status, plan_id, max_funcionarios, nombre")
      .eq("id", profile.eleam_id)
      .maybeSingle();
    if (!eleam) return jsonResponse(req, { error: "ELEAM no encontrado" }, 404);

    if (!["activo", "en_gracia"].includes(eleam.subscription_status)) {
      return jsonResponse(req, {
        error: "El ELEAM no tiene suscripción activa",
      }, 403);
    }

    // Si es familiar, validar que el residente pertenezca al ELEAM
    if (rol === "familiar") {
      const { data: res } = await sb
        .from("residentes")
        .select("id, eleam_id, nombre, apellido")
        .eq("id", residenteId!)
        .maybeSingle();
      if (!res || res.eleam_id !== eleam.id) {
        return jsonResponse(req, {
          error: "El residente no pertenece a tu ELEAM",
        }, 400);
      }
    }

    // Solo aplicamos el límite de plan a funcionarios (los familiares no consumen cupo)
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

        const { count: pendientes } = await sb
          .from("funcionario_invitaciones")
          .select("id", { head: true, count: "exact" })
          .eq("eleam_id", eleam.id)
          .eq("rol", "funcionario")
          .eq("usado", false)
          .gt("expira_en", new Date().toISOString());

        const total = (actuales ?? 0) + (pendientes ?? 0);
        if (total >= maxFunc) {
          return jsonResponse(req, {
            error: `El plan permite máximo ${maxFunc} funcionarios. Cancela invitaciones pendientes o actualiza el plan.`,
          }, 409);
        }
      }
    }

    // Anular invitaciones pendientes previas del mismo email/rol
    await sb
      .from("funcionario_invitaciones")
      .delete()
      .eq("eleam_id", eleam.id)
      .ilike("email", cleanEmail)
      .eq("usado", false);

    const token = genToken();
    const { error: insErr } = await sb
      .from("funcionario_invitaciones")
      .insert({
        eleam_id: eleam.id,
        email: cleanEmail,
        token,
        rol,
        residente_id: residenteId,
        creado_por: user.id,
      });
    if (insErr) {
      console.error("invitacion insert", insErr);
      return jsonResponse(req, { error: "No se pudo crear invitación" }, 500);
    }

    const baseUrl =
      Deno.env.get("PUBLIC_APP_URL")?.replace(/\/$/, "") ??
      `${new URL(req.url).origin}`;
    const invite_url = `${baseUrl}/register?invite=${token}&email=${encodeURIComponent(cleanEmail)}`;

    return jsonResponse(req, {
      ok: true,
      invite_url,
      email: cleanEmail,
      rol,
      residente_id: residenteId,
      eleam_nombre: eleam.nombre,
    });
  } catch (e) {
    console.error("invite-funcionario", e);
    return jsonResponse(req, {
      error: "Error interno", detail: String(e?.message ?? e),
    }, 500);
  }
});
