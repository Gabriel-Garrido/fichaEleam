import { supabase } from "../../services/supabaseConfig";
import { throwEdgeFunctionError } from "../../services/edgeFunctionErrors";

// Patrón:
//  • Toda la I/O contra Supabase pasa por aquí; las páginas superadmin
//    cargan solo los datos de su sección.
//  • Las RLS validan que solo superadmin pueda leer/escribir CRM.
//  • registerPayment usa la RPC transaccional registrar_pago_y_activar_eleam
//    para garantizar consistencia (pago + activación + interacción).

const ELEAM_SELECT = `
  id, nombre, rut_empresa, email_admin, telefono,
  pago_activo, plan, plan_id, fecha_pago, fecha_vencimiento_suscripcion,
  proximo_cobro_en, cancelado_en, mp_preapproval_id, mp_payer_email,
  max_residentes, max_funcionarios, notas_admin,
  subscription_status, crm_estado, origen_lead, ultimo_contacto,
  proxima_accion_fecha, responsable_comercial, riesgo_churn, creado_en,
  planes (
    id, codigo, nombre, descripcion, precio_clp,
    max_residentes, max_funcionarios, frequency, frequency_type, activo, orden, destacado
  )
`;

const PAYMENT_SELECT = `
  id, eleam_id, plan_id, monto, moneda, plan,
  fecha_pago, fecha_inicio, fecha_fin, metodo_pago,
  referencia_externa, estado, notas, registrado_por,
  mp_payment_id, mp_preapproval_id, mp_authorized_payment_id,
  raw, creado_en
`;

const CRM_TASK_SELECT = `
  id, eleam_id, titulo, descripcion, tipo, estado, prioridad,
  fecha_vencimiento, creado_por, completado_por,
  creado_en, completado_en, actualizado_en
`;

const CRM_INTERACTION_SELECT = `
  id, eleam_id, tipo, canal, resumen, resultado,
  proxima_accion, creado_por, creado_en
`;

const DEMO_LEAD_SELECT = `
  id, nombre, cargo, eleam_nombre, email, telefono, num_residentes,
  utm_source, utm_medium, utm_campaign, pagina_origen, referrer,
  estado, notas_admin, demo_access_granted_at, demo_expires_at,
  demo_user_id, creado_en
`;

// Fuentes de actividad para el monitoreo de uso por ELEAM.
// `scope` indica cómo se acota la consulta: por eleam_id directo, o por
// residente_id (tablas clínicas que no tienen columna eleam_id).
const ELEAM_USAGE_SOURCES = [
  { table: "signos_vitales",                who: "registrado_por",  ts: "creado_en",       scope: "residente" },
  { table: "observaciones_diarias",         who: "registrado_por",  ts: "creado_en",       scope: "residente" },
  { table: "medicamentos_administraciones", who: "administrado_por", ts: "administrado_en", scope: "eleam" },
  { table: "tareas_cuidado",                who: "cumplida_por",    ts: "cumplida_en",     scope: "eleam" },
  { table: "turno_entregas",                who: "creado_por",      ts: "creado_en",       scope: "eleam" },
  { table: "residentes",                    who: "creado_por",      ts: "creado_en",       scope: "eleam" },
  { table: "eventos_adversos",              who: "registrado_por",  ts: "creado_en",       scope: "eleam" },
  { table: "camas_audit",                   who: "realizado_por",   ts: "realizado_en",    scope: "eleam" },
  { table: "acred_documentos",              who: "subido_por",      ts: "creado_en",       scope: "eleam" },
];

const USAGE_ROLES = ["admin_eleam", "funcionario"];

function daysSinceIso(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function isRecentIso(value, days) {
  const diff = daysSinceIso(value);
  return diff != null && diff <= days;
}

function isOverdueDate(value) {
  if (!value) return false;
  return value < new Date().toISOString().slice(0, 10);
}

function isCriticalDocument(doc) {
  if (!doc?.fecha_vencimiento || doc.vigente === false) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today.getTime() + 30 * 86400000);
  const due = new Date(doc.fecha_vencimiento);
  if (Number.isNaN(due.valueOf())) return false;
  return due <= limit;
}

