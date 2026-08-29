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
    const guard = "((p_fecha + h.hora) at time zone 'America/Santiago') >= greatest(";
    expect(schema.split(guard).length - 1).toBeGreaterThanOrEqual(2);
  });

  it("prepares both task sources in one request and never writes while browsing history", () => {
    expect(schema).toContain("create or replace function public.preparar_trabajo_turno");
    expect(schema).toContain("v_cuidados := public.generar_tareas_cuidado(p_fecha, p_turno)");
    expect(schema).toContain("v_medicamentos := public.generar_administraciones_medicamentos(p_fecha, p_turno)");
    expect(schema.split("p_fecha is distinct from (now() at time zone 'America/Santiago')::date").length - 1).toBeGreaterThanOrEqual(2);
    expect(schema.split("and h.eleam_id = v_eleam_id").length - 1).toBeGreaterThanOrEqual(2);
    expect(schema).toContain("Debes tener un ELEAM asociado para generar tareas");
  });

  it("normalizes reprogrammed timestamps in the Chilean timezone", () => {
    expect(schema).toContain("create or replace function public.sync_care_task_reprogrammed_at");
    expect(schema).toContain("(new.fecha + new.hora) at time zone 'America/Santiago'");
    expect(schema).toContain("trg_tareas_cuidado_reprogrammed_at");
  });

  it("resolves and continues follow-ups atomically with authorization and row locking", () => {
    expect(schema).toContain("create or replace function public.gestionar_seguimiento_observacion");
    expect(schema).toContain("for update;");
    expect(schema).toContain("Este seguimiento ya fue gestionado. Actualiza la lista para ver su estado.");
    expect(schema).toContain("grant execute on function public.gestionar_seguimiento_observacion(uuid, text, date, text) to authenticated");
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
