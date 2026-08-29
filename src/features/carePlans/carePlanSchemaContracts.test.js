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
    expect(schema).toContain("constraint planes_cuidado_participacion_check");
    expect(schema).toContain("constraint planes_cuidado_participacion_detalle_len");
  });

  it("exposes transactional preset creation RPC with authenticated grant", () => {
    expect(schema).toContain("create or replace function public.crear_rutinas_cuidado_desde_presets");
    expect(schema).toContain("grant execute on function public.crear_rutinas_cuidado_desde_presets(uuid, jsonb) to authenticated");
  });

  it("keeps follow-ups queryable as operational pending work", () => {
    expect(schema).toContain("idx_observaciones_residente_seguimiento_turno");
    expect(schema).toContain("where requiere_seguimiento = true");
  });

  it("never creates operational tasks before the resident exists in FichaEleam", () => {
    const guard = "p_fecha >= (r.creado_en at time zone 'America/Santiago')::date";
    expect(schema.split(guard).length - 1).toBeGreaterThanOrEqual(2);
  });

  it("requires an authorized and complete technical review", () => {
    expect(schema).toContain("validar_planes_cuidado  boolean not null default false");
    expect(schema).toContain("create or replace function public.revisar_plan_cuidado");
    expect(schema).toContain("public.funcionario_can('validar_planes_cuidado')");
    expect(schema).toContain("Agrega al menos un cuidado con frecuencia antes de confirmar la revisión.");
    expect(schema).toContain("grant execute on function public.revisar_plan_cuidado(uuid) to authenticated");
  });

  it("invalidates the review and audits later plan definition changes", () => {
    expect(schema).toContain("create or replace function public.invalidate_care_plan_review_on_update");
    expect(schema).toContain("create or replace function public.invalidate_care_plan_review_from_child");
    expect(schema).toContain("create or replace function public.audit_care_plan_definition");
    expect(schema).toContain("trg_planes_cuidado_invalidate_review");
    expect(schema).toContain("trg_plan_actividades_invalidate_review");
    expect(schema).toContain("trg_plan_horarios_invalidate_review");
  });
});
