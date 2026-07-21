import { supabase } from "./supabaseConfig";

// Contexto de sesión compartido por todos los servicios de features.
//
// Antes cada *Service.js duplicaba ensureSupabase() + getCtx() y ejecutaba
// auth.getUser() + un SELECT a profiles EN CADA llamada. Este módulo cachea
// el contexto por sesión (userId/eleamId/rol no cambian mientras dura la
// sesión) y lo invalida automáticamente en los eventos de auth.

export function ensureSupabase() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

let cached = null;
let inflight = null;

export function clearServiceContextCache() {
  cached = null;
  inflight = null;
}

supabase?.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
    clearServiceContextCache();
  }
});

// Contexto genérico: { sb, userId, eleamId, rol }. eleamId puede ser null
// (superadmin operador). Para servicios de features usar getEleamContext().
export async function getServiceContext({ fresh = false } = {}) {
  const sb = ensureSupabase();
  if (!fresh && cached) return { sb, ...cached };
  if (!fresh && inflight) return inflight;

  inflight = (async () => {
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("No autenticado.");
      const { data, error } = await sb
        .from("profiles")
        .select("id, eleam_id, rol")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Perfil no encontrado.");
      cached = { userId: user.id, eleamId: data.eleam_id ?? null, rol: data.rol };
      return { sb, ...cached };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// Contexto de feature multi-tenant: garantiza eleamId presente.
export async function getEleamContext() {
  const ctx = await getServiceContext();
  if (!ctx.eleamId) throw new Error("ELEAM no encontrado para este usuario.");
  return ctx;
}