function reasonPriority(reason) {
  if (/Riesgo churn alto|cliente_riesgo/i.test(reason)) return 0;
  if (/tarea/i.test(reason)) return 1;
  if (/documento/i.test(reason)) return 2;
  if (/Demo sin uso/i.test(reason)) return 3;
  if (/Sin actividad/i.test(reason)) return 4;
  if (/Pago inactivo/i.test(reason)) return 5;
  if (/Sin residentes/i.test(reason)) return 6;
  if (/Sin equipo/i.test(reason)) return 7;
  if (/Sin evidencia/i.test(reason)) return 8;
  return 20;
}

function countByEleam(rows = [], predicate = null) {
  const out = new Map();
  for (const row of rows) {
    if (!row?.eleam_id) continue;
    if (predicate && !predicate(row)) continue;
    out.set(row.eleam_id, (out.get(row.eleam_id) ?? 0) + 1);
  }
  return out;
}

function lastActivityByEleam(...sources) {
  const out = new Map();
  for (const rows of sources) {
    for (const row of rows ?? []) {
      if (!row?.eleam_id || !row.creado_en) continue;
      const current = out.get(row.eleam_id);
      if (!current || row.creado_en > current) out.set(row.eleam_id, row.creado_en);
    }
  }
  return out;
}

export function computeClientScore(eleam, context) {
  const residents = context.residentCounts.get(eleam.id) ?? 0;
  const activeResidents = context.activeResidentCounts.get(eleam.id) ?? 0;
  const staff = context.staffCounts.get(eleam.id) ?? 0;
  const docs = context.documentCounts.get(eleam.id) ?? 0;
  const criticalDocs = context.criticalDocumentCounts.get(eleam.id) ?? 0;
  const overdueTasks = context.overdueTaskCounts.get(eleam.id) ?? 0;
  const lastActivity = context.lastActivity.get(eleam.id) ?? null;
  const daysInactive = daysSinceIso(lastActivity);
  const reasons = [];

  let score = 25;
  if (activeResidents > 0) score += 20; else reasons.push("Sin residentes activos");
  if (staff > 0) score += 15; else reasons.push("Sin equipo operativo");
  if (docs > 0) score += 15; else reasons.push("Sin evidencia DS20");
  if (eleam.pago_activo) score += 15;
  else if (eleam.plan === "demo") score += 5;
  else reasons.push("Pago inactivo");
  if (isRecentIso(lastActivity, 7)) score += 10;
  else if (daysInactive == null) reasons.push("Sin actividad registrada");
  else if (daysInactive > 30) reasons.push(`Sin actividad hace ${daysInactive}d`);

  if (eleam.riesgo_churn === "alto" || eleam.crm_estado === "cliente_riesgo") {
    score -= 25;
    reasons.push("Riesgo churn alto");
  } else if (eleam.riesgo_churn === "medio") {
    score -= 10;
    reasons.push("Riesgo churn medio");
  }
  if (overdueTasks > 0) {
    score -= Math.min(20, overdueTasks * 8);
    reasons.push(`${overdueTasks} tarea${overdueTasks === 1 ? "" : "s"} vencida${overdueTasks === 1 ? "" : "s"}`);
  }
  if (criticalDocs > 0) {
    score -= Math.min(15, criticalDocs * 5);
    reasons.push(`${criticalDocs} documento${criticalDocs === 1 ? "" : "s"} crítico${criticalDocs === 1 ? "" : "s"}`);
  }
  if (eleam.plan === "demo" && residents === 0 && docs === 0) {
    score -= 10;
    reasons.push("Demo sin uso");
  }

  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const visibleReasons = reasons.length
    ? [...reasons].sort((a, b) => reasonPriority(a) - reasonPriority(b)).slice(0, 4)
    : ["Sin alertas relevantes"];
  return {
    eleamId: eleam.id,
    nombre: eleam.nombre,
    score: normalized,
    tone: normalized >= 75 ? "emerald" : normalized >= 50 ? "amber" : "rose",
    residents,
    activeResidents,
    staff,
    docs,
    criticalDocs,
    overdueTasks,
    lastActivity,
    reasons: visibleReasons,
  };
}

