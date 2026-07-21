import { supabase } from "../../services/supabaseConfig";

const EVENT_SELECT = `
  id, eleam_id, residente_id, observacion_id,
  fecha_evento, hora_evento, turno, lugar,
  categoria, severidad, descripcion, causas_probables, acciones_inmediatas, testigos,
  estado, requiere_seguimiento, fecha_compromiso_cierre,
  notificado_familia, fecha_notificacion_familia, notificado_por, medio_notificacion_familia,
  registrado_por, cerrado_por, fecha_cierre, conclusiones,
  creado_en, actualizado_en,
  residente:residentes(id, nombre, apellido),
  registrador:profiles!eventos_adversos_registrado_por_fkey(id, nombre)
`;

const ACCION_SELECT = `
  id, evento_id, fecha, tipo, descripcion, realizado_por,
  realizado:profiles!eventos_adversos_acciones_realizado_por_fkey(id, nombre),
  creado_en
`;

const AUDIT_SELECT = `
  id, evento_id, accion, detalle, realizado_por,
  realizado:profiles!eventos_adversos_audit_realizado_por_fkey(id, nombre),
  realizado_en
`;

// ─── Listado y filtros ───────────────────────────────────────────────────

export async function listAdverseEvents({
  search = null,
  categoria = null,
  severidad = null,
  estado = null,
  residenteId = null,
  desde = null,
  hasta = null,
  soloPendientesCierre = false,
  limit = 200,
} = {}) {
  let q = supabase
    .from("eventos_adversos")
    .select(EVENT_SELECT)
    .order("fecha_evento", { ascending: false })
    .order("creado_en", { ascending: false })
    .limit(limit);

  if (residenteId) q = q.eq("residente_id", residenteId);
  if (categoria)   q = q.eq("categoria", categoria);
  if (severidad)   q = q.eq("severidad", severidad);
  if (estado)      q = q.eq("estado", estado);
  if (desde)       q = q.gte("fecha_evento", desde);
  if (hasta)       q = q.lte("fecha_evento", hasta);
  if (soloPendientesCierre) q = q.in("estado", ["registrado", "en_revision", "en_seguimiento"]);
  if (search) {
    const safe = String(search).trim().replace(/[,()]/g, " ");
    if (safe) {
      q = q.or(`descripcion.ilike.%${safe}%,lugar.ilike.%${safe}%,causas_probables.ilike.%${safe}%,conclusiones.ilike.%${safe}%`);
    }
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getAdverseEvent(id) {
  const { data, error } = await supabase
    .from("eventos_adversos")
    .select(EVENT_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function getOpenAdverseEventsCount(eleamId) {
  if (!eleamId) return { total: 0, gravesOCriticos: 0 };
  const { data, error } = await supabase
    .from("eventos_adversos")
    .select("severidad")
    .eq("eleam_id", eleamId)
    .in("estado", ["registrado", "en_revision", "en_seguimiento"]);
  if (error) throw error;
  const rows = data ?? [];
  return {
    total: rows.length,
    gravesOCriticos: rows.filter((r) => r.severidad === "grave" || r.severidad === "critico").length,
  };
}

// ─── Mutaciones ──────────────────────────────────────────────────────────

export async function createAdverseEvent(payload, { eleamId } = {}) {
  if (!eleamId) throw new Error("Falta eleam_id para crear el evento.");
  const { data: { user } } = await supabase.auth.getUser();
  const insertable = {
    ...payload,
    eleam_id: eleamId,
    registrado_por: user?.id ?? null,
  };
  const { data, error } = await supabase
    .from("eventos_adversos")
    .insert(insertable)
    .select(EVENT_SELECT)
    .single();
  if (error) throw error;
  await writeAudit("create", data.id, { eleamId, detalle: { categoria: data.categoria, severidad: data.severidad } });
  return data;
}

export async function updateAdverseEvent(id, payload, { eleamId } = {}) {
  const { data, error } = await supabase
    .from("eventos_adversos")
    .update(payload)
    .eq("id", id)
    .select(EVENT_SELECT)
    .single();
  if (error) throw error;
  await writeAudit("update", id, { eleamId, detalle: payload });
  return data;
}

export async function cancelAdverseEvent(id, motivo, { eleamId } = {}) {
  const { data, error } = await supabase
    .from("eventos_adversos")
    .update({ estado: "cancelado", conclusiones: motivo || null })
    .eq("id", id)
    .select(EVENT_SELECT)
    .single();
  if (error) throw error;
  await writeAudit("cancel", id, { eleamId, detalle: { motivo } });
  return data;
}

export async function closeAdverseEvent(id, conclusiones, { eleamId } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("eventos_adversos")
    .update({
      estado: "cerrado",
      conclusiones,
      fecha_cierre: new Date().toISOString(),
      cerrado_por: user?.id ?? null,
    })
    .eq("id", id)
    .select(EVENT_SELECT)
    .single();
  if (error) throw error;
  // También registra la acción de cierre en el timeline.
  await addEventAction(id, { tipo: "cierre", descripcion: conclusiones || "Evento cerrado." }, { eleamId });
  return data;
}

export async function reopenAdverseEvent(id, motivo, { eleamId } = {}) {
  const { data, error } = await supabase
    .from("eventos_adversos")
    .update({
      estado: "en_seguimiento",
      fecha_cierre: null,
      cerrado_por: null,
    })
    .eq("id", id)
    .select(EVENT_SELECT)
    .single();
  if (error) throw error;
  await addEventAction(id, { tipo: "reabertura", descripcion: motivo || "Evento reabierto." }, { eleamId });
  return data;
}

// ─── Timeline de acciones ────────────────────────────────────────────────

export async function listEventActions(eventId) {
  const { data, error } = await supabase
    .from("eventos_adversos_acciones")
    .select(ACCION_SELECT)
    .eq("evento_id", eventId)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addEventAction(eventId, payload, { eleamId } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  const insertable = {
    evento_id: eventId,
    tipo: payload.tipo,
    descripcion: payload.descripcion,
    realizado_por: user?.id ?? null,
  };
  const { data, error } = await supabase
    .from("eventos_adversos_acciones")
    .insert(insertable)
    .select(ACCION_SELECT)
    .single();
  if (error) throw error;
  await writeAudit("add_action", eventId, { eleamId, detalle: { tipo: payload.tipo } });
  return data;
}

// ─── Auditoría ───────────────────────────────────────────────────────────

export async function listEventAudit(eventId) {
  const { data, error } = await supabase
    .from("eventos_adversos_audit")
    .select(AUDIT_SELECT)
    .eq("evento_id", eventId)
    .order("realizado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function writeAudit(accion, eventId, { eleamId, detalle = null } = {}) {
  if (!eventId) return;
  const { data: { user } } = await supabase.auth.getUser();
  await supabase
    .from("eventos_adversos_audit")
    .insert({
      eleam_id: eleamId ?? null,
      evento_id: eventId,
      accion,
      detalle: detalle ? sanitizeDetalle(detalle) : null,
      realizado_por: user?.id ?? null,
    });
}

function sanitizeDetalle(detalle) {
  // Evita guardar datos enormes (descripciones, conclusiones largas) en el audit.
  const out = {};
  for (const [k, v] of Object.entries(detalle)) {
    if (v == null) continue;
    if (typeof v === "string") out[k] = v.slice(0, 200);
    else out[k] = v;
  }
  return out;
}
