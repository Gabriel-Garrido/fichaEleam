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
    .select("id, nombre, email, rol, eleam_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return { user, profile: null, error: "Perfil no encontrado" };
  }
  return { user, profile, error: null };
}