// ─────────────────────────────────────────────────────────────
// Métricas
// ─────────────────────────────────────────────────────────────
export async function getMetrics() {
  const thisMonthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [eleamsRes, residentsRes, pagosRes, leadsRes, profilesRes, docsRes, tasksRes, usageRes] = await Promise.allSettled([
    supabase.from("eleams").select("id, nombre, pago_activo, plan, crm_estado, riesgo_churn, ultimo_contacto, fecha_vencimiento_suscripcion, creado_en"),
    supabase.from("residentes").select("id, eleam_id, estado, creado_en"),
    supabase
      .from("pagos")
      .select("monto, fecha_pago, estado")
      .gte("fecha_pago", thisMonthStart)
      .eq("estado", "completado"),
    supabase
      .from("demo_leads")
      .select("id", { count: "exact", head: true })
      .gte("creado_en", sevenDaysAgo),
    supabase
      .from("profiles")
      .select("id, eleam_id, rol, must_reset_password, creado_en"),
    supabase
      .from("acred_documentos")
      .select("id, eleam_id, vigente, fecha_vencimiento, creado_en"),
    supabase
      .from("crm_tasks")
      .select("id, eleam_id, estado, fecha_vencimiento, creado_en"),
    supabase.rpc("superadmin_portfolio_usage", { p_days: 30 }),
  ]);

  const eleams    = eleamsRes.status    === "fulfilled" ? (eleamsRes.value.data ?? []) : [];
  const residents = residentsRes.status === "fulfilled" ? (residentsRes.value.data ?? []) : [];
  const pagos     = pagosRes.status     === "fulfilled" ? (pagosRes.value.data ?? []) : [];
  const newLeadsLast7d = leadsRes.status === "fulfilled" ? (leadsRes.value.count ?? 0) : 0;
  const profiles  = profilesRes.status  === "fulfilled" ? (profilesRes.value.data ?? []) : [];
  const documents = docsRes.status      === "fulfilled" ? (docsRes.value.data ?? []) : [];
  const tasks     = tasksRes.status     === "fulfilled" ? (tasksRes.value.data ?? []) : [];
  const usageRows = usageRes.status === "fulfilled" && !usageRes.value.error
    ? (usageRes.value.data ?? [])
    : [];

  const thisMonth = new Date(thisMonthStart);
  const leadStates = new Set(["lead", "contactado", "demo_agendada", "demo_realizada", "prueba"]);
  const residentCounts = countByEleam(residents);
  const activeResidentCounts = countByEleam(residents, (r) => r.estado === "activo");
  const staffCounts = countByEleam(profiles, (p) => p.rol === "funcionario");
  const pendingAccessCounts = countByEleam(profiles, (p) => p.must_reset_password === true);
  const documentCounts = countByEleam(documents);
  const criticalDocumentCounts = countByEleam(documents, isCriticalDocument);
  const overdueTaskCounts = countByEleam(tasks, (t) => !["completada", "cancelada"].includes(t.estado) && isOverdueDate(t.fecha_vencimiento));
  const fallbackLastActivity = lastActivityByEleam(residents, profiles, documents);
  const lastActivity = usageRows.length
    ? new Map(usageRows.map((row) => [row.eleam_id, row.ultima_actividad ?? null]))
    : fallbackLastActivity;
  const usageByEleam = new Map(usageRows.map((row) => [row.eleam_id, row]));
  const clientScores = eleams.map((eleam) => computeClientScore(eleam, {
    residentCounts,
    activeResidentCounts,
    staffCounts,
    documentCounts,
    criticalDocumentCounts,
    overdueTaskCounts,
    lastActivity,
  }));
  const basicActivated = clientScores.filter((c) => c.activeResidents > 0 && c.staff > 0).length;
  const ds20Started = clientScores.filter((c) => c.docs > 0).length;
  const activeLast7d = eleams.filter((e) => isRecentIso(lastActivity.get(e.id), 7)).length;
  const inactive30d = eleams.filter((e) => {
    const d = daysSinceIso(lastActivity.get(e.id));
    return d == null || d > 30;
  }).length;
  const demosSinUso = eleams.filter((e) =>
    e.plan === "demo" &&
    (usageRows.length
      ? Number(usageByEleam.get(e.id)?.registros ?? 0) === 0
      : (residentCounts.get(e.id) ?? 0) === 0 && (documentCounts.get(e.id) ?? 0) === 0)
  ).length;
  const portfolioScore = clientScores.length
    ? Math.round(clientScores.reduce((sum, c) => sum + c.score, 0) / clientScores.length)
    : 0;
  const priorityClients = clientScores
    .filter((c) => c.score < 75 || c.overdueTasks > 0 || c.criticalDocs > 0)
    .sort((a, b) => a.score - b.score || b.overdueTasks - a.overdueTasks || b.criticalDocs - a.criticalDocs)
    .slice(0, 5);

  return {
    totalEleams:         eleams.length,
    activeSubscriptions: eleams.filter((e) => e.pago_activo).length,
    demoEleams:          eleams.filter((e) => e.plan === "demo").length,
    sinPago:             eleams.filter((e) => !e.pago_activo).length,
    leads:               eleams.filter((e) => leadStates.has(e.crm_estado)).length,
    enRiesgo:            eleams.filter((e) => e.riesgo_churn === "alto" || e.crm_estado === "cliente_riesgo").length,
    newEleamsThisMonth:  eleams.filter((e) => new Date(e.creado_en) >= thisMonth).length,
    totalResidents:      residents.length,
    activeResidents:     residents.filter((r) => r.estado === "activo").length,
    mrrCLP:              pagos.reduce((sum, p) => sum + (p.monto ?? 0), 0),
    newLeadsLast7d,
    portfolioScore,
    basicActivated,
    ds20Started,
    activeLast7d,
    inactive30d,
    demosSinUso,
    pendingAccessUsers:  [...pendingAccessCounts.values()].reduce((sum, n) => sum + n, 0),
    criticalDocuments:   [...criticalDocumentCounts.values()].reduce((sum, n) => sum + n, 0),
    overdueCrmTasks:     [...overdueTaskCounts.values()].reduce((sum, n) => sum + n, 0),
    priorityClients,
  };
}

