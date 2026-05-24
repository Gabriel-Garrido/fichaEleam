import { supabase } from "../../services/supabaseConfig";
import { computeAssessment, isAssessmentComplete } from "./clinicalAssessmentRules";

const ASSESSMENT_SELECT = `
  id, residente_id, eleam_id, tipo, fecha_evaluacion, motivo,
  puntaje, resultado, detalle, observaciones,
  proxima_evaluacion, evaluado_por, creado_en, actualizado_en,
  evaluador:profiles!evaluaciones_clinicas_evaluado_por_fkey(nombre)
`;

export async function listAssessments(residenteId, { tipo, limit = 30 } = {}) {
  let query = supabase
    .from("evaluaciones_clinicas")
    .select(ASSESSMENT_SELECT)
    .eq("residente_id", residenteId)
    .order("fecha_evaluacion", { ascending: false })
    .limit(limit);
  if (tipo) query = query.eq("tipo", tipo);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getLatestAssessments(residenteId) {
  const rows = await listAssessments(residenteId, { limit: 30 });
  const map = {};
  for (const row of rows) {
    if (!map[row.tipo]) map[row.tipo] = row;
  }
  return map;
}

export async function submitAssessment({
  residenteId,
  tipo,
  detalle,
  motivo = "rutina",
  observaciones = null,
  fechaEvaluacion = null,
}) {
  if (!residenteId) throw new Error("Residente obligatorio");
  if (!tipo || (tipo !== "barthel" && tipo !== "katz")) {
    throw new Error("Tipo de evaluación inválido");
  }
  if (!isAssessmentComplete(tipo, detalle)) {
    throw new Error("Completa todas las preguntas antes de guardar.");
  }
  const { puntaje, resultado } = computeAssessment(tipo, detalle);

  const { data, error } = await supabase.rpc("registrar_evaluacion_clinica", {
    p_residente_id: residenteId,
    p_tipo: tipo,
    p_puntaje: puntaje,
    p_resultado: resultado,
    p_detalle: detalle,
    p_motivo: motivo,
    p_observaciones: observaciones ?? null,
    p_fecha_evaluacion: fechaEvaluacion ?? null,
  });
  if (error) throw error;
  return data;
}

export async function listOverdueEvaluations({ horizonteDias = 30 } = {}) {
  const { data, error } = await supabase.rpc("evaluaciones_pendientes_eleam", {
    p_horizonte_dias: horizonteDias,
  });
  if (error) throw error;
  return data ?? [];
}
