import { ensureSupabase, getEleamContext as getCtx } from "../../services/serviceContext";

// ── Plan de emergencias ────────────────────────────────────────────────────

export async function getPlanEmergencias() {
  const { sb, eleamId } = await getCtx();
  const { data, error } = await sb
    .from("plan_emergencias")
    .select("*")
    .eq("eleam_id", eleamId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function savePlanEmergencias(payload, planId = null) {
  const { sb, userId, eleamId } = await getCtx();
  const row = {
    eleam_id: eleamId,
    titulo: payload.titulo?.trim() || "Plan de Emergencias y Desastres",
    estado: payload.estado || "borrador",
    objetivo_general: payload.objetivo_general?.trim() || null,
    alcance: payload.alcance?.trim() || null,
    responsable_id: payload.responsable_id || null,
    contactos_emergencia: payload.contactos_emergencia || null,
    fecha_aprobacion: payload.fecha_aprobacion || null,
    fecha_revision: payload.fecha_revision || null,
    actualizado_por: userId,
  };

  const query = planId
    ? sb.from("plan_emergencias").update(row).eq("id", planId).eq("eleam_id", eleamId)
    : sb.from("plan_emergencias").insert({ ...row, creado_por: userId });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

// ── Escenarios ─────────────────────────────────────────────────────────────

export async function getEscenarios(planId) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("escenarios_emergencia")
    .select("*")
    .eq("plan_id", planId)
    .order("orden", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveEscenario(planId, payload, escenarioId = null) {
  const { sb, eleamId } = await getCtx();
  const row = {
    eleam_id: eleamId,
    plan_id: planId,
    nombre: payload.nombre?.trim(),
    tipo: payload.tipo,
    descripcion: payload.descripcion?.trim() || null,
    procedimiento: payload.procedimiento?.trim() || null,
    responsable_id: payload.responsable_id || null,
    recursos_necesarios: payload.recursos_necesarios?.trim() || null,
    punto_encuentro: payload.punto_encuentro?.trim() || null,
    orden: Number(payload.orden ?? 0),
  };

  const query = escenarioId
    ? sb.from("escenarios_emergencia").update(row).eq("id", escenarioId).eq("eleam_id", eleamId)
    : sb.from("escenarios_emergencia").insert(row);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function deleteEscenario(escenarioId) {
  const { sb, eleamId } = await getCtx();
  const { error } = await sb
    .from("escenarios_emergencia")
    .delete()
    .eq("id", escenarioId)
    .eq("eleam_id", eleamId);
  if (error) throw error;
}

// ── Simulacros ─────────────────────────────────────────────────────────────

export async function getSimulacros(planId) {
  const sb = ensureSupabase();
  const { data, error } = await sb
    .from("simulacros")
    .select("*, escenario:escenario_id(nombre, tipo)")
    .eq("plan_id", planId)
    .order("fecha_realizado", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveSimulacro(planId, payload, simulacroId = null) {
  const { sb, userId, eleamId } = await getCtx();
  const row = {
    eleam_id: eleamId,
    plan_id: planId,
    escenario_id: payload.escenario_id || null,
    fecha_realizado: payload.fecha_realizado,
    tipo_simulacro: payload.tipo_simulacro || "parcial",
    duracion_min: payload.duracion_min ? Number(payload.duracion_min) : null,
    participantes: payload.participantes ? Number(payload.participantes) : null,
    resultado: payload.resultado || "satisfactorio",
    observaciones: payload.observaciones?.trim() || null,
    acciones_mejora: payload.acciones_mejora?.trim() || null,
    registrado_por: userId,
  };

  const query = simulacroId
    ? sb.from("simulacros").update(row).eq("id", simulacroId).eq("eleam_id", eleamId)
    : sb.from("simulacros").insert(row);
  const { data, error } = await query
    .select("*, escenario:escenario_id(nombre, tipo)")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSimulacro(simulacroId) {
  const { sb, eleamId } = await getCtx();
  const { error } = await sb
    .from("simulacros")
    .delete()
    .eq("id", simulacroId)
    .eq("eleam_id", eleamId);
  if (error) throw error;
}

// ── Inventario de bienes (DS20 Art. 22) ────────────────────────────────────

export async function getInventarioBienes() {
  const { sb, eleamId } = await getCtx();
  const { data, error } = await sb
    .from("inventario_bienes")
    .select("*")
    .eq("eleam_id", eleamId)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveInventarioBien(payload, bienId = null) {
  const { sb, userId, eleamId } = await getCtx();
  const row = {
    eleam_id: eleamId,
    nombre: payload.nombre?.trim(),
    descripcion: payload.descripcion?.trim() || null,
    categoria: payload.categoria,
    estado: payload.estado || "operativo",
    numero_serie: payload.numero_serie?.trim() || null,
    fecha_adquisicion: payload.fecha_adquisicion || null,
    fecha_revision: payload.fecha_revision || null,
    proveedor: payload.proveedor?.trim() || null,
    notas: payload.notas?.trim() || null,
    actualizado_por: userId,
  };

  const query = bienId
    ? sb.from("inventario_bienes").update(row).eq("id", bienId).eq("eleam_id", eleamId)
    : sb.from("inventario_bienes").insert({ ...row, creado_por: userId });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function deleteInventarioBien(bienId) {
  const { sb, eleamId } = await getCtx();
  const { error } = await sb
    .from("inventario_bienes")
    .delete()
    .eq("id", bienId)
    .eq("eleam_id", eleamId);
  if (error) throw error;
}

// ── Constantes ─────────────────────────────────────────────────────────────

export const PLAN_ESTADO_LABEL = {
  borrador: "Borrador",
  vigente: "Vigente",
  revision: "En revisión",
};

export const PLAN_ESTADO_TONE = {
  borrador: "slate",
  vigente: "emerald",
  revision: "amber",
};

export const ESCENARIO_TIPO_LABEL = {
  incendio: "Incendio",
  sismo: "Sismo",
  inundacion: "Inundación",
  emergencia_medica: "Emergencia médica",
  corte_suministro: "Corte de suministro",
  evacuacion: "Evacuación",
  otro: "Otro",
};

export const SIMULACRO_TIPO_LABEL = {
  parcial: "Parcial",
  total: "Total",
  evacuacion: "Evacuación",
  escritorio: "Escritorio",
};

export const SIMULACRO_RESULTADO_LABEL = {
  satisfactorio: "Satisfactorio",
  con_observaciones: "Con observaciones",
  insatisfactorio: "Insatisfactorio",
};

export const SIMULACRO_RESULTADO_TONE = {
  satisfactorio: "emerald",
  con_observaciones: "amber",
  insatisfactorio: "rose",
};

export const BIEN_CATEGORIA_LABEL = {
  infraestructura: "Infraestructura",
  equipamiento_clinico: "Equipamiento clínico",
  equipamiento_general: "Equipamiento general",
  vehiculo: "Vehículo",
  tecnologia: "Tecnología",
  otro: "Otro",
};

export const BIEN_ESTADO_LABEL = {
  operativo: "Operativo",
  mantenimiento: "En mantención",
  dado_de_baja: "Dado de baja",
};

export const BIEN_ESTADO_TONE = {
  operativo: "emerald",
  mantenimiento: "amber",
  dado_de_baja: "rose",
};
