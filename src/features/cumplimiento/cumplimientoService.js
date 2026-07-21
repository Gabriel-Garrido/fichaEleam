import { getEleamContext as getCtx } from "../../services/serviceContext";

// ── Hitos del período transitorio (Decreto N°20, arts. transitorios) ────────
// El decreto entró en vigencia el 01-10-2025. Plazo general de adecuación:
// 3 años; certificación de incendios: 5 años.

export const HITOS_TRANSITORIOS = [
  {
    id: "vigencia",
    label: "Vigencia del Decreto N°20",
    detalle: "El decreto está vigente; los requisitos nuevos aplican a todo ELEAM.",
    fecha: "2025-10-01",
  },
  {
    id: "plazo_general",
    label: "Plazo general de adecuación (3 años)",
    detalle: "Fecha límite para cerrar las brechas generales de adecuación al decreto.",
    fecha: "2028-10-01",
  },
  {
    id: "plazo_incendios",
    label: "Certificación de incendios (5 años)",
    detalle: "Fecha límite para la certificación de prevención y protección contra incendios.",
    fecha: "2030-10-01",
  },
];

export function diasRestantes(fechaIso) {
  const [y, m, d] = String(fechaIso).split("-").map(Number);
  const target = new Date(y, (m || 1) - 1, d || 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export function hitoTone(dias) {
  if (dias < 0) return "rose";
  if (dias <= 180) return "amber";
  return "emerald";
}

export function currentPeriodo(date = new Date()) {
  const trimestre = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-T${trimestre}`;
}

export function isValidPeriodoSenama(periodo) {
  return /^\d{4}-T[1-4]$/.test(String(periodo ?? ""));
}

// ── Matriz de brechas transitorias ──────────────────────────────────────────

const BRECHA_SELECT = "*, responsable:responsable_id(id, nombre)";

export async function getBrechas() {
  const { sb, eleamId } = await getCtx();
  const { data, error } = await sb
    .from("transitorio_brechas")
    .select(BRECHA_SELECT)
    .eq("eleam_id", eleamId)
    .order("estado", { ascending: true })
    .order("plazo", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveBrecha(payload, brechaId = null) {
  const { sb, userId, eleamId } = await getCtx();
  const row = {
    eleam_id: eleamId,
    requisito: payload.requisito?.trim(),
    descripcion: payload.descripcion?.trim() || null,
    riesgo: payload.riesgo || "medio",
    estado: payload.estado || "pendiente",
    plazo: payload.plazo || null,
    plan_accion: payload.plan_accion?.trim() || null,
    responsable_id: payload.responsable_id || null,
    notas_seguimiento: payload.notas_seguimiento?.trim() || null,
    cerrado_en: payload.estado === "cerrada" ? new Date().toISOString() : null,
    actualizado_por: userId,
  };

  const query = brechaId
    ? sb.from("transitorio_brechas").update(row).eq("id", brechaId).eq("eleam_id", eleamId)
    : sb.from("transitorio_brechas").insert({ ...row, creado_por: userId });
  const { data, error } = await query.select(BRECHA_SELECT).single();
  if (error) throw error;
  return data;
}

export async function deleteBrecha(brechaId) {
  const { sb, eleamId } = await getCtx();
  const { error } = await sb
    .from("transitorio_brechas")
    .delete()
    .eq("id", brechaId)
    .eq("eleam_id", eleamId);
  if (error) throw error;
}

// ── Protocolos operativos (DS20 Art. 25 N°1 y N°4) ─────────────────────────

export async function getProtocolos() {
  const { sb, eleamId } = await getCtx();
  const { data, error } = await sb
    .from("protocolos_eleam")
    .select("*")
    .eq("eleam_id", eleamId)
    .order("tipo", { ascending: true })
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveProtocolo(payload, protocoloId = null) {
  const { sb, userId, eleamId } = await getCtx();
  const row = {
    eleam_id: eleamId,
    tipo: payload.tipo,
    titulo: payload.titulo?.trim(),
    contenido: payload.contenido?.trim() || null,
    estado: payload.estado || "borrador",
    fecha_aprobacion: payload.fecha_aprobacion || null,
    fecha_revision: payload.fecha_revision || null,
    responsable_id: payload.responsable_id || null,
    actualizado_por: userId,
  };

  const query = protocoloId
    ? sb.from("protocolos_eleam").update(row).eq("id", protocoloId).eq("eleam_id", eleamId)
    : sb.from("protocolos_eleam").insert({ ...row, creado_por: userId });
  const { data, error } = await query.select().single();
  if (error) {
    if (error.code === "23505") {
      throw new Error(`Ya existe un protocolo vigente de tipo "${PROTOCOLO_TIPO_LABEL[payload.tipo] ?? payload.tipo}". Pasa el anterior a revisión antes de publicar uno nuevo.`);
    }
    throw error;
  }
  return data;
}

export async function deleteProtocolo(protocoloId) {
  const { sb, eleamId } = await getCtx();
  const { error } = await sb
    .from("protocolos_eleam")
    .delete()
    .eq("id", protocoloId)
    .eq("eleam_id", eleamId);
  if (error) throw error;
}

// ── Reportes SENAMA (DS20 Art. 31) ─────────────────────────────────────────

const REPORTE_SELECT = "*, generador:generado_por(id, nombre), emisor:enviado_por(id, nombre)";

export async function getReportesSenama() {
  const { sb, eleamId } = await getCtx();
  const { data, error } = await sb
    .from("reportes_senama")
    .select(REPORTE_SELECT)
    .eq("eleam_id", eleamId)
    .order("periodo", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function generarReporteSenama(periodo, observaciones = "") {
  if (!isValidPeriodoSenama(periodo)) {
    throw new Error("El período SENAMA debe tener formato YYYY-T1, YYYY-T2, YYYY-T3 o YYYY-T4.");
  }
  const { sb, userId, eleamId } = await getCtx();
  const { data: datos, error: rpcError } = await sb.rpc("generate_senama_report_data");
  if (rpcError) throw rpcError;

  const { data, error } = await sb
    .from("reportes_senama")
    .upsert({
      eleam_id: eleamId,
      periodo,
      estado: "generado",
      datos,
      observaciones: observaciones?.trim() || null,
      generado_por: userId,
    }, { onConflict: "eleam_id,periodo" })
    .select(REPORTE_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function marcarReporteEnviado(reporteId, comprobante = "") {
  const { sb, userId, eleamId } = await getCtx();
  const { data, error } = await sb
    .from("reportes_senama")
    .update({
      estado: "enviado",
      comprobante: comprobante?.trim() || null,
      enviado_por: userId,
      enviado_en: new Date().toISOString(),
    })
    .eq("id", reporteId)
    .eq("eleam_id", eleamId)
    .select(REPORTE_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReporteSenama(reporteId) {
  const { sb, eleamId } = await getCtx();
  const { error } = await sb
    .from("reportes_senama")
    .delete()
    .eq("id", reporteId)
    .eq("eleam_id", eleamId);
  if (error) throw error;
}

// ── Constantes ──────────────────────────────────────────────────────────────

export const BRECHA_RIESGO_LABEL = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
  critico: "Crítico",
};

export const BRECHA_RIESGO_TONE = {
  bajo: "emerald",
  medio: "sky",
  alto: "amber",
  critico: "rose",
};

export const BRECHA_ESTADO_LABEL = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  cerrada: "Cerrada",
};

export const BRECHA_ESTADO_TONE = {
  pendiente: "amber",
  en_proceso: "sky",
  cerrada: "emerald",
};

export const PROTOCOLO_TIPO_LABEL = {
  urgencias_medicas: "Urgencias médicas",
  fallecimiento: "Fallecimiento",
  ingreso: "Ingreso de residentes",
  egreso: "Egreso de residentes",
  aseo_desinfeccion: "Aseo y desinfección",
  otro: "Otro",
};

export const PROTOCOLOS_REQUERIDOS = [
  "urgencias_medicas",
  "fallecimiento",
  "ingreso",
  "egreso",
  "aseo_desinfeccion",
];

export function protocolosFaltantes(protocolos = []) {
  const vigentesPorTipo = new Set(
    protocolos
      .filter((item) => item.estado === "vigente")
      .map((item) => item.tipo)
  );
  return PROTOCOLOS_REQUERIDOS.filter((tipo) => !vigentesPorTipo.has(tipo));
}

export const PROTOCOLO_TIPO_DESC = {
  urgencias_medicas: "Pasos de actuación, contactos y derivación ante una urgencia médica.",
  fallecimiento: "Manejo digno, notificación a la familia y cierre administrativo.",
  ingreso: "Evaluación, consentimiento y documentación del ingreso.",
  egreso: "Derivación, entrega de pertenencias y cierre de carpeta.",
  aseo_desinfeccion: "Rutinas, responsables y productos por área del ELEAM.",
  otro: "Otros protocolos operativos del establecimiento.",
};

export const PROTOCOLO_ESTADO_LABEL = {
  borrador: "Borrador",
  vigente: "Vigente",
  revision: "En revisión",
};

export const PROTOCOLO_ESTADO_TONE = {
  borrador: "slate",
  vigente: "emerald",
  revision: "amber",
};

export const REPORTE_ESTADO_LABEL = {
  generado: "Generado",
  enviado: "Enviado a SENAMA",
};

export const REPORTE_ESTADO_TONE = {
  generado: "amber",
  enviado: "emerald",
};
