import { ensureSupabase, getEleamContext as getMyEleamContext } from "../../services/serviceContext";

export { getMyEleamContext };

const CONSENT_SELECT = `
  id, eleam_id, residente_id, fecha_consentimiento, firmante_nombre,
  firmante_rut, firmante_tipo, relacion_residente,
  acepta_ingreso_voluntario, acepta_derechos_deberes, acepta_reglamento_interno,
  residente_puede_firmar, firma_data_url, pdf_storage_path, observaciones,
  registrado_por, creado_en, actualizado_en
`;

const HEALTH_CENTER_SELECT = `
  id, eleam_id, nombre, tipo, comuna, direccion, telefono, email,
  contacto_nombre, notas, activo, creado_en, actualizado_en
`;

const HEALTH_NETWORK_SELECT = `
  id, eleam_id, residente_id, health_center_id, sistema_salud, inscrito_aps,
  numero_ficha, medico_referencia, telefono_referencia, observaciones,
  actualizado_por, creado_en, actualizado_en,
  centro:health_centers(id, nombre, tipo, comuna, telefono)
`;

const HEALTH_CONTROL_SELECT = `
  id, eleam_id, residente_id, health_center_id, tipo, estado,
  fecha_programada, fecha_realizada, especialidad, profesional,
  motivo, resultado, proximo_control, documento_path, registrado_por,
  creado_en, actualizado_en,
  centro:health_centers(id, nombre, tipo)
`;


export async function getResidentDs20Bundle(residenteId) {
  if (!residenteId) return { consents: [], centers: [], network: null, controls: [], compliance: null };
  const sb = ensureSupabase();
  const { eleamId } = await getMyEleamContext();
  const [consents, centers, network, controls, compliance] = await Promise.all([
    sb
      .from("resident_consents")
      .select(CONSENT_SELECT)
      .eq("residente_id", residenteId)
      .order("fecha_consentimiento", { ascending: false }),
    sb
      .from("health_centers")
      .select(HEALTH_CENTER_SELECT)
      .eq("eleam_id", eleamId)
      .eq("activo", true)
      .order("nombre", { ascending: true }),
    sb
      .from("resident_health_network")
      .select(HEALTH_NETWORK_SELECT)
      .eq("residente_id", residenteId)
      .maybeSingle(),
    sb
      .from("health_controls")
      .select(HEALTH_CONTROL_SELECT)
      .eq("residente_id", residenteId)
      .order("fecha_programada", { ascending: false })
      .limit(20),
    sb.rpc("ds20_resident_compliance_summary"),
  ]);

  for (const result of [consents, centers, network, controls, compliance]) {
    if (result.error) throw result.error;
  }

  return {
    consents: consents.data ?? [],
    centers: centers.data ?? [],
    network: network.data ?? null,
    controls: controls.data ?? [],
    compliance: (compliance.data ?? []).find((row) => row.residente_id === residenteId) ?? null,
  };
}

export async function uploadDs20Document({ eleamId, folder, file, contentType = "application/pdf" }) {
  const sb = ensureSupabase();
  const safeFolder = String(folder || "general").replace(/[^a-zA-Z0-9/_-]/g, "_");
  const suffix = Math.random().toString(36).slice(2, 10);
  const storagePath = `ds20/${eleamId}/${safeFolder}/${Date.now()}-${suffix}.pdf`;
  const { error } = await sb.storage
    .from("documentos-eleam")
    .upload(storagePath, file, { contentType, upsert: false });
  if (error) throw error;
  return storagePath;
}

