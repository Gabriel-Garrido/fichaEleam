import { getEleamContext as getCtx } from "../../services/serviceContext";

const RECLAMO_SELECT = "*, residente:residente_id(id, nombre, apellido)";

export async function getReclamos({ estado = null, tipo = null } = {}) {
  const { sb, eleamId } = await getCtx();
  let query = sb
    .from("reclamos_sugerencias")
    .select(RECLAMO_SELECT)
    .eq("eleam_id", eleamId)
    .order("creado_en", { ascending: false });
  if (estado) query = query.eq("estado", estado);
  if (tipo) query = query.eq("tipo", tipo);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function nextFolio(sb, eleamId) {
  const { data, error } = await sb.rpc("generate_folio_reclamo", { p_eleam_id: eleamId });
  if (error) throw error;
  return data;
}

export async function createReclamo(payload) {
  const { sb, userId, eleamId } = await getCtx();
  const folio = await nextFolio(sb, eleamId);

  const row = {
    eleam_id: eleamId,
    folio,
    tipo: payload.tipo,
    canal: payload.canal || "presencial",
    descripcion: payload.descripcion?.trim(),
    solicitante_nombre: payload.solicitante_nombre?.trim() || null,
    solicitante_tipo: payload.solicitante_tipo || null,
    residente_id: payload.residente_id || null,
    estado: "abierto",
    prioridad: payload.prioridad || "normal",
    categoria: payload.categoria || null,
    fecha_compromiso: payload.fecha_compromiso || null,
    visita_familiar_origen: payload.visita_familiar_origen === true,
    registrado_por: userId,
  };

  const { data, error } = await sb
    .from("reclamos_sugerencias")
    .insert(row)
    .select(RECLAMO_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateReclamoEstado(id, payload) {
  const { sb, userId, eleamId } = await getCtx();

  const row = {
    estado: payload.estado,
    prioridad: payload.prioridad,
    categoria: payload.categoria || null,
    fecha_compromiso: payload.fecha_compromiso || null,
  };

  if (payload.respuesta?.trim()) {
    row.respuesta = payload.respuesta.trim();
    row.fecha_respuesta = new Date().toISOString();
    row.respondido_por = userId;
  }

  const { data, error } = await sb
    .from("reclamos_sugerencias")
    .update(row)
    .eq("id", id)
    .eq("eleam_id", eleamId)
    .select(RECLAMO_SELECT)
    .single();
  if (error) throw error;
  return data;
}

// Usado por FamiliarPortal. visita_familiar_origen=true es requerido por la
// RLS para que un familiar pueda insertar y luego leer su propio mensaje.
export async function createReclamoFamiliar(payload) {
  const { sb, userId, eleamId } = await getCtx();
  const folio = await nextFolio(sb, eleamId);

  const row = {
    eleam_id: eleamId,
    folio,
    tipo: payload.tipo,
    canal: "familiar_portal",
    descripcion: payload.descripcion?.trim(),
    solicitante_nombre: payload.solicitante_nombre?.trim() || null,
    solicitante_tipo: "familiar",
    residente_id: payload.residente_id || null,
    estado: "abierto",
    prioridad: "normal",
    categoria: payload.categoria || null,
    visita_familiar_origen: true,
    registrado_por: userId,
  };

  const { data, error } = await sb
    .from("reclamos_sugerencias")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Constantes ─────────────────────────────────────────────────────────────

export const RECLAMO_TIPO_LABEL = {
  reclamo: "Reclamo",
  sugerencia: "Sugerencia",
  felicitacion: "Felicitación",
  consulta: "Consulta",
};

export const RECLAMO_TIPO_TONE = {
  reclamo: "rose",
  sugerencia: "primary",
  felicitacion: "emerald",
  consulta: "sky",
};

export const RECLAMO_CANAL_LABEL = {
  presencial: "Presencial",
  escrito: "Escrito",
  telefonico: "Telefónico",
  email: "Email",
  libro_reclamos: "Libro de reclamos",
  familiar_portal: "Portal familiar",
};

export const RECLAMO_ESTADO_LABEL = {
  abierto: "Abierto",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  derivado: "Derivado",
};

export const RECLAMO_ESTADO_TONE = {
  abierto: "amber",
  en_proceso: "sky",
  resuelto: "emerald",
  derivado: "slate",
};

export const RECLAMO_PRIORIDAD_LABEL = {
  baja: "Baja",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export const RECLAMO_PRIORIDAD_TONE = {
  baja: "slate",
  normal: "sky",
  alta: "amber",
  urgente: "rose",
};

export const RECLAMO_CATEGORIA_LABEL = {
  atencion: "Atención",
  alimentacion: "Alimentación",
  infraestructura: "Infraestructura",
  higiene: "Higiene",
  trato: "Trato",
  medicacion: "Medicación",
  actividades: "Actividades",
  administrativo: "Administrativo",
  otro: "Otro",
};

export const RECLAMO_SOL_TIPO_LABEL = {
  residente: "Residente",
  familiar: "Familiar",
  funcionario: "Funcionario",
  visita: "Visita",
  anonimo: "Anónimo",
};
