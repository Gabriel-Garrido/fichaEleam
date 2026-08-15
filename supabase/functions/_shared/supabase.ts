// Helpers para crear clientes Supabase dentro de Edge Functions.
//
//   • adminClient(): usa SERVICE_ROLE_KEY → bypass RLS.
//     Solo para operaciones del backend (webhook, invitaciones).
//
//   • userClient(req): cliente con el JWT del usuario llamante.
//     Respeta RLS — usar para verificar identidad del caller.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL/SERVICE_ROLE_KEY no configurados");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function userClient(req: Request): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("SUPABASE_URL/ANON_KEY no configurados");
  const auth = req.headers.get("Authorization") ?? "";
  return createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getCallerProfile(req: Request) {
  const sb = userClient(req);
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr || !user) {
    return { user: null, profile: null, error: "No autenticado" };
  }

  // Use admin client to read profile — RLS allows users to read their own profile,
  // but using admin avoids any policy edge case.
  const admin = adminClient();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, nombre, email, rol, eleam_id, acceso_activo")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr || !profile || profile.acceso_activo === false) {
    return { user, profile: null, error: "Perfil no encontrado" };
  }
  return { user, profile, error: null };
}

type EleamAccessState = {
  plan?: string | null;
  subscription_status?: string | null;
  pago_activo?: boolean | null;
  fecha_vencimiento_suscripcion?: string | null;
};

export function hasOperationalAccess(eleam: EleamAccessState | null): boolean {
  if (!eleam) return false;
  if (eleam.pago_activo === true) return true;
  if (["activo", "en_gracia"].includes(String(eleam.subscription_status ?? ""))) return true;

  const validUntil = eleam.fecha_vencimiento_suscripcion
    ? new Date(eleam.fecha_vencimiento_suscripcion)
    : null;
  const isWithinValidPeriod = validUntil instanceof Date
    && !Number.isNaN(validUntil.valueOf())
    && validUntil > new Date();

  return isWithinValidPeriod && (
    eleam.subscription_status === "cancelado"
    || (eleam.plan === "demo" && eleam.subscription_status === "pendiente")
  );
}

export async function eleamHasOperationalAccess(eleamId: string): Promise<boolean> {
  const admin = adminClient();
  const { data: eleam, error } = await admin
    .from("eleams")
    .select("plan, subscription_status, pago_activo, fecha_vencimiento_suscripcion")
    .eq("id", eleamId)
    .maybeSingle();
  return !error && hasOperationalAccess(eleam);
}
