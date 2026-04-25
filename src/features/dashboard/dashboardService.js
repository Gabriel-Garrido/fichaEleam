import { supabase } from "../../services/supabaseConfig";
import { getAccreditationProgress } from "../accreditation/accreditationService";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function getResidentStats() {
  const { data, error } = await supabase.from("residentes").select("estado");
  if (error) throw error;
  const rows = data ?? [];
  return {
    total:          rows.length,
    activos:        rows.filter((r) => r.estado === "activo").length,
    hospitalizados: rows.filter((r) => r.estado === "hospitalizado").length,
    egresados:      rows.filter((r) => r.estado === "egresado").length,
    fallecidos:     rows.filter((r) => r.estado === "fallecido").length,
  };
}

async function getTodayVitalSignsCount() {
  const { count, error } = await supabase
    .from("signos_vitales")
    .select("id", { count: "exact", head: true })
    .gte("fecha_hora", startOfToday())
    .lt("fecha_hora", startOfTomorrow());
  if (error) throw error;
  return count ?? 0;
}

async function getTodayObservationsCount() {
  const { count, error } = await supabase
    .from("observaciones_diarias")
    .select("id", { count: "exact", head: true })
    .gte("fecha_hora", startOfToday())
    .lt("fecha_hora", startOfTomorrow());
  if (error) throw error;
  return count ?? 0;
}

export async function getPendingFollowUps(limit = 10) {
  const { data, error } = await supabase
    .from("observaciones_diarias")
    .select("id, residente_id, fecha_hora, tipo, descripcion, residentes(nombre, apellido)")
    .eq("requiere_seguimiento", true)
    .order("fecha_hora", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getExpiringDocuments(daysAhead = 30) {
  const today    = new Date().toISOString().slice(0, 10);
  const deadline = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("documentos_acreditacion")
    .select("id, nombre, fecha_vencimiento, estado, categoria_id, categorias_acreditacion(nombre, codigo)")
    .gte("fecha_vencimiento", today)
    .lte("fecha_vencimiento", deadline)
    .not("estado", "in", "(rechazado,vencido)")
    .order("fecha_vencimiento", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function loadDashboard() {
  const [
    residentStatsResult,
    signosHoyResult,
    observacionesHoyResult,
    followUpsResult,
    expiringResult,
    acreditacionResult,
  ] = await Promise.allSettled([
    getResidentStats(),
    getTodayVitalSignsCount(),
    getTodayObservationsCount(),
    getPendingFollowUps(),
    getExpiringDocuments(30),
    getAccreditationProgress(),
  ]);

  const ok = (r) => r.status === "fulfilled";

  return {
    residentStats:       ok(residentStatsResult)  ? residentStatsResult.value  : null,
    signosHoy:           ok(signosHoyResult)       ? signosHoyResult.value       : 0,
    observacionesHoy:    ok(observacionesHoyResult)? observacionesHoyResult.value: 0,
    pendingFollowUps:    ok(followUpsResult)       ? followUpsResult.value       : [],
    expiringDocuments:   ok(expiringResult)        ? expiringResult.value        : [],
    acreditacionProgress:ok(acreditacionResult)   ? acreditacionResult.value    : [],
    errors: {
      residentStats:    !ok(residentStatsResult),
      actividad:        !ok(signosHoyResult) || !ok(observacionesHoyResult),
      followUps:        !ok(followUpsResult),
      expiring:         !ok(expiringResult),
      acreditacion:     !ok(acreditacionResult),
    },
  };
}
