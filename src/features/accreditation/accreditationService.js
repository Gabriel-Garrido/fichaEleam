import { supabase } from "../../services/supabaseConfig";

const SIGNED_URL_EXPIRY = 60 * 60; // 1 hora
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Estados visuales de un requisito
export const ESTADOS_REQUISITO = {
  cumple:     { label: "Cumple",        cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", priority: 0 },
  pendiente:  { label: "Pendiente",     cls: "bg-amber-100 text-amber-800 border-amber-200",       dot: "bg-amber-500",   priority: 1 },
  observado:  { label: "Observado",     cls: "bg-orange-100 text-orange-800 border-orange-200",    dot: "bg-orange-500",  priority: 2 },
  vencido:    { label: "Vencido",       cls: "bg-rose-100 text-rose-800 border-rose-200",          dot: "bg-rose-500",    priority: 3 },
  no_cumple:  { label: "No cumple",     cls: "bg-red-100 text-red-700 border-red-200",             dot: "bg-red-500",     priority: 4 },
  no_aplica:  { label: "No aplica",     cls: "bg-slate-100 text-slate-600 border-slate-200",       dot: "bg-slate-400",   priority: 5 },
};

export function estadoMeta(estado) {
  return ESTADOS_REQUISITO[estado] ?? { label: estado, cls: "bg-gray-100 text-gray-700", dot: "bg-gray-400" };
}

// ─────────────────────────────────────────────────────────────
// Sanitización de archivos
// ─────────────────────────────────────────────────────────────

function sanitizeFilename(name) {
  const sanitized = String(name || "")
    .replace(/\.\./g, "_")
    .replace(/[/\\]/g, "_")
    .replace(/[^a-zA-Z0-9._\-áéíóúÁÉÍÓÚñÑ ]/g, "_")
    .replace(/^\.+/, "_")
    .substring(0, 100)
    .trim();

  const ext = sanitized.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `documento_${Date.now()}.pdf`;
  }
  return sanitized || `archivo_${Date.now()}.pdf`;
}

export function validateFile(file) {
  if (!file) return "Selecciona un archivo.";
  if (file.size > MAX_FILE_SIZE) return "El archivo supera los 10 MB.";
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return "Formato no permitido. Usa PDF, DOC/DOCX, XLS/XLSX, JPG, PNG o WEBP.";
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Contexto del usuario (eleam_id desde el server)
// ─────────────────────────────────────────────────────────────

async function getMyContext() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");
  const { data, error } = await supabase
    .from("profiles")
    .select("eleam_id, rol")
    .eq("id", user.id)
    .single();
  if (error || !data?.eleam_id) {
    throw new Error("ELEAM no encontrado para este usuario.");
  }
  return { userId: user.id, eleamId: data.eleam_id, rol: data.rol };
}

// Audit log helper. No bloqueamos la operación si falla.
async function logAudit({ entidad, entidadId, accion, detalle = null }) {
  try {
    const { userId, eleamId } = await getMyContext();
    await supabase.from("acred_audit").insert({
      eleam_id: eleamId,
      entidad,
      entidad_id: entidadId,
      accion,
      detalle,
      realizado_por: userId,
    });
  } catch (e) {
    console.warn("audit log failed", e);
  }
}

// ─────────────────────────────────────────────────────────────
// Catálogo: ámbitos y requisitos
// ─────────────────────────────────────────────────────────────

