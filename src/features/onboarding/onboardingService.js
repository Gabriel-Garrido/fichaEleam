import { supabase } from "../../services/supabaseConfig";
import { buildCompletionSnapshot } from "./onboardingUtils";

export async function fetchActivationCompletionSnapshot() {
  const [habitaciones, camas, residentes, asignaciones] = await Promise.all([
    supabase.from("habitaciones").select("id").limit(1),
    supabase.from("camas").select("id").limit(1),
    supabase.from("residentes").select("id, estado").eq("estado", "activo").limit(1),
    supabase
      .from("cama_asignaciones")
      .select("id, fecha_fin")
      .is("fecha_fin", null)
      .limit(1),
  ]);

  for (const result of [habitaciones, camas, residentes, asignaciones]) {
    if (result.error) throw result.error;
  }

  return buildCompletionSnapshot({
    habitaciones: habitaciones.data ?? [],
    camas: camas.data ?? [],
    residentes: residentes.data ?? [],
    asignaciones: asignaciones.data ?? [],
  });
}
