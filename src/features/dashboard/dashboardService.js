import { supabase } from "../../services/supabaseConfig";
import {
  getRequisitosEleam,
  getObservaciones,
  buildResumen,
} from "../accreditation/accreditationService";
import { currentTurno, getCareTaskSummary, todayIso } from "../carePlans/carePlansService";
import { getEmarSummary } from "../emar/emarService";
import { calcAge } from "../residents/residentUtils";
import { getBedOccupancySummary } from "../beds/bedsService";
import { withResidentLocation } from "../beds/bedsUtils";

// Resumen para el dashboard del ELEAM: porcentaje global, por ámbito,
// totales clave y un puñado de alertas.
async function getAccreditationSummary() {
  const [requisitos, obs] = await Promise.all([
    getRequisitosEleam(),
    getObservaciones({ soloAbiertas: true }),
  ]);
  const resumen = buildResumen(requisitos);
  return {
    porcentaje:     resumen.porcentaje,
    ambitos:        resumen.ambitos,
    total:          resumen.total,
    pendientes:     resumen.pendientes,
    vencidos:       resumen.vencidos,
    porVencer:      resumen.porVencer,
    cumple:         resumen.cumple,
    noAplica:       resumen.noAplica,
    observaciones:  obs ?? [],
  };
}

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

function startOfDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function getResidentStats() {
  const { data, error } = await supabase
    .from("residentes")
    .select("estado, sexo, fecha_nacimiento, nivel_dependencia");
  if (error) throw error;
  const rows = data ?? [];
  const ages = rows
    .map((r) => calcAge(r.fecha_nacimiento))
    .filter((a) => a != null);
  const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null;
  const dependencia = { leve: 0, moderado: 0, severo: 0, total: 0, sin_clasificar: 0 };
  for (const r of rows) {
    if (r.estado !== "activo") continue;
    const k = r.nivel_dependencia ?? "sin_clasificar";
    dependencia[k] = (dependencia[k] ?? 0) + 1;
  }
  const sexos = { femenino: 0, masculino: 0, otro: 0 };
  for (const r of rows) {
    if (r.estado !== "activo") continue;
    const s = (r.sexo || "otro").toLowerCase();
    sexos[s] = (sexos[s] ?? 0) + 1;
  }
  return {
    total:          rows.length,
    activos:        rows.filter((r) => r.estado === "activo").length,
    hospitalizados: rows.filter((r) => r.estado === "hospitalizado").length,
    egresados:      rows.filter((r) => r.estado === "egresado").length,
    fallecidos:     rows.filter((r) => r.estado === "fallecido").length,
    edadPromedio:   avgAge,
    dependencia,
    sexos,
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

// Cuenta signos + observaciones del día agrupados por turno (para conocer
// cuán cubierto está cada turno).
async function getTodayActivityByShift() {
  const [vs, obs] = await Promise.all([
    supabase
      .from("signos_vitales")
      .select("turno")
      .gte("fecha_hora", startOfToday())
      .lt("fecha_hora", startOfTomorrow()),
    supabase
      .from("observaciones_diarias")
      .select("turno")
      .gte("fecha_hora", startOfToday())
      .lt("fecha_hora", startOfTomorrow()),
  ]);
  if (vs.error) throw vs.error;
  if (obs.error) throw obs.error;
  const out = {
    mañana: { signos: 0, observaciones: 0 },
    tarde:  { signos: 0, observaciones: 0 },
    noche:  { signos: 0, observaciones: 0 },
  };
  for (const r of vs.data ?? []) {
    if (r.turno && out[r.turno]) out[r.turno].signos++;
  }
  for (const r of obs.data ?? []) {
    if (r.turno && out[r.turno]) out[r.turno].observaciones++;
  }
  return out;
}

// Para cada residente activo, devuelve su último signo vital (si existe).
// Esto permite calcular el estado clínico actual del piso.
export async function getActiveResidentsLatestVitals() {
  const { data: residentes, error: errR } = await supabase
    .from("residentes")
    .select(`
      id, nombre, apellido, nivel_dependencia, alergias, cama_actual_id,
      cama_actual:camas!residentes_cama_actual_id_fkey(
        id, codigo, nombre, tipo, estado,
        habitacion:habitaciones!camas_habitacion_id_fkey(id, codigo, nombre, piso, sector, estado)
      )
    `)
    .eq("estado", "activo")
    .order("apellido", { ascending: true });
  if (errR) throw errR;

  const ids = (residentes ?? []).map((r) => r.id);
  if (!ids.length) return [];

  // Pedimos los últimos 7 días de signos para esos residentes y nos quedamos
  // con el más reciente por residente en JS (más simple que un window function).
  const since = startOfDaysAgo(7);
  const { data: signos, error: errS } = await supabase
    .from("signos_vitales")
    .select("residente_id, fecha_hora, presion_sistolica, presion_diastolica, frecuencia_cardiaca, frecuencia_respiratoria, temperatura, saturacion_oxigeno, glucosa, dolor_escala, turno")
    .in("residente_id", ids)
    .gte("fecha_hora", since)
    .order("fecha_hora", { ascending: false });
  if (errS) throw errS;

  const latestBy = {};
  for (const s of signos ?? []) {
    if (!latestBy[s.residente_id]) latestBy[s.residente_id] = s;
  }
  return residentes.map(withResidentLocation).map((r) => ({
    ...r,
    ultimoSigno: latestBy[r.id] ?? null,
  }));
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

// Incidentes/caídas de los últimos 7 días — útil como indicador de seguridad.
async function getRecentIncidents() {
  const since = startOfDaysAgo(7);
  const { data, error } = await supabase
    .from("observaciones_diarias")
    .select("id, residente_id, fecha_hora, tipo, descripcion, residentes(nombre, apellido)")
    .in("tipo", ["caida", "incidente"])
    .gte("fecha_hora", since)
    .order("fecha_hora", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

async function getOperationalTurnSummary() {
  const fecha = todayIso();
  const turno = currentTurno();
  const [care, emar] = await Promise.all([
    getCareTaskSummary({ fecha, turno }),
    getEmarSummary({ fecha, turno }),
  ]);
  return { fecha, turno, care, emar };
}

// Requisitos de acreditación próximos a vencer (30 días) — modelo v9.
// Se lee desde acred_requisitos_eleam joined con el catálogo.
export async function getExpiringDocuments(daysAhead = 30) {
  const today    = new Date().toISOString().slice(0, 10);
  const deadline = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("acred_requisitos_eleam")
    .select(`
      id, fecha_vencimiento, estado,
      requisito:acred_requisitos!inner(
        codigo, nombre,
        ambito:acred_ambitos!inner(codigo, nombre)
      )
    `)
    .gte("fecha_vencimiento", today)
    .lte("fecha_vencimiento", deadline)
    .order("fecha_vencimiento", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function loadDashboard() {
  const [
    residentStatsResult,
    signosHoyResult,
    observacionesHoyResult,
    activityByShiftResult,
    latestVitalsResult,
    followUpsResult,
    incidentsResult,
    expiringResult,
    acreditacionResult,
    operationalResult,
    bedsResult,
  ] = await Promise.allSettled([
    getResidentStats(),
    getTodayVitalSignsCount(),
    getTodayObservationsCount(),
    getTodayActivityByShift(),
    getActiveResidentsLatestVitals(),
    getPendingFollowUps(),
    getRecentIncidents(),
    getExpiringDocuments(30),
    getAccreditationSummary(),
    getOperationalTurnSummary(),
    getBedOccupancySummary(),
  ]);

  const ok = (r) => r.status === "fulfilled";

  return {
    residentStats:        ok(residentStatsResult)    ? residentStatsResult.value    : null,
    signosHoy:            ok(signosHoyResult)        ? signosHoyResult.value        : 0,
    observacionesHoy:     ok(observacionesHoyResult) ? observacionesHoyResult.value : 0,
    activityByShift:      ok(activityByShiftResult)  ? activityByShiftResult.value  : null,
    latestVitalsByResident:ok(latestVitalsResult)    ? latestVitalsResult.value     : [],
    pendingFollowUps:     ok(followUpsResult)        ? followUpsResult.value        : [],
    recentIncidents:      ok(incidentsResult)        ? incidentsResult.value        : [],
    expiringDocuments:    ok(expiringResult)         ? expiringResult.value         : [],
    acreditacionSummary:  ok(acreditacionResult)     ? acreditacionResult.value     : null,
    operationalSummary:   ok(operationalResult)      ? operationalResult.value      : null,
    bedSummary:           ok(bedsResult)             ? bedsResult.value             : null,
    errors: {
      residentStats:    !ok(residentStatsResult),
      actividad:        !ok(signosHoyResult) || !ok(observacionesHoyResult),
      activityByShift:  !ok(activityByShiftResult),
      latestVitals:     !ok(latestVitalsResult),
      followUps:        !ok(followUpsResult),
      incidents:        !ok(incidentsResult),
      expiring:         !ok(expiringResult),
      acreditacion:     !ok(acreditacionResult),
      operational:       !ok(operationalResult),
      beds:              !ok(bedsResult),
    },
  };
}
