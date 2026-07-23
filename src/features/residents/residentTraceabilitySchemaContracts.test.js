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
  });
});
