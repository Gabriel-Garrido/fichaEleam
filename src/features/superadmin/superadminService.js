import { supabase } from "../../services/supabaseConfig";

export async function getMetrics() {
  const thisMonthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();

  const [eleamsRes, residentsRes, pagosRes] = await Promise.allSettled([
    supabase.from("eleams").select("id, pago_activo, plan, creado_en"),
    supabase.from("residentes").select("id, estado"),
    supabase
      .from("pagos")
      .select("monto, fecha_pago, estado")
      .gte("fecha_pago", thisMonthStart)
      .eq("estado", "completado"),
  ]);

  const eleams =
    eleamsRes.status === "fulfilled" ? (eleamsRes.value.data ?? []) : [];
  const residents =
    residentsRes.status === "fulfilled" ? (residentsRes.value.data ?? []) : [];
  const pagos =
    pagosRes.status === "fulfilled" ? (pagosRes.value.data ?? []) : [];

  const thisMonth = new Date(thisMonthStart);

  return {
    totalEleams: eleams.length,
    activeSubscriptions: eleams.filter((e) => e.pago_activo).length,
    demoEleams: eleams.filter((e) => !e.pago_activo).length,
    newEleamsThisMonth: eleams.filter(
      (e) => new Date(e.creado_en) >= thisMonth
    ).length,
    totalResidents: residents.length,
    activeResidents: residents.filter((r) => r.estado === "activo").length,
    mrrCLP: pagos.reduce((sum, p) => sum + (p.monto ?? 0), 0),
  };
}

export async function getAllEleams() {
  const { data, error } = await supabase
    .from("eleams")
    .select("*")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateEleam(id, payload) {
  const { data, error } = await supabase
    .from("eleams")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRecentPayments(limit = 20) {
  const { data, error } = await supabase
    .from("pagos")
    .select("*, eleams(nombre)")
    .order("fecha_pago", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function registerPayment(payload) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("pagos")
    .insert({ ...payload, registrado_por: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getEleamResidentCount(eleamId) {
  const { count, error } = await supabase
    .from("residentes")
    .select("id", { count: "exact", head: true })
    .eq("eleam_id", eleamId);
  if (error) return 0;
  return count ?? 0;
}
