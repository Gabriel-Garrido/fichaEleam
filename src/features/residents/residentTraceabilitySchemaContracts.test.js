import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

const schema = readFileSync(join(cwd(), "supabase_schema.sql"), "utf8");

describe("resident traceability schema contracts", () => {
  it("exposes the resident traceability RPC with the expected filters", () => {
    expect(schema).toContain("create or replace function public.listar_trazabilidad_residente");
    expect(schema).toContain("p_residente_id uuid");
    expect(schema).toContain("p_desde date default null");
    expect(schema).toContain("p_hasta date default null");
    expect(schema).toContain("p_tipos text[] default null");
    expect(schema).toContain("p_estado text default null");
    expect(schema).toContain("'prioridad_visual'");
    expect(schema).toContain("grant execute on function public.listar_trazabilidad_residente(uuid, date, date, text[], text, integer) to authenticated");
    expect(schema).toContain("create or replace function public.listar_historial_residente_paginado");
    expect(schema).toContain("p_busqueda text default null");
    expect(schema).toContain("p_offset integer default 0");
    expect(schema).toContain("create or replace function public.obtener_detalle_historial_residente");
    expect(schema).toContain("create or replace function public.listar_historial_residente_cursor");
    expect(schema).toContain("p_cursor_fecha timestamptz default null");
    expect(schema).toContain("p_cursor_clave text default null");
    expect(schema).toContain("create or replace function public.obtener_detalle_historial_residente_v2");
  });

  it("uses keyset pagination and avoids duplicate mutable task rows", () => {
    const cursorFeed = schema.slice(
      schema.lastIndexOf("create or replace function public.listar_historial_residente_cursor"),
      schema.lastIndexOf("create or replace function public.obtener_detalle_historial_residente_v2"),
    );
    expect(cursorFeed).toContain("source.fecha_hora < p_cursor_fecha");
    expect(cursorFeed).toContain("source.clave < coalesce(p_cursor_clave, '')");
    expect(cursorFeed).not.toContain("offset v_offset");
    expect(cursorFeed).toContain("from public.plan_cuidado_audit pa");
    expect(cursorFeed).toContain("from public.medicamentos_audit ma");
    expect(cursorFeed).not.toContain("from public.tareas_cuidado t\n");
    expect(cursorFeed).not.toContain("from public.medicamentos_administraciones ma\n");
  });

  it("covers incidents, claims and authorized billing without exposing restricted details", () => {
    for (const source of [
      "eventos_adversos",
      "eventos_adversos_acciones",
      "eventos_adversos_audit",
      "resident_payment_audit",
      "reclamos_sugerencias",
    ]) expect(schema).toContain(source);
    expect(schema).toContain("v_can_payments boolean := public.can_access_feature('resident_payments')");
    expect(schema).toContain("v_can_claims boolean := public.can_access_feature('compliance')");
    expect(schema).toContain("No autorizado a ver cobranza");
  });

  it("audits clinical revisions and adverse events inside the database transaction", () => {
    expect(schema).toContain("create trigger trg_signos_vitales_resident_revision");
    expect(schema).toContain("create trigger trg_observaciones_resident_revision");
    expect(schema).toContain("create trigger trg_eventos_adversos_audit_db");
    expect(schema).toContain("create trigger trg_eventos_adversos_acciones_audit_db");
    expect(schema).toContain("revoke insert, update, delete on public.eventos_adversos_audit from authenticated");
    expect(schema).toContain("create trigger trg_medicamentos_recetas_audit");
    expect(schema).toContain("create trigger trg_medicamentos_stock_lotes_audit");
    expect(schema).toContain("'receta_adjuntada'");
    expect(schema).toContain("revoke execute on function public.obtener_detalle_historial_residente(uuid, text, text) from authenticated");
  });

  it("audits resident and related record changes without duplicating bed synchronization", () => {
    expect(schema).toContain("create table if not exists public.residentes_audit");
    expect(schema).toContain("create trigger trg_residentes_audit");
    expect(schema).toContain("create or replace function public.audit_resident_related_changes");
    expect(schema).toContain("trg_resident_consents_resident_audit");
    expect(schema).toContain("trg_resident_health_network_resident_audit");
    expect(schema).toContain("trg_health_controls_resident_audit");
    expect(schema).toContain("trg_evaluaciones_clinicas_resident_audit");
    expect(schema).toContain("trg_persona_sig_resident_audit");
    expect(schema).toContain("trg_actividades_sociales_resident_audit");
    expect(schema).toContain("'creado_por','actualizado_por','registrado_por','evaluado_por'");
    expect(schema).toContain("cama_actual_id','creado_por'");
  });

  it("audits every editable area shown in resident general information", () => {
    for (const trigger of [
      "trg_residentes_audit",
      "trg_evaluaciones_clinicas_resident_audit",
      "trg_resident_consents_resident_audit",
      "trg_resident_health_network_resident_audit",
      "trg_health_controls_resident_audit",
      "trg_persona_sig_resident_audit",
      "trg_actividades_sociales_resident_audit",
    ]) {
      expect(schema).toContain(trigger);
    }
  });

  it("keeps list payloads compact and loads details separately", () => {
    const paginated = schema.slice(
      schema.indexOf("create or replace function public.listar_historial_residente_paginado"),
      schema.indexOf("create or replace function public.obtener_detalle_historial_residente"),
    );
    expect(paginated).toContain("limit v_limit offset v_offset");
    expect(paginated).toContain("'tiene_detalle', true");
    expect(paginated).not.toContain("'detalle_texto'");
  });

  it("keeps access, limit and date filtering safeguards in the RPC", () => {
    expect(schema).toContain("least(coalesce(p_limit, 200), 500)");
    expect(schema).toContain("public.my_rol() not in ('admin_eleam','funcionario','superadmin')");
    expect(schema).toContain("public.eleam_has_access(v_eleam_id)");
    expect(schema).toContain("(p_desde is null or (e.fecha_hora at time zone 'America/Santiago')::date >= p_desde)");
    expect(schema).toContain("(p_hasta is null or (e.fecha_hora at time zone 'America/Santiago')::date <= p_hasta)");
  });

  it("includes all internal event families in the traceability feed", () => {
    for (const table of [
      "tareas_cuidado",
      "medicamentos_administraciones",
      "signos_vitales",
      "observaciones_diarias",
      "cama_asignaciones",
      "plan_cuidado_audit",
      "medicamentos_audit",
      "camas_audit",
      "residentes_audit",
    ]) {
      expect(schema).toContain(table);
    }
  });

  it("keeps resident-date indexes for traceability event sources", () => {
    expect(schema).toContain("idx_signos_residente_fecha");
    expect(schema).toContain("idx_tareas_cuidado_residente_fecha");
    expect(schema).toContain("idx_med_admin_residente_fecha");
    expect(schema).toContain("idx_cama_asignaciones_residente_hist");
    expect(schema).toContain("idx_plan_cuidado_audit_residente_fecha");
    expect(schema).toContain("idx_medicamentos_audit_residente_fecha");
    expect(schema).toContain("idx_camas_audit_residente_fecha");
    expect(schema).toContain("idx_residentes_audit_residente_fecha");
  });
});