export async function createResidentConsent({ resident, eleam, consent, pdfBlob }) {
  const sb = ensureSupabase();
  const { userId, eleamId } = await getMyEleamContext();
  const pdfPath = pdfBlob
    ? await uploadDs20Document({
        eleamId,
        folder: `residentes/${resident.id}/consentimientos`,
        file: pdfBlob,
      })
    : null;

  const { data, error } = await sb
    .from("resident_consents")
    .insert({
      eleam_id: eleam?.id ?? eleamId,
      residente_id: resident.id,
      fecha_consentimiento: consent.fecha_consentimiento,
      firmante_nombre: consent.firmante_nombre,
      firmante_rut: consent.firmante_rut || null,
      firmante_tipo: consent.firmante_tipo,
      relacion_residente: consent.relacion_residente || null,
      acepta_ingreso_voluntario: true,
      acepta_derechos_deberes: true,
      acepta_reglamento_interno: true,
      residente_puede_firmar: consent.residente_puede_firmar,
      firma_data_url: consent.firma_data_url,
      pdf_storage_path: pdfPath,
      observaciones: consent.observaciones || null,
      registrado_por: userId,
    })
    .select(CONSENT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function getSignedDs20Url(storagePath) {
  if (!storagePath) return null;
  const sb = ensureSupabase();
  const { data, error } = await sb.storage
    .from("documentos-eleam")
    .createSignedUrl(storagePath, 60 * 60);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function upsertHealthCenter(payload) {
  const sb = ensureSupabase();
  const { eleamId } = await getMyEleamContext();
  const clean = {
    eleam_id: eleamId,
    nombre: payload.nombre?.trim(),
    tipo: payload.tipo || "aps",
    comuna: payload.comuna || null,
    direccion: payload.direccion || null,
    telefono: payload.telefono || null,
    email: payload.email || null,
    contacto_nombre: payload.contacto_nombre || null,
    notas: payload.notas || null,
    activo: payload.activo !== false,
  };
  const query = payload.id
    ? sb.from("health_centers").update(clean).eq("id", payload.id)
    : sb.from("health_centers").insert(clean);
  const { data, error } = await query.select(HEALTH_CENTER_SELECT).single();
  if (error) throw error;
  return data;
}

export async function upsertResidentHealthNetwork(residenteId, payload) {
  const sb = ensureSupabase();
  const { userId, eleamId } = await getMyEleamContext();
  const { data, error } = await sb
    .from("resident_health_network")
    .upsert({
      eleam_id: eleamId,
      residente_id: residenteId,
      health_center_id: payload.health_center_id || null,
      sistema_salud: payload.sistema_salud || null,
      inscrito_aps: payload.inscrito_aps === "" ? null : payload.inscrito_aps,
      numero_ficha: payload.numero_ficha || null,
      medico_referencia: payload.medico_referencia || null,
      telefono_referencia: payload.telefono_referencia || null,
      observaciones: payload.observaciones || null,
      actualizado_por: userId,
      actualizado_en: new Date().toISOString(),
    }, { onConflict: "residente_id" })
    .select(HEALTH_NETWORK_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function saveHealthControl(residenteId, payload) {
  const sb = ensureSupabase();
  const { userId, eleamId } = await getMyEleamContext();
  const row = {
    eleam_id: eleamId,
    residente_id: residenteId,
    health_center_id: payload.health_center_id || null,
    tipo: payload.tipo || "control",
    estado: payload.estado || "programado",
    fecha_programada: payload.fecha_programada,
    fecha_realizada: payload.fecha_realizada || null,
    especialidad: payload.especialidad || null,
    profesional: payload.profesional || null,
    motivo: payload.motivo || null,
    resultado: payload.resultado || null,
    proximo_control: payload.proximo_control || null,
    registrado_por: userId,
    actualizado_en: new Date().toISOString(),
  };
  const query = payload.id
    ? sb.from("health_controls").update(row).eq("id", payload.id)
    : sb.from("health_controls").insert(row);
  const { data, error } = await query.select(HEALTH_CONTROL_SELECT).single();
  if (error) throw error;
  return data;
}

export async function getDs20ResidentCompliance() {
  const sb = ensureSupabase();
  const { data, error } = await sb.rpc("ds20_resident_compliance_summary");
  if (error) throw error;
  return data ?? [];
}

// ── Persona significativa (DS20 Art. 18) ────────────────────

export async function getPersonaSignificativa(residenteId) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("persona_significativa")
    .select("*")
    .eq("residente_id", residenteId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertPersonaSignificativa(residenteId, payload) {
  const sb = ensureSupabase();
  const { userId, eleamId } = await getMyEleamContext();
  const clean = {
    eleam_id: eleamId,
    residente_id: residenteId,
    nombre: payload.nombre?.trim(),
    parentesco: payload.parentesco?.trim() || null,
    telefono: payload.telefono?.trim() || null,
    email: payload.email?.trim() || null,
    vive_con_residente: Boolean(payload.vive_con_residente),
    descripcion_relacion: payload.descripcion_relacion?.trim() || null,
    preferencias_visita: payload.preferencias_visita?.trim() || null,
    actualizado_por: userId,
    actualizado_en: new Date().toISOString(),
  };
  const { data, error } = await sb
    .from("persona_significativa")
    .upsert(clean, { onConflict: "residente_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ── Actividades sociales (DS20 Art. 20) ─────────────────────

export async function getActividadesSociales(residenteId) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("actividades_sociales")
    .select("*")
    .eq("residente_id", residenteId)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveActividadSocial(residenteId, payload) {
  const sb = ensureSupabase();
  const { userId, eleamId } = await getMyEleamContext();
  const row = {
    eleam_id: eleamId,
    residente_id: residenteId,
    nombre: payload.nombre?.trim(),
    tipo: payload.tipo,
    descripcion: payload.descripcion?.trim() || null,
    frecuencia: payload.frecuencia || null,
    preferencia: payload.preferencia || null,
    fecha_registro: payload.fecha_registro || new Date().toISOString().slice(0, 10),
    registrado_por: userId,
  };
  const query = payload.id
    ? sb.from("actividades_sociales").update(row).eq("id", payload.id)
    : sb.from("actividades_sociales").insert(row);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteActividadSocial(id) {
  const sb = ensureSupabase();
  const { error } = await sb.from("actividades_sociales").delete().eq("id", id);
  if (error) throw error;
}

// Inventario de bienes (DS20 Art. 22) vive en features/emergencias/emergenciasService.js,
// donde se gestiona junto al plan de emergencias (misma página).

// ── Constantes compartidas (ResidentDs20Tab + FamiliarPortal) ──

export const ACTIVIDAD_TIPOS = [
  ["recreativa", "Recreativa"],
  ["cultural", "Cultural"],
  ["espiritual", "Espiritual"],
  ["fisica", "Física"],
  ["social", "Social"],
  ["terapeutica", "Terapéutica"],
  ["otro", "Otra"],
];
export const ACTIVIDAD_TIPO_LABEL = Object.fromEntries(ACTIVIDAD_TIPOS);

export const ACTIVIDAD_FRECUENCIAS = [
  ["diaria", "Diaria"],
  ["semanal", "Semanal"],
  ["mensual", "Mensual"],
  ["eventual", "Eventual"],
];
export const ACTIVIDAD_FRECUENCIA_LABEL = Object.fromEntries(ACTIVIDAD_FRECUENCIAS);

export const ACTIVIDAD_PREFERENCIAS = [
  ["gusta", "Le gusta"],
  ["no_gusta", "No le gusta"],
  ["indiferente", "Indiferente"],
];
export const ACTIVIDAD_PREFERENCIA_LABEL = Object.fromEntries(ACTIVIDAD_PREFERENCIAS);

export const CONTROL_ESTADO_LABEL = {
  programado: "Programado",
  realizado: "Realizado",
  cancelado: "Cancelado",
  inasistente: "Inasistente",
};
