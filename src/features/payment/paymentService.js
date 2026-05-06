import { supabase } from "../../services/supabaseConfig";

function ensureSupabase() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

// Obtiene los planes activos visibles (vía RLS planes_select_public)
export async function getActivePlans() {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("planes")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Inicia el flujo de suscripción: llama a la Edge Function y devuelve init_point.
// El frontend redirige al usuario a esa URL para completar el pago en MP.
export async function startSubscription({ planCodigo, backUrl = "/pago/return" }) {
  const sb = ensureSupabase();
  const { data, error } = await sb.functions.invoke("mp-create-subscription", {
    body: { plan_codigo: planCodigo, back_url: backUrl },
  });
  if (error) throw new Error(error.message ?? "No se pudo iniciar el pago");
  if (data?.error) throw new Error(data.error);
  if (!data?.init_point) throw new Error("MercadoPago no devolvió URL de pago");
  return data;
}

// Cancela la suscripción del ELEAM del usuario (admin only).
export async function cancelSubscription() {
  const sb = ensureSupabase();
  const { data, error } = await sb.functions.invoke("mp-cancel-subscription", {
    body: {},
  });
  if (error) throw new Error(error.message ?? "No se pudo cancelar");
  if (data?.error) throw new Error(data.error);
  return data;
}

// Lee el historial de pagos del ELEAM del admin (RLS permite).
export async function getMyPayments() {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("pagos")
    .select("*")
    .order("fecha_pago", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
