import { supabase } from "../../services/supabaseConfig";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }
  return supabase;
}

export async function requestDemoLead(payload) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("request_demo_lead", payload);
  if (error) throw error;
  return data ?? null;
}
