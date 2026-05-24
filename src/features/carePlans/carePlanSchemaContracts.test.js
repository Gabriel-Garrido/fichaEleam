import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

const schema = readFileSync(join(cwd(), "supabase_schema.sql"), "utf8");

describe("care plan schema contracts", () => {
  it("keeps named care plan constraints for auditable database errors", () => {
    expect(schema).toContain("constraint planes_cuidado_titulo_len");
    expect(schema).toContain("constraint plan_cuidado_actividades_visible_familiar_summary_check");
    expect(schema).toContain("constraint plan_cuidado_horarios_frecuencia_shape_check");
    expect(schema).toContain("constraint tareas_cuidado_reprogramada_fecha_check");
  });

  it("exposes transactional preset creation RPC with authenticated grant", () => {
    expect(schema).toContain("create or replace function public.crear_rutinas_cuidado_desde_presets");
    expect(schema).toContain("grant execute on function public.crear_rutinas_cuidado_desde_presets(uuid, jsonb) to authenticated");
  });

  it("keeps follow-ups queryable as operational pending work", () => {
    expect(schema).toContain("idx_observaciones_residente_seguimiento_turno");
    expect(schema).toContain("where requiere_seguimiento = true");
  });
});
