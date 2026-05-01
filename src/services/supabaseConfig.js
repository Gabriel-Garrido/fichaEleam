import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabaseConfigError = (() => {
  if (!supabaseUrl || !supabaseAnonKey) return "missing";
  try {
    new URL(supabaseUrl);
    return null;
  } catch {
    return "invalid-url";
  }
})();

export const isSupabaseConfigured = !supabaseConfigError;

let client = null;
try {
  client = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
} catch {
  client = null;
}

export const supabase = client;
