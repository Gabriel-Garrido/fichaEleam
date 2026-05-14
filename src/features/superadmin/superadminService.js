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
  proxima_accion_fecha, responsable_comercial, riesgo_churn, creado_en
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
  estado, notas_admin, demo_token, demo_access_granted_at, demo_expires_at,
  demo_ultimo_ping, demo_progreso, solicita_contacto, solicita_contacto_en,
  solicita_contacto_mensaje, demo_user_id, creado_en
`;

// ─────────────────────────────────────────────────────────────
// Métricas
// ─────────────────────────────────────────────────────────────
export async function getMetrics() {
  const thisMonthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();

  const [eleamsRes, residentsRes, pagosRes] = await Promise.allSettled([
    supabase.from("eleams").select("id, pago_activo, plan, crm_estado, riesgo_churn, creado_en"),
    supabase.from("residentes").select("id, estado"),
    supabase
      .from("pagos")
      .select("monto, fecha_pago, estado")
      .gte("fecha_pago", thisMonthStart)
      .eq("estado", "completado"),
  ]);

  const eleams    = eleamsRes.status    === "fulfilled" ? (eleamsRes.value.data ?? []) : [];
  const residents = residentsRes.status === "fulfilled" ? (residentsRes.value.data ?? []) : [];
  const pagos     = pagosRes.status     === "fulfilled" ? (pagosRes.value.data ?? []) : [];

  const thisMonth = new Date(thisMonthStart);
  const leadStates = new Set(["lead", "contactado", "demo_agendada", "demo_realizada", "prueba"]);

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
    const s = search.trim();
    q = q.or(`nombre.ilike.%${s}%,email.ilike.%${s}%,eleam_nombre.ilike.%${s}%`);
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
    _temp_password: data.temp_password,
    _email_sent: data.email_sent === true,
    _email_error: data.email_error || null,
    _email_skipped: data.email_skipped === true,
    _reused_existing_user: data.reused_existing_user === true,
    _already_active: data.already_active === true,
    _repaired_existing_auth_user: data.repaired_existing_auth_user === true,
  };
}

export async function getActiveInDemo() {
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("demo_leads")
    .select("id, nombre, eleam_nombre, demo_ultimo_ping, demo_progreso, solicita_contacto")
    .eq("estado", "demo_activo")
    .gte("demo_ultimo_ping", cutoff);
  if (error) throw error;
  return data ?? [];
}

export async function getContactRequests() {
  const { data, error } = await supabase
    .from("demo_leads")
    .select(DEMO_LEAD_SELECT)
    .eq("solicita_contacto", true)
    .order("solicita_contacto_en", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function getLandingMetrics(days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [eventsRes, leadsRes] = await Promise.allSettled([
    supabase.from("landing_events").select("tipo, elemento, creado_en, utm_source, utm_medium, session_id").gte("creado_en", since),
    supabase.from("demo_leads").select("id, creado_en").gte("creado_en", since),
  ]);

  const events = eventsRes.status === "fulfilled" ? (eventsRes.value.data ?? []) : [];
  const leads  = leadsRes.status  === "fulfilled" ? (leadsRes.value.data ?? []) : [];

  const sessions = new Set(events.filter((e) => e.tipo === "page_view" && e.session_id).map((e) => e.session_id));
  const ctaClicks = events.filter((e) => e.tipo === "cta_click");
  const topCtaMap = {};
  for (const e of ctaClicks) {
    if (!e.elemento) continue;
    topCtaMap[e.elemento] = (topCtaMap[e.elemento] ?? 0) + 1;
  }
  const topCtas = Object.entries(topCtaMap).sort((a,b) => b[1] - a[1]).slice(0, 8).map(([elem, count]) => ({ elem, count }));

  const sourceMap = {};
  for (const e of events.filter((e) => e.utm_source && e.tipo === "page_view")) {
    const k = `${e.utm_source}/${e.utm_medium ?? "(none)"}`;
    sourceMap[k] = (sourceMap[k] ?? 0) + 1;
  }
  const sources = Object.entries(sourceMap).sort((a,b) => b[1] - a[1]).slice(0, 8).map(([src, count]) => ({ src, count }));

  // Visitas diarias últimos 14 días
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const visitsByDay = {};
  for (const ev of events.filter((e) => e.tipo === "page_view")) {
    const day = ev.creado_en.slice(0, 10);
    visitsByDay[day] = (visitsByDay[day] ?? 0) + 1;
  }
  const dailyVisits = last14.map((d) => ({ date: d, count: visitsByDay[d] ?? 0 }));

  return {
    totalVisits:    sessions.size,
    totalLeads:     leads.length,
    conversionRate: sessions.size > 0 ? Math.round((leads.length / sessions.size) * 100) : 0,
    topCtas,
    sources,
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