export async function getAmbitos() {
  const { data, error } = await supabase
    .from("acred_ambitos")
    .select("*")
    .order("orden", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAmbitoByCodigo(codigo) {
  const { data, error } = await supabase
    .from("acred_ambitos")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Trae todos los requisitos del ELEAM con su estado (a través de
// la vista combinada). Útil para el dashboard global.
export async function getRequisitosEleam() {
  const { eleamId } = await getMyContext();

  // Asegurar provisionamiento (idempotente). Algunos ELEAMs antiguos
  // pueden no tener filas en acred_requisitos_eleam todavía.
  await ensureProvision(eleamId);

  // Marcamos vencidos antes de leer (server function).
  await markExpired(eleamId);

  const { data, error } = await supabase
    .from("acred_requisitos_eleam")
    .select(`
      id, estado, fecha_vencimiento, no_aplica_motivo, notas,
      ultima_revision_en, ultima_revision_por,
      requisito:acred_requisitos!inner(
        id, codigo, nombre, descripcion, medio_verificador,
        obligatorio, permite_no_aplica, requiere_vencimiento,
        vigencia_dias_sugerida, orden,
        ambito:acred_ambitos!inner(id, codigo, nombre, icono, orden)
      ),
      responsable:profiles!acred_requisitos_eleam_responsable_id_fkey(id, nombre, email, rol),
      documentos:acred_documentos!acred_documentos_requisito_eleam_id_fkey(id, vigente, fecha_vencimiento)
    `)
    .eq("eleam_id", eleamId)
    .order("creado_en", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Para una sola requisito_eleam (con todo su detalle).
export async function getRequisitoEleam(reId) {
  // Fetch eleamId to scope the query explicitly — defense-in-depth alongside RLS.
  const { eleamId } = await getMyContext();
  const { data, error } = await supabase
    .from("acred_requisitos_eleam")
    .select(`
      id, estado, fecha_vencimiento, no_aplica_motivo, notas,
      ultima_revision_en, ultima_revision_por,
      eleam_id, requisito_id,
      requisito:acred_requisitos!inner(
        id, codigo, nombre, descripcion, medio_verificador,
        obligatorio, permite_no_aplica, requiere_vencimiento,
        vigencia_dias_sugerida, orden,
        ambito:acred_ambitos!inner(id, codigo, nombre, icono, orden)
      ),
      responsable:profiles!acred_requisitos_eleam_responsable_id_fkey(id, nombre, email, rol)
    `)
    .eq("id", reId)
    .eq("eleam_id", eleamId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureProvision(eleamIdOverride = null) {
  // RPC seguro (security definer) — idempotente.
  try {
    const eleamId = eleamIdOverride ?? (await getMyContext()).eleamId;
    await supabase.rpc("acred_provision_requisitos", { p_eleam_id: eleamId });
  } catch {
    // Sin contexto (e.g. superadmin sin ELEAM): no-op
  }
}

async function markExpired(eleamIdOverride = null) {
  try {
    const eleamId = eleamIdOverride ?? (await getMyContext()).eleamId;
    await supabase.rpc("acred_marcar_vencidos", { p_eleam_id: eleamId });
  } catch {
    // no-op
  }
}

// ─────────────────────────────────────────────────────────────
// Cambiar estado de un requisito
// ─────────────────────────────────────────────────────────────

export async function setRequisitoEstado(reId, payload) {
  const { userId } = await getMyContext();

  const update = {
    ...payload,
    ultima_revision_en: new Date().toISOString(),
    ultima_revision_por: userId,
    actualizado_en: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("acred_requisitos_eleam")
    .update(update)
    .eq("id", reId)
    .select()
    .single();
  if (error) throw error;

  await logAudit({
    entidad: "requisito_eleam",
    entidadId: reId,
    accion: "update",
    detalle: payload,
  });

  return data;
}

export async function marcarNoAplica(reId, motivo) {
  if (!motivo?.trim()) throw new Error("Indica un motivo.");
  return setRequisitoEstado(reId, {
    estado: "no_aplica",
    no_aplica_motivo: motivo.trim(),
    fecha_vencimiento: null,
  });
}

export async function marcarCumple(reId, fechaVencimiento) {
  return setRequisitoEstado(reId, {
    estado: "cumple",
    fecha_vencimiento: fechaVencimiento || null,
  });
}

export async function asignarResponsable(reId, profileId) {
  return setRequisitoEstado(reId, { responsable_id: profileId || null });
}

// ─────────────────────────────────────────────────────────────
// Documentos / evidencias
// ─────────────────────────────────────────────────────────────

export async function getDocumentos(reId, { incluirHistoria = false } = {}) {
  const { eleamId } = await getMyContext();
  let q = supabase
    .from("acred_documentos")
    .select("id, version, vigente, storage_path, archivo_nombre, archivo_tipo, archivo_tamanio, fecha_emision, fecha_vencimiento, notas, reemplazado_por_id, reemplazado_en, creado_en, subido_por:profiles!acred_documentos_subido_por_fkey(id, nombre, email)")
    .eq("requisito_eleam_id", reId)
    .eq("eleam_id", eleamId)
    .order("version", { ascending: false });
  if (!incluirHistoria) q = q.eq("vigente", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getSignedUrl(storagePath) {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from("documentos-acreditacion")
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);
  if (error) return null;
  return data.signedUrl;
}

export async function uploadEvidence({ reId, file, fechaEmision, fechaVencimiento, notas, reemplazo = false }) {
  const validateMsg = validateFile(file);
  if (validateMsg) throw new Error(validateMsg);

  const { userId, eleamId } = await getMyContext();

  // Calcular versión
  let nextVersion = 1;
  let toReplaceId = null;
  if (reemplazo) {
    const { data: vigente } = await supabase
      .from("acred_documentos")
      .select("id, version")
      .eq("requisito_eleam_id", reId)
      .eq("vigente", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (vigente) {
      nextVersion = (vigente.version ?? 1) + 1;
      toReplaceId = vigente.id;
    }
  }

  const safeName   = sanitizeFilename(file.name);
  const storagePath = `acreditacion/${eleamId}/req/${reId}/${Date.now()}_v${nextVersion}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("documentos-acreditacion")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("acred_documentos")
    .insert({
      eleam_id:           eleamId,
      requisito_eleam_id: reId,
      version:            nextVersion,
      vigente:            true,
      storage_path:       storagePath,
      archivo_nombre:     file.name.substring(0, 255),
      archivo_tipo:       file.type,
      archivo_tamanio:    file.size,
      fecha_emision:      fechaEmision || null,
      fecha_vencimiento:  fechaVencimiento || null,
      notas:              notas?.trim() || null,
      subido_por:         userId,
    })
    .select()
    .single();

  if (error) {
    // limpiar archivo
    await supabase.storage.from("documentos-acreditacion").remove([storagePath]);
    throw error;
  }

  // Si era reemplazo, marcar el anterior como NO vigente.
  if (toReplaceId) {
    await supabase
      .from("acred_documentos")
      .update({
        vigente: false,
        reemplazado_por_id: data.id,
        reemplazado_en: new Date().toISOString(),
      })
      .eq("id", toReplaceId);
  }

  // Si el documento trae fecha de vencimiento, sincronizarla en el requisito
  // y marcar como cumple si estaba pendiente/observado/vencido.
  const updateRequisito = {
    estado: "cumple",
    actualizado_en: new Date().toISOString(),
    ultima_revision_en: new Date().toISOString(),
    ultima_revision_por: userId,
  };
  if (fechaVencimiento) updateRequisito.fecha_vencimiento = fechaVencimiento;
  await supabase
    .from("acred_requisitos_eleam")
    .update(updateRequisito)
    .eq("id", reId);

  await logAudit({
    entidad: "documento",
    entidadId: data.id,
    accion: reemplazo ? "replace" : "create",
    detalle: { version: nextVersion, archivo: data.archivo_nombre },
  });

  return data;
}

// Borrado físico (solo admin); preferimos vigente=false para mantener historial.
export async function archiveDocumento(docId) {
  const { error } = await supabase
    .from("acred_documentos")
    .update({ vigente: false, reemplazado_en: new Date().toISOString() })
    .eq("id", docId);
  if (error) throw error;
  await logAudit({ entidad: "documento", entidadId: docId, accion: "archive" });
}

// ─────────────────────────────────────────────────────────────
// Observaciones
// ─────────────────────────────────────────────────────────────

export async function getObservaciones({ requisitoEleamId = null, soloAbiertas = false } = {}) {
  const { eleamId } = await getMyContext();
  let q = supabase
    .from("acred_observaciones")
    .select(`
      id, requisito_eleam_id, origen, descripcion, acciones_subsanacion,
      fecha, fecha_compromiso, estado, cerrada_en, cerrada_nota, creado_en,
      responsable:profiles!acred_observaciones_responsable_id_fkey(id, nombre, email),
      creador:profiles!acred_observaciones_creado_por_fkey(id, nombre, email),
      cerrador:profiles!acred_observaciones_cerrada_por_fkey(id, nombre, email),
      requisito_eleam:acred_requisitos_eleam(
        requisito:acred_requisitos(codigo, nombre, ambito:acred_ambitos(codigo, nombre))
      )
    `)
    .eq("eleam_id", eleamId)
    .order("creado_en", { ascending: false });
  if (requisitoEleamId) q = q.eq("requisito_eleam_id", requisitoEleamId);
  if (soloAbiertas) q = q.in("estado", ["abierta", "en_proceso"]);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function crearObservacion({ requisitoEleamId, origen, descripcion, accionesSubsanacion, fechaCompromiso, responsableId }) {
  if (!descripcion?.trim()) throw new Error("Describe la observación.");
  const { userId, eleamId } = await getMyContext();
  const { data, error } = await supabase
    .from("acred_observaciones")
    .insert({
      eleam_id:             eleamId,
      requisito_eleam_id:   requisitoEleamId || null,
      origen,
      descripcion:          descripcion.trim(),
      acciones_subsanacion: accionesSubsanacion?.trim() || null,
      fecha_compromiso:     fechaCompromiso || null,
      responsable_id:       responsableId || null,
      creado_por:           userId,
    })
    .select()
    .single();
  if (error) throw error;

  // Si la observación se vincula a un requisito, lo marcamos como observado.
  if (requisitoEleamId) {
    await supabase
      .from("acred_requisitos_eleam")
      .update({ estado: "observado", actualizado_en: new Date().toISOString() })
      .eq("id", requisitoEleamId);
  }

  await logAudit({
    entidad: "observacion",
    entidadId: data.id,
    accion: "create",
    detalle: { origen, requisito_eleam_id: requisitoEleamId },
  });

  return data;
}

export async function actualizarObservacion(id, payload) {
  const { data, error } = await supabase
    .from("acred_observaciones")
    .update({ ...payload, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logAudit({ entidad: "observacion", entidadId: id, accion: "update", detalle: payload });
  return data;
}

export async function cerrarObservacion(id, nota) {
  const { userId } = await getMyContext();
  const { data, error } = await supabase
    .from("acred_observaciones")
    .update({
      estado: "cerrada",
      cerrada_en: new Date().toISOString(),
      cerrada_por: userId,
      cerrada_nota: nota?.trim() || null,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id)
    .select(`*, requisito_eleam_id`)
    .single();
  if (error) throw error;

  // Si la observación cerrada estaba vinculada a un requisito y no quedan
  // observaciones abiertas para ese requisito, devolverlo a "pendiente".
  if (data.requisito_eleam_id) {
    const { count } = await supabase
      .from("acred_observaciones")
      .select("id", { head: true, count: "exact" })
      .eq("requisito_eleam_id", data.requisito_eleam_id)
      .in("estado", ["abierta", "en_proceso"]);
    if ((count ?? 0) === 0) {
      await supabase
        .from("acred_requisitos_eleam")
        .update({ estado: "pendiente", actualizado_en: new Date().toISOString() })
        .eq("id", data.requisito_eleam_id)
        .eq("estado", "observado");
    }
  }

  await logAudit({ entidad: "observacion", entidadId: id, accion: "close" });
  return data;
}

// ─────────────────────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────────────────────

export async function getAuditTrail({ entidad = null, entidadId = null, limit = 50 } = {}) {
  const { eleamId } = await getMyContext();
  let q = supabase
    .from("acred_audit")
    .select("id, entidad, entidad_id, accion, detalle, realizado_en, realizado_por:profiles!acred_audit_realizado_por_fkey(id, nombre, email)")
    .eq("eleam_id", eleamId)
    .order("realizado_en", { ascending: false })
    .limit(limit);
  if (entidad) q = q.eq("entidad", entidad);
  if (entidadId) q = q.eq("entidad_id", entidadId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// Resumen / KPIs
// ─────────────────────────────────────────────────────────────

const COMPLIANCE_STATES = new Set(["cumple", "no_aplica"]);

export function buildResumen(requisitosEleam) {
  const all = requisitosEleam ?? [];
  // Excluimos no_aplica del denominador estricto, pero contamos cumple en
  // numerador. Estilo "compliance = cumple / (total - no_aplica)".
  const noAplica = all.filter((r) => r.estado === "no_aplica").length;
  const cumple   = all.filter((r) => r.estado === "cumple").length;
  const denominador = all.length - noAplica;
  const porcentaje = denominador > 0 ? Math.round((cumple / denominador) * 100) : 100;

  const porEstado = {};
  const porEstadoList = {};
  for (const r of all) {
    porEstado[r.estado] = (porEstado[r.estado] ?? 0) + 1;
    if (!porEstadoList[r.estado]) porEstadoList[r.estado] = [];
    porEstadoList[r.estado].push(r);
  }

  const hasVigenteDoc = (r) => (r.documentos ?? []).some((d) => d.vigente);
  const evidenciasVigentes = all.reduce((count, r) => (
    count + (r.documentos ?? []).filter((d) => d.vigente).length
  ), 0);
  const requisitosConEvidencia = all.filter(hasVigenteDoc).length;
  const sinEvidencia = all.filter((r) => r.estado !== "no_aplica" && !hasVigenteDoc(r));

  // Por ámbito
  const porAmbito = {};
  for (const r of all) {
    const a = r.requisito?.ambito;
    if (!a) continue;
    if (!porAmbito[a.codigo]) {
      porAmbito[a.codigo] = {
        codigo: a.codigo, nombre: a.nombre, icono: a.icono ?? null,
        total: 0, cumple: 0, no_aplica: 0, vencido: 0, observado: 0,
        no_cumple: 0, pendiente: 0, evidencias: 0, sin_evidencia: 0,
      };
    }
    const slot = porAmbito[a.codigo];
    slot.total += 1;
    slot[r.estado] = (slot[r.estado] ?? 0) + 1;
    if (hasVigenteDoc(r)) slot.evidencias += 1;
    else if (r.estado !== "no_aplica") slot.sin_evidencia += 1;
  }
  const ambitos = Object.values(porAmbito)
    .map((a) => {
      const denom = a.total - (a.no_aplica ?? 0);
      const pct   = denom > 0 ? Math.round(((a.cumple ?? 0) / denom) * 100) : 100;
      return { ...a, porcentaje: pct };
    })
    .sort((a, b) => a.codigo.localeCompare(b.codigo));

  // Vencimientos próximos (en 30 días) y vencidos
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limite = new Date(today.getTime() + 30 * 86400000);

  const porVencer = [];
  const vencidos  = [];
  for (const r of all) {
    if (!r.fecha_vencimiento) continue;
    const fv = new Date(r.fecha_vencimiento);
    if (Number.isNaN(fv.valueOf())) continue;
    if (fv < today)      vencidos.push(r);
    else if (fv <= limite) porVencer.push(r);
  }

  return {
    total: all.length,
    porEstado,
    porEstadoList,
    porcentaje,
    ambitos,
    pendientes: (porEstado.pendiente ?? 0) + (porEstado.observado ?? 0) + (porEstado.no_cumple ?? 0) + (porEstado.vencido ?? 0),
    vencidos,
    porVencer,
    cumple,
    noAplica,
    evidenciasVigentes,
    requisitosConEvidencia,
    sinEvidencia,
  };
}

export function isComplianceState(estado) {
  return COMPLIANCE_STATES.has(estado);
}

// ─────────────────────────────────────────────────────────────
// Utilidades de fecha
// ─────────────────────────────────────────────────────────────

export function diasHasta(fechaIso) {
  if (!fechaIso) return null;
  const f = new Date(fechaIso);
  if (Number.isNaN(f.valueOf())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  f.setHours(0, 0, 0, 0);
  return Math.ceil((f - today) / 86400000);
}