// ─────────────────────────────────────────────────────────────
// ELEAMs
// ─────────────────────────────────────────────────────────────
export async function getAllEleams() {
  const { data, error } = await supabase
    .from("eleams")
    .select(`
      ${ELEAM_SELECT},
      responsable:profiles!eleams_responsable_comercial_fkey(id, nombre, email)
    `)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPortfolioUsage(days = 30) {
  const windowDays = Number(days);
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365) {
    throw new Error("La ventana de uso debe estar entre 1 y 365 días.");
  }

  const [usageResult, pendingAdminsResult] = await Promise.all([
    supabase.rpc("superadmin_portfolio_usage", { p_days: windowDays }),
    supabase
      .from("profiles")
      .select("eleam_id")
      .eq("rol", "admin_eleam")
      .eq("must_reset_password", true),
  ]);
  if (usageResult.error) throw usageResult.error;
  if (pendingAdminsResult.error) throw pendingAdminsResult.error;

  const pendingAdminEleams = new Set(
    (pendingAdminsResult.data ?? []).map((profile) => profile.eleam_id).filter(Boolean),
  );

  return (usageResult.data ?? []).map((row) => ({
    eleamId: row.eleam_id,
    usuariosTotales: Number(row.usuarios_totales ?? 0),
    usuariosActivos: Number(row.usuarios_activos ?? 0),
    usuariosSinPrimerIngreso: Number(row.usuarios_sin_primer_ingreso ?? 0),
    registros: Number(row.registros ?? 0),
    modulosActivos: Number(row.modulos_activos ?? 0),
    ultimaActividad: row.ultima_actividad ?? null,
    adminDemoSinPrimerIngreso: pendingAdminEleams.has(row.eleam_id),
  }));
}

