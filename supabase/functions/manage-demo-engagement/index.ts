import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getCallerProfile } from "../_shared/supabase.ts";
import {
  demoRecoveryEmail,
  demoRestartInvitationCopy,
  demoRestartInvitationEmail,
  sendEmail,
  type DemoAccessMethod,
} from "../_shared/email.ts";
import { generateAccessLink, getAppUrl, GMAIL_RE, UUID_RE } from "../_shared/provisioning.ts";
import {
  canSendDemoRecovery,
  daysSince,
  DEMO_REACTIVATION_DAYS,
  DEMO_RESTART_DAYS,
  hasPaidPlan,
  isDemoAccessActive,
  recoveryEmailIsCoolingDown,
} from "./demoEngagement.ts";

const RECOVERY_MARKER = "[RECUPERACION_DEMO]";

function fail(req: Request, message: string, status = 400, code = "demo_engagement_error") {
  return jsonResponse(req, { ok: false, code, message }, status);
}

async function getLastRecoveryByEleam(sb: ReturnType<typeof adminClient>, eleamIds: string[]) {
  if (!eleamIds.length) return new Map<string, string>();
  const { data, error } = await sb.from("crm_interactions")
    .select("eleam_id, creado_en")
    .in("eleam_id", eleamIds)
    .eq("tipo", "correo")
    .like("resumen", `${RECOVERY_MARKER}%`)
    .order("creado_en", { ascending: false })
    .limit(1000);
  if (error) throw error;
  const result = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.eleam_id && !result.has(row.eleam_id)) result.set(row.eleam_id, row.creado_en);
  }
  return result;
}

async function getDemoContext(sb: ReturnType<typeof adminClient>, eleamId: string) {
  const { data: eleam, error: eleamError } = await sb.from("eleams")
    .select("id, nombre, plan, pago_activo, subscription_status, fecha_vencimiento_suscripcion")
    .eq("id", eleamId)
    .maybeSingle();
  if (eleamError) throw eleamError;
  if (!eleam) return { error: "No encontramos el ELEAM solicitado." } as const;
  if (hasPaidPlan(eleam.plan)) return { error: "Este ELEAM ya tiene un plan de pago y no puede reiniciar un demo." } as const;

  const { data: admin, error: profileError } = await sb.from("profiles")
    .select("id, nombre, email, creado_en")
    .eq("eleam_id", eleamId)
    .eq("rol", "admin_eleam")
    .eq("acceso_activo", true)
    .order("creado_en", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!admin?.email) return { error: "El demo no tiene un administrador activo con correo." } as const;
  const { data: authData, error: authError } = await sb.auth.admin.getUserById(admin.id);
  if (authError || !authData.user) return { error: "No pudimos consultar el acceso del administrador demo." } as const;
  return { eleam, admin, authUser: authData.user } as const;
}

async function getAuthUsersById(sb: ReturnType<typeof adminClient>, ids: string[]) {
  const pending = new Set(ids);
  const found = new Map<string, { last_sign_in_at?: string | null }>();
  const perPage = 1000;
  for (let page = 1; page <= 20 && pending.size > 0; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const authUser of data.users ?? []) {
      if (!pending.has(authUser.id)) continue;
      found.set(authUser.id, authUser);
      pending.delete(authUser.id);
    }
    if ((data.users ?? []).length < perPage) break;
  }
  return found;
}

