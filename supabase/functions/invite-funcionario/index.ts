// POST /functions/v1/invite-funcionario
//
// Body: { email: string }
//
// Crea una invitación en `funcionario_invitaciones` y devuelve la URL
// de registro `/register?invite=<token>` para enviársela al funcionario.
//
// Reglas:
//   • Solo admin_eleam puede invitar.
//   • El ELEAM debe estar con suscripción activa o en gracia.
//   • Respeta el límite max_funcionarios del plan (chequeo proactivo;
//     el trigger en profiles es la barrera definitiva al hacer signup).

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

    const { email } = await req.json().catch(() => ({}));
    const cleanEmail = String(email ?? "").trim().toLowerCase();
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      return jsonResponse(req, { error: "Email inválido" }, 400);
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

    // Contar funcionarios actuales y límite del plan
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
        .eq("usado", false)
        .gt("expira_en", new Date().toISOString());

      const total = (actuales ?? 0) + (pendientes ?? 0);
      if (total >= maxFunc) {
        return jsonResponse(req, {
          error: `El plan permite máximo ${maxFunc} funcionarios. Cancela invitaciones pendientes o actualiza el plan.`,
        }, 409);
      }
    }

    // Anular invitaciones pendientes previas para el mismo email
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
      eleam_nombre: eleam.nombre,
    });
  } catch (e) {
    console.error("invite-funcionario", e);
    return jsonResponse(req, {
      error: "Error interno", detail: String(e?.message ?? e),
    }, 500);
  }
});