export async function getEleamDetail(eleamId) {
  if (!eleamId) return null;
  const { data, error } = await supabase
    .from("eleams")
    .select(`
      ${ELEAM_SELECT},
      responsable:profiles!eleams_responsable_comercial_fkey(id, nombre, email)
    `)
    .eq("id", eleamId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateEleam(id, payload) {
  const { data, error } = await supabase
    .from("eleams")
    .update(payload)
    .eq("id", id)
    .select(`
      ${ELEAM_SELECT},
      responsable:profiles!eleams_responsable_comercial_fkey(id, nombre, email)
    `)
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

// ─────────────────────────────────────────────────────────────
// Pagos
// ─────────────────────────────────────────────────────────────
export async function getRecentPayments(limit = 20) {
  const { data, error } = await supabase
    .from("pagos")
    .select(`${PAYMENT_SELECT}, eleams(nombre)`)
    .order("fecha_pago", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getEleamPayments(eleamId, limit = 50) {
  if (!eleamId) return [];
  const { data, error } = await supabase
    .from("pagos")
    .select(PAYMENT_SELECT)
    .eq("eleam_id", eleamId)
    .order("fecha_pago", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Registro de pago: usa RPC transaccional. La RPC inserta el pago,
// activa la suscripción del ELEAM, deja interacción automática.
export async function registerPayment(payload) {
  const monto = parseInt(payload.monto, 10);
  if (!payload.eleam_id || !monto || monto <= 0) {
    throw new Error("Datos de pago inválidos.");
  }

  const today      = new Date().toISOString().slice(0, 10);
  const daysAhead  = payload.plan === "anual" ? 365 : 30;
  const fechaFin   = payload.fecha_fin
    ?? new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
  const fechaIni   = payload.fecha_inicio ?? today;

  const { data, error } = await supabase.rpc("registrar_pago_y_activar_eleam", {
    p_eleam_id:     payload.eleam_id,
    p_monto:        monto,
    p_plan:         payload.plan ?? "mensual",
    p_plan_codigo:  payload.plan_codigo ?? "plan-14",
    p_fecha_inicio: fechaIni,
    p_fecha_fin:    fechaFin,
    p_metodo_pago:  payload.metodo_pago ?? null,
    p_notas:        payload.notas ?? null,
  });
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// CRM tasks
// ─────────────────────────────────────────────────────────────
export async function getCrmTasks({ eleamId = null, soloPendientes = false, limit = 200 } = {}) {
  let q = supabase
    .from("crm_tasks")
    .select(`
      ${CRM_TASK_SELECT},
      eleam:eleams(id, nombre),
      autor:profiles!crm_tasks_creado_por_fkey(id, nombre),
      cierre:profiles!crm_tasks_completado_por_fkey(id, nombre)
    `)
    .order("fecha_vencimiento", { ascending: true, nullsFirst: false })
    .order("creado_en", { ascending: false })
    .limit(limit);
  if (eleamId)         q = q.eq("eleam_id", eleamId);
  if (soloPendientes)  q = q.in("estado", ["pendiente", "en_curso"]);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createCrmTask(payload) {
  if (!payload.titulo?.trim()) throw new Error("El título es obligatorio.");
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("crm_tasks")
    .insert({
      eleam_id:           payload.eleam_id || null,
      titulo:             payload.titulo.trim(),
      descripcion:        payload.descripcion?.trim() || null,
      tipo:               payload.tipo ?? "general",
      prioridad:          payload.prioridad ?? "media",
      fecha_vencimiento:  payload.fecha_vencimiento || null,
      creado_por:         user?.id ?? null,
    })
    .select(CRM_TASK_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateCrmTask(id, payload) {
  const { data, error } = await supabase
    .from("crm_tasks")
    .update(payload)
    .eq("id", id)
    .select(CRM_TASK_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function completeCrmTask(id) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("crm_tasks")
    .update({
      estado:         "completada",
      completado_en:  new Date().toISOString(),
      completado_por: user?.id ?? null,
    })
    .eq("id", id)
    .select(CRM_TASK_SELECT)
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// CRM interactions
// ─────────────────────────────────────────────────────────────
export async function getEleamInteractions(eleamId, limit = 100) {
  if (!eleamId) return [];
  const { data, error } = await supabase
    .from("crm_interactions")
    .select(`
      ${CRM_INTERACTION_SELECT},
      autor:profiles!crm_interactions_creado_por_fkey(id, nombre)
    `)
    .eq("eleam_id", eleamId)
    .order("creado_en", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// Leads de landing page y demo guiado
// ─────────────────────────────────────────────────────────────
export async function getLeads({ estado = null, search = "", limit = 200 } = {}) {
  let q = supabase
    .from("demo_leads")
    .select(DEMO_LEAD_SELECT)
    .order("creado_en", { ascending: false })
    .limit(limit);
  if (estado) q = q.eq("estado", estado);
  if (search.trim()) {
    // Comas y paréntesis separan condiciones en la sintaxis .or() de
    // PostgREST: se neutralizan para que la búsqueda no rompa el filtro.
    const s = search.trim().replace(/[,()]/g, " ").replace(/\s+/g, " ").trim();
    if (s) q = q.or(`nombre.ilike.%${s}%,email.ilike.%${s}%,eleam_nombre.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function updateLead(id, payload) {
  const { data, error } = await supabase
    .from("demo_leads")
    .update(payload)
    .eq("id", id)
    .select(DEMO_LEAD_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function grantDemoAccess(leadId) {
  // Crea un usuario real admin_eleam para el lead y activa su ELEAM.
  // La edge function también envía email de bienvenida si RESEND_API_KEY está configurado.
  const { data, error } = await supabase.functions.invoke("create-demo-user", {
    body: { lead_id: leadId },
  });
  if (error) await throwEdgeFunctionError(error, "Error al crear usuario demo");
  if (data?.ok === false || data?.error) {
    const normalized = new Error(data.message || data.error || "No se pudo activar el acceso demo.");
    normalized.code = data.code || "demo_grant_error";
    throw normalized;
  }

  // Leer el lead actualizado para reflejar el estado en la UI
  const { data: lead, error: leadErr } = await supabase
    .from("demo_leads")
    .select(DEMO_LEAD_SELECT)
    .eq("id", leadId)
    .single();
  if (leadErr) throw leadErr;

  // Adjuntar credenciales al objeto retornado (no se persisten en BD)
  return {
    ...lead,
    _code: data.code || null,
    _message: data.message || null,
    _email_sent: data.email_sent === true,
    _email_error: data.email_error || null,
    _email_skipped: data.email_skipped === true,
    _reused_existing_user: data.reused_existing_user === true,
    _already_active: data.already_active === true,
    _repaired_existing_auth_user: data.repaired_existing_auth_user === true,
  };
}

export async function resendDemoAccessForEleam(eleamId) {
  if (!eleamId) throw new Error("ELEAM requerido para reenviar el acceso.");

  const { data: adminProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("eleam_id", eleamId)
    .eq("rol", "admin_eleam")
    .eq("must_reset_password", true)
    .limit(1)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!adminProfile) {
    throw new Error("El administrador de este demo ya completó su acceso inicial.");
  }

  const { data: lead, error: leadError } = await supabase
    .from("demo_leads")
    .select("id, email")
    .eq("demo_user_id", adminProfile.id)
    .eq("estado", "demo_activo")
    .order("demo_access_granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (leadError) throw leadError;
  if (!lead) {
    throw new Error("No encontramos la solicitud de demo aprobada asociada a este administrador.");
  }

  return grantDemoAccess(lead.id);
}

// Etiquetas amigables por página pública. La clave es el valor `elemento` que
// cada página envía vía usePageView(). Lo que no esté aquí cae en "Otras".
const PAGE_VIEW_LABELS = {
  landing: "Inicio (landing)",
  "/": "Inicio (landing)",
  "/software-eleam": "Software ELEAM",
  "/acreditacion-seremi": "Acreditación SEREMI",
  "/calculadora-dotacion-eleam": "Calculadora dotación",
  "/autoevaluacion-decreto-20": "Autoevaluación DS 20",
  "/plazos-decreto-20": "Plazos Decreto N°20",
  "/preguntas-frecuentes": "Preguntas frecuentes",
  "/contacto": "Contacto",
  "/pago": "Planes y precios",
  "/blog": "Blog (lista)",
  blog_post: "Blog (artículo)",
};

// Extrae "p:NN" del valor compacto del evento tool_use de la autoevaluación.
function autoevalPct(valor) {
  const match = /p:(\d+)/.exec(valor ?? "");
  return match ? Number(match[1]) : null;
}

export async function getLandingMetrics(days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [eventsRes, leadsRes] = await Promise.allSettled([
    supabase
      .from("landing_events")
      .select("tipo, elemento, valor, creado_en, utm_source, utm_medium, session_id")
      .gte("creado_en", since),
    supabase
      .from("demo_leads")
      .select("id, creado_en")
      .gte("creado_en", since),
  ]);

  // Propagate error so the UI can show it
  if (eventsRes.status === "rejected" || eventsRes.value?.error) {
    const err = eventsRes.status === "rejected" ? eventsRes.reason : eventsRes.value.error;
    throw new Error(err?.message ?? "No se pudo consultar landing_events");
  }
  if (leadsRes.status === "rejected" || leadsRes.value?.error) {
    const err = leadsRes.status === "rejected" ? leadsRes.reason : leadsRes.value.error;
    throw new Error(err?.message ?? "No se pudo consultar demo_leads");
  }

  const events = eventsRes.value.data ?? [];
  const leads  = leadsRes.value.data  ?? [];

  // ── Funnel steps ──────────────────────────────────────────────
  const pageViews   = events.filter((e) => e.tipo === "page_view");
  const ctaEvents   = events.filter((e) => e.tipo === "cta_click");
  const formViews   = events.filter((e) => e.tipo === "form_view");
  const formSubmits = events.filter((e) => e.tipo === "form_submit");

  // Unique visitors by session_id on page_view
  const sessions = new Set(pageViews.filter((e) => e.session_id).map((e) => e.session_id));

  // ── Top CTAs ─────────────────────────────────────────────────
  const topCtaMap = {};
  for (const e of ctaEvents) {
    if (!e.elemento) continue;
    topCtaMap[e.elemento] = (topCtaMap[e.elemento] ?? 0) + 1;
  }
  const topCtas = Object.entries(topCtaMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([elem, count]) => ({ elem, count }));

  // ── Top sections ─────────────────────────────────────────────
  const sectionMap = {};
  for (const e of events.filter((e) => e.tipo === "section_view" && e.elemento)) {
    sectionMap[e.elemento] = (sectionMap[e.elemento] ?? 0) + 1;
  }
  const topSections = Object.entries(sectionMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));

  // ── UTM sources ──────────────────────────────────────────────
  const sourceMap = {};
  for (const e of pageViews.filter((e) => e.utm_source)) {
    const k = `${e.utm_source}/${e.utm_medium ?? "(none)"}`;
    sourceMap[k] = (sourceMap[k] ?? 0) + 1;
  }
  const sources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([src, count]) => ({ src, count }));

  // ── Desglose por página pública (rankeado) ───────────────────
  const pageCounts = {};
  for (const e of pageViews) {
    const key = e.elemento && PAGE_VIEW_LABELS[e.elemento] ? e.elemento : "other";
    pageCounts[key] = (pageCounts[key] ?? 0) + 1;
  }
  const pageBreakdown = Object.entries(pageCounts)
    .map(([key, count]) => ({ key, label: PAGE_VIEW_LABELS[key] ?? "Otras", count }))
    .sort((a, b) => b.count - a.count);

  // ── Uso de herramientas gratuitas (eventos tool_use) ─────────
  const calcUses = events.filter((e) => e.tipo === "tool_use" && e.elemento === "calculadora_dotacion");
  const autoevalUses = events.filter((e) => e.tipo === "tool_use" && e.elemento === "autoevaluacion_ds20");
  const autoevalPcts = autoevalUses.map((e) => autoevalPct(e.valor)).filter((p) => p != null);
  const toolUsage = {
    calculadoraUsos: calcUses.length,
    calculadoraConDeficit: calcUses.filter((e) => (e.valor ?? "").includes("def:1")).length,
    calculadoraDemoClicks: ctaEvents.filter((e) => e.elemento === "calculadora_demo").length,
    autoevalUsos: autoevalUses.length,
    autoevalBajoCumplimiento: autoevalPcts.filter((p) => p < 50).length,
    autoevalPromedioPct: autoevalPcts.length
      ? Math.round(autoevalPcts.reduce((sum, p) => sum + p, 0) / autoevalPcts.length)
      : null,
    autoevalDemoClicks: ctaEvents.filter((e) => e.elemento === "autoevaluacion_demo").length,
  };

  // ── Daily page_view counts (last 14 days) ────────────────────
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const visitsByDay = {};
  for (const ev of pageViews) {
    const day = ev.creado_en.slice(0, 10);
    visitsByDay[day] = (visitsByDay[day] ?? 0) + 1;
  }
  const dailyVisits = last14.map((d) => ({ date: d, count: visitsByDay[d] ?? 0 }));

  const totalVisits = sessions.size;
  const totalLeads  = leads.length;

  return {
    totalVisits,
    totalLeads,
    conversionRate:   totalVisits > 0 ? Math.round((totalLeads / totalVisits) * 100) : 0,
    totalCtaClicks:   ctaEvents.length,
    totalFormViews:   formViews.length,
    totalFormSubmits: formSubmits.length,
    topCtas,
    topSections,
    sources,
    pageBreakdown,
    toolUsage,
    dailyVisits,
  };
}

// ─────────────────────────────────────────────────────────────
// CRM interactions (original)
// ─────────────────────────────────────────────────────────────
export async function createEleamInteraction(payload) {
  if (!payload.eleam_id) throw new Error("ELEAM requerido.");
  if (!payload.resumen?.trim()) throw new Error("El resumen es obligatorio.");
  const { data: { user } } = await supabase.auth.getUser();
  const ahora = new Date().toISOString();
  const { data, error } = await supabase
    .from("crm_interactions")
    .insert({
      eleam_id:       payload.eleam_id,
      tipo:           payload.tipo ?? "nota",
      canal:          payload.canal ?? null,
      resumen:        payload.resumen.trim(),
      resultado:      payload.resultado ?? null,
      proxima_accion: payload.proxima_accion?.trim() || null,
      creado_por:     user?.id ?? null,
    })
    .select(CRM_INTERACTION_SELECT)
    .single();
  if (error) throw error;

  // Sincronizar ultimo_contacto del ELEAM. Solo si el tipo no es de
  // sistema (las acciones automáticas ya tocan el campo en su RPC).
  if (payload.tipo !== "sistema") {
    await supabase.from("eleams").update({ ultimo_contacto: ahora }).eq("id", payload.eleam_id);
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// Uso de la app por ELEAM (monitoreo)
// ─────────────────────────────────────────────────────────────
// Económico: solo se consulta a demanda (al abrir la sección de una ficha).
// La "actividad" se deriva del trabajo registrado (quién creó/editó cada
// registro y cuándo), NO de inicios de sesión: auth.users no está expuesto y
// profiles no tiene último acceso. Consultas acotadas por eleam_id/residente_id
// + ventana + columnas proyectadas + limit, en una sola tanda allSettled.
export async function getEleamUsage(eleamId, { days = 30 } = {}) {
  if (!eleamId) return { users: [], summary: null, days };
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Usuarios del ELEAM (incluye los que nunca ingresaron: must_reset_password).
  const usersRes = await supabase
    .from("profiles")
    .select("id, nombre, email, rol, telefono, must_reset_password, creado_en")
    .eq("eleam_id", eleamId)
    .in("rol", USAGE_ROLES);
  if (usersRes.error) throw usersRes.error;
  const users = usersRes.data ?? [];

  // IDs de residentes (para acotar las tablas clínicas sin eleam_id).
  const residentesRes = await supabase
    .from("residentes")
    .select("id")
    .eq("eleam_id", eleamId);
  const residentIds = (residentesRes.data ?? []).map((r) => r.id);

  const queries = ELEAM_USAGE_SOURCES
    .filter((s) => s.scope === "eleam" || residentIds.length > 0)
    .map((s) => {
      let q = supabase
        .from(s.table)
        .select(`${s.who}, ${s.ts}`)
        .gte(s.ts, since)
        .order(s.ts, { ascending: false })
        .limit(2000);
      q = s.scope === "eleam" ? q.eq("eleam_id", eleamId) : q.in("residente_id", residentIds);
      return q.then((res) => ({ res, who: s.who, ts: s.ts }));
    });

  const results = await Promise.allSettled(queries);

  const agg = new Map(); // userId -> { registros, ultimaActividad }
  let totalRegistros = 0;
  let registrosSinActor = 0;
  let ultimaActividadEleam = null;
  let fuentesConError = 0;

  for (const settled of results) {
    if (settled.status !== "fulfilled" || settled.value.res.error) {
      fuentesConError += 1;
      continue;
    }
    const { res, who, ts } = settled.value;
    for (const row of res.data ?? []) {
      const uid = row[who];
      const when = row[ts];
      // Cuenta como actividad del ELEAM aunque el registro no tenga autor
      // (datos importados, seeds o inserts directos sin auth.uid()).
      totalRegistros += 1;
      if (when && (!ultimaActividadEleam || when > ultimaActividadEleam)) ultimaActividadEleam = when;
      if (!uid) { registrosSinActor += 1; continue; }
      const cur = agg.get(uid) ?? { registros: 0, ultimaActividad: null };
      cur.registros += 1;
      if (when && (!cur.ultimaActividad || when > cur.ultimaActividad)) cur.ultimaActividad = when;
      agg.set(uid, cur);
    }
  }

  const mergedUsers = users.map((u) => {
    const a = agg.get(u.id) ?? { registros: 0, ultimaActividad: null };
    return { ...u, registros: a.registros, ultimaActividad: a.ultimaActividad };
  });

  // Más activos primero; los que nunca registraron, al final.
  mergedUsers.sort((a, b) => {
    if (a.ultimaActividad && b.ultimaActividad) return b.ultimaActividad.localeCompare(a.ultimaActividad);
    if (a.ultimaActividad) return -1;
    if (b.ultimaActividad) return 1;
    return b.registros - a.registros;
  });

  const summary = {
    usuariosTotales:     users.length,
    usuariosActivos:     mergedUsers.filter((u) => u.registros > 0).length,
    sinPrimerIngreso:    users.filter((u) => u.must_reset_password).length,
    totalRegistros,
    registrosSinActor,
    ultimaActividadEleam,
    fuentesConError,
  };

  return { users: mergedUsers, summary, days };
}
