import { getEleamContext as getCtx } from "../../services/serviceContext";

const PROTOCOLO_SELECT = `
  id, eleam_id, tipo, titulo, contenido, estado,
  fecha_aprobacion, fecha_revision, responsable_id,
  creado_por, actualizado_por, creado_en, actualizado_en
`;
const PROTOCOLO_ESTADOS = new Set(["borrador", "vigente", "revision"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value) {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export const PROTOCOLO_TIPO_LABEL = {
  ingreso_egreso: "Ingreso y egreso",
  urgencias_medicas: "Urgencias médicas",
  fallecimiento: "Fallecimiento",
};

export const PROTOCOLO_TIPO_DESC = {
  ingreso_egreso: "Inducción, información, equipo, servicios disponibles y condiciones de egreso.",
  urgencias_medicas: "Pasos, responsables, contactos y derivación ante una urgencia médica.",
  fallecimiento: "Actuación, aviso a la familia y resguardo digno del residente.",
};

export const PROTOCOLOS_REQUERIDOS = Object.keys(PROTOCOLO_TIPO_LABEL);

export const PROTOCOLO_ESTADO_LABEL = {
  borrador: "Por completar",
  vigente: "Vigente",
  revision: "Revisar",
};

export const PROTOCOLO_ESTADO_TONE = {
  borrador: "amber",
  vigente: "emerald",
  revision: "rose",
};

export async function getProtocolos() {
  const { sb, eleamId } = await getCtx();
  const { data, error } = await sb
    .from("protocolos_eleam")
    .select(PROTOCOLO_SELECT)
    .eq("eleam_id", eleamId)
    .order("tipo", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveProtocolo(payload, protocoloId = null) {
  const clean = validateProtocolPayload(payload);
  const { sb, userId, eleamId } = await getCtx();
  const row = {
    eleam_id: eleamId,
    tipo: clean.tipo,
    titulo: PROTOCOLO_TIPO_LABEL[clean.tipo],
    contenido: clean.contenido,
    estado: clean.estado,
    fecha_aprobacion: clean.estado === "vigente" ? clean.fecha_aprobacion : null,
    fecha_revision: clean.fecha_revision,
    actualizado_por: userId,
  };

  const query = protocoloId
    ? sb.from("protocolos_eleam").update(row).eq("id", protocoloId).eq("eleam_id", eleamId)
    : sb.from("protocolos_eleam").insert({ ...row, creado_por: userId });
  const { data, error } = await query.select(PROTOCOLO_SELECT).single();
  if (error) throw error;
  return data;
}

export function validateProtocolPayload(payload = {}) {
  if (!PROTOCOLOS_REQUERIDOS.includes(payload.tipo)) {
    throw new Error("Selecciona un protocolo obligatorio válido.");
  }
  const contenido = String(payload.contenido ?? "").trim();
  if (contenido.length < 3 || contenido.length > 20000) {
    throw new Error("Describe el protocolo usando entre 3 y 20.000 caracteres.");
  }
  const estado = payload.estado || "borrador";
  if (!PROTOCOLO_ESTADOS.has(estado)) {
    throw new Error("Selecciona un estado válido para el protocolo.");
  }
  const fechaAprobacion = payload.fecha_aprobacion || null;
  const fechaRevision = payload.fecha_revision || null;
  for (const [label, value] of [["aprobación", fechaAprobacion], ["revisión", fechaRevision]]) {
    if (value && !isValidIsoDate(value)) throw new Error(`La fecha de ${label} no es válida.`);
  }
  if (estado === "vigente" && !fechaAprobacion) {
    throw new Error("Indica la fecha de aprobación para marcar el protocolo como vigente.");
  }
  if (fechaAprobacion && fechaRevision && fechaRevision < fechaAprobacion) {
    throw new Error("La fecha de revisión debe ser posterior a la aprobación.");
  }
  return {
    tipo: payload.tipo,
    contenido,
    estado,
    fecha_aprobacion: fechaAprobacion,
    fecha_revision: fechaRevision,
  };
}

export function protocolosFaltantes(protocolos = []) {
  const vigentes = new Set(
    protocolos.filter((item) => item.estado === "vigente").map((item) => item.tipo),
  );
  return PROTOCOLOS_REQUERIDOS.filter((tipo) => !vigentes.has(tipo));
}