async function listDemoStatuses(sb: ReturnType<typeof adminClient>) {
  const { data: allEleams, error: eleamError } = await sb.from("eleams")
    .select("id, nombre, plan, pago_activo, subscription_status, fecha_vencimiento_suscripcion")
    .order("creado_en", { ascending: false });
  if (eleamError) throw eleamError;
  const eleams = (allEleams ?? []).filter((item) => !hasPaidPlan(item.plan));
  const ids = (eleams ?? []).map((item) => item.id);
  if (!ids.length) return [];

  const [{ data: profiles, error: profilesError }, lastRecovery] = await Promise.all([
    sb.from("profiles").select("id, eleam_id, nombre, email, creado_en")
      .in("eleam_id", ids).eq("rol", "admin_eleam").eq("acceso_activo", true)
      .order("creado_en", { ascending: true }),
    getLastRecoveryByEleam(sb, ids),
  ]);
  if (profilesError) throw profilesError;
  const adminByEleam = new Map<string, typeof profiles[number]>();
  for (const profile of profiles ?? []) if (!adminByEleam.has(profile.eleam_id)) adminByEleam.set(profile.eleam_id, profile);
  const authUsersById = await getAuthUsersById(sb, [...adminByEleam.values()].map((profile) => profile.id));

  return (eleams ?? []).map((eleam) => {
    const admin = adminByEleam.get(eleam.id);
    const authUser = admin ? authUsersById.get(admin.id) : null;
    const lastSignInAt = authUser?.last_sign_in_at ?? null;
    const lastRecoveryEmailAt = lastRecovery.get(eleam.id) ?? null;
    const accessActive = isDemoAccessActive(eleam);
    const inactiveDays = daysSince(lastSignInAt);
    return {
      eleam_id: eleam.id,
      admin_profile_id: admin?.id ?? null,
      admin_email: admin?.email ?? null,
      last_sign_in_at: lastSignInAt,
      never_signed_in: Boolean(admin && authUser && !lastSignInAt),
      inactive_days: inactiveDays,
      access_active: accessActive,
      needs_reactivation: Boolean(admin && authUser) && !accessActive,
      account_available: Boolean(admin && authUser),
      can_restart_demo: Boolean(admin && authUser),
      restart_invitation_cooling_down: recoveryEmailIsCoolingDown(lastRecoveryEmailAt),
      last_recovery_email_at: lastRecoveryEmailAt,
      can_send_recovery: Boolean(admin && authUser)
        && accessActive
        && canSendDemoRecovery(lastSignInAt)
        && !recoveryEmailIsCoolingDown(lastRecoveryEmailAt),
    };
  });
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail(req, "Método no permitido.", 405, "method_not_allowed");

  try {
    const { user, profile, error } = await getCallerProfile(req);
    if (error || !user || !profile) return fail(req, "No autenticado.", 401, "unauthenticated");
    if (profile.rol !== "superadmin") return fail(req, "Solo Superadmin puede gestionar demos.", 403, "forbidden");
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "list");
    const sb = adminClient();

    if (action === "list") {
      return jsonResponse(req, { ok: true, items: await listDemoStatuses(sb) });
    }

    const eleamId = String(body.eleam_id ?? "").trim();
    if (!UUID_RE.test(eleamId)) return fail(req, "ELEAM inválido.", 400, "validation_error");
    const context = await getDemoContext(sb, eleamId);
    if ("error" in context && typeof context.error === "string") {
      return fail(req, context.error, 409, "invalid_demo");
    }
    const { eleam, admin, authUser } = context;

    if (action === "preview_restart_invitation") {
      const accessMethod: DemoAccessMethod = GMAIL_RE.test(admin.email) ? "google" : "password";
      return jsonResponse(req, {
        ok: true,
        action,
        preview: {
          to: admin.email,
          days: DEMO_RESTART_DAYS,
          access_method: accessMethod,
          ...demoRestartInvitationCopy({
            nombre: admin.nombre || "Hola",
            eleamNombre: eleam.nombre,
            accessMethod,
          }),
        },
      });
    }

    if (action === "restart_invitation") {
      const lastRecovery = (await getLastRecoveryByEleam(sb, [eleamId])).get(eleamId) ?? null;
      if (recoveryEmailIsCoolingDown(lastRecovery)) {
        return fail(req, "Ya se envió una invitación durante las últimas 24 horas.", 429, "email_cooldown");
      }
      const accessMethod: DemoAccessMethod = GMAIL_RE.test(admin.email) ? "google" : "password";
      const linkResult = accessMethod === "google"
        ? { link: `${getAppUrl()}/login`, error: null }
        : await generateAccessLink(sb, admin.email);
      if (!linkResult.link) return fail(req, linkResult.error ?? "No se pudo generar el acceso.", 502, "access_link_error");

      const expiresAt = new Date(Date.now() + DEMO_RESTART_DAYS * 86400000).toISOString();
      const { error: updateError } = await sb.from("eleams").update({
        plan: "demo",
        pago_activo: true,
        subscription_status: "activo",
        fecha_vencimiento_suscripcion: expiresAt,
        crm_estado: "prueba",
      }).eq("id", eleamId);
      if (updateError) throw updateError;

      const copy = demoRestartInvitationCopy({
        nombre: admin.nombre || "Hola",
        eleamNombre: eleam.nombre,
        accessMethod,
      });
      const emailResult = await sendEmail({
        to: admin.email,
        subject: copy.subject,
        html: demoRestartInvitationEmail({
          nombre: admin.nombre || "Hola",
          email: admin.email,
          eleamNombre: eleam.nombre,
          accessMethod,
          accessUrl: linkResult.link,
        }),
        replyTo: "soporte@fichaeleam.cl",
      });
      if (!emailResult.sent) return fail(req, "El demo fue reiniciado, pero el correo no pudo enviarse. Intenta nuevamente.", 502, "email_failed");

      const now = new Date().toISOString();
      const [{ error: leadError }, { error: interactionError }, { error: contactError }] = await Promise.all([
        sb.from("demo_leads").update({ estado: "demo_activo", demo_expires_at: expiresAt }).eq("demo_user_id", admin.id),
        sb.from("crm_interactions").insert({
          eleam_id: eleamId,
          tipo: "correo",
          canal: "email",
          resumen: `${RECOVERY_MARKER} Demo reiniciado por ${DEMO_RESTART_DAYS} días e invitación enviada a ${admin.email}`,
          resultado: "positivo",
          creado_por: user.id,
        }),
        sb.from("eleams").update({ ultimo_contacto: now }).eq("id", eleamId),
      ]);
      if (leadError) console.error("demo_leads restart sync", leadError);
      if (interactionError) console.error("demo restart interaction", interactionError);
      if (contactError) console.error("demo restart last contact", contactError);
      return jsonResponse(req, {
        ok: true,
        action,
        email: admin.email,
        expires_at: expiresAt,
        days: DEMO_RESTART_DAYS,
        sent_at: now,
      });
    }

    if (action === "send_recovery") {
      if (eleam.plan !== "demo") return fail(req, "Este ELEAM todavía no tiene un demo habilitado.", 409, "invalid_demo");
      if (!isDemoAccessActive(eleam)) return fail(req, "Reactiva el demo antes de enviar el correo.", 409, "reactivation_required");
      if (!canSendDemoRecovery(authUser.last_sign_in_at)) return fail(req, "El administrador ingresó durante los últimos 10 días.", 409, "recent_login");
      const lastRecovery = (await getLastRecoveryByEleam(sb, [eleamId])).get(eleamId) ?? null;
      if (recoveryEmailIsCoolingDown(lastRecovery)) return fail(req, "Ya se envió un correo durante las últimas 24 horas.", 429, "email_cooldown");

      const accessMethod: DemoAccessMethod = GMAIL_RE.test(admin.email) ? "google" : "password";
      const linkResult = accessMethod === "google"
        ? { link: `${getAppUrl()}/login`, error: null }
        : await generateAccessLink(sb, admin.email);
      if (!linkResult.link) return fail(req, linkResult.error ?? "No se pudo generar el acceso.", 502, "access_link_error");
      const emailResult = await sendEmail({
        to: admin.email,
        subject: `${admin.nombre || "Tu equipo"}, retoma la demo de FichaEleam sin comenzar de cero`,
        html: demoRecoveryEmail({
          nombre: admin.nombre || "Hola",
          email: admin.email,
          eleamNombre: eleam.nombre,
          accessMethod,
          accessUrl: linkResult.link,
        }),
        replyTo: "soporte@fichaeleam.cl",
      });
      if (!emailResult.sent) return fail(req, "El correo no pudo enviarse. Intenta nuevamente.", 502, "email_failed");

      const now = new Date().toISOString();
      await Promise.all([
        sb.from("crm_interactions").insert({
          eleam_id: eleamId,
          tipo: "correo",
          canal: "email",
          resumen: `${RECOVERY_MARKER} Correo para retomar el demo enviado a ${admin.email}`,
          resultado: "positivo",
          creado_por: user.id,
        }),
        sb.from("eleams").update({ ultimo_contacto: now }).eq("id", eleamId),
      ]);
      return jsonResponse(req, { ok: true, action, email: admin.email, sent_at: now });
    }

    if (action === "reactivate") {
      if (eleam.plan !== "demo") return fail(req, "Este ELEAM todavía no tiene un demo habilitado.", 409, "invalid_demo");
      if (isDemoAccessActive(eleam)) return fail(req, "El demo todavía está activo; no necesita reactivación.", 409, "already_active");
      const expiresAt = new Date(Date.now() + DEMO_REACTIVATION_DAYS * 86400000).toISOString();
      const { error: updateError } = await sb.from("eleams").update({
        pago_activo: true,
        subscription_status: "activo",
        fecha_vencimiento_suscripcion: expiresAt,
        crm_estado: "prueba",
      }).eq("id", eleamId).eq("plan", "demo");
      if (updateError) throw updateError;
      await Promise.all([
        sb.from("demo_leads").update({ estado: "demo_activo", demo_expires_at: expiresAt }).eq("demo_user_id", admin.id),
        sb.from("crm_interactions").insert({
          eleam_id: eleamId,
          tipo: "sistema",
          canal: "sistema",
          resumen: `Demo reactivado por ${DEMO_REACTIVATION_DAYS} días`,
          resultado: "sistema",
          creado_por: user.id,
        }),
      ]);
      return jsonResponse(req, { ok: true, action, expires_at: expiresAt, days: DEMO_REACTIVATION_DAYS });
    }

    return fail(req, "Acción no reconocida.", 400, "validation_error");
  } catch (error) {
    console.error("manage-demo-engagement", error);
    return fail(req, "No se pudo completar la gestión del demo.", 500, "internal_error");
  }
});
