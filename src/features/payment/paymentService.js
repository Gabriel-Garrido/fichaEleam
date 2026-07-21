import { ensureSupabase } from "../../services/serviceContext";
import { throwEdgeFunctionError } from "../../services/edgeFunctionErrors";

const PLAN_SELECT = `
  id, codigo, nombre, descripcion, precio_clp,
  max_residentes, max_funcionarios,
  activo, orden, destacado, creado_en
`;

const PAYMENT_SELECT = `
  id, eleam_id, plan_id, monto, moneda, plan,
  fecha_pago, fecha_inicio, fecha_fin, metodo_pago,
  referencia_externa, estado, notas,
  mp_payment_id, mp_preapproval_id, mp_authorized_payment_id, creado_en
`;


// Obtiene los planes activos visibles (vía RLS planes_select_public)
export async function getActivePlans() {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("planes")
    .select(PLAN_SELECT)
    .eq("activo", true)
    .order("orden", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Inicia el flujo de suscripción: llama a la Edge Function y devuelve init_point.
// El frontend redirige al usuario a esa URL para completar el pago en MP.
export async function startSubscription({ planCodigo }) {
  const sb = ensureSupabase();
  const { data, error } = await sb.functions.invoke("mp-create-subscription", {
    body: { plan_codigo: planCodigo },
  });
  if (error) await throwEdgeFunctionError(error, "No se pudo iniciar el pago");
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
  if (error) await throwEdgeFunctionError(error, "No se pudo cancelar");
  if (data?.error) throw new Error(data.error);
  return data;
}

// Lee el historial de pagos del ELEAM del admin (RLS permite).
export async function getMyPayments() {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("pagos")
    .select(PAYMENT_SELECT)
    .order("fecha_pago", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMyPlanUsage(eleamId) {
  if (!eleamId) return { residents: 0, staff: 0 };
  const sb = ensureSupabase();
  const [residentsRes, staffRes, invitesRes] = await Promise.all([
    sb
      .from("residentes")
      .select("id", { count: "exact", head: true })
      .eq("eleam_id", eleamId)
      .in("estado", ["activo", "hospitalizado"]),
    sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("eleam_id", eleamId)
      .eq("rol", "funcionario"),
    sb
      .from("funcionario_invitaciones")
      .select("id", { count: "exact", head: true })
      .eq("eleam_id", eleamId)
      .eq("rol", "funcionario")
      .eq("usado", false)
      .gt("expira_en", new Date().toISOString()),
  ]);

  if (residentsRes.error) throw residentsRes.error;
  if (staffRes.error) throw staffRes.error;
  if (invitesRes.error) throw invitesRes.error;

  return {
    residents: residentsRes.count ?? 0,
    staff: (staffRes.count ?? 0) + (invitesRes.count ?? 0),
  };
}
