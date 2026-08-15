import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const schema = fs.readFileSync(path.join(process.cwd(), "supabase_schema.sql"), "utf8");

describe("medication schema contracts", () => {
  it("declares transactional indication and schedule RPC", () => {
    expect(schema).toContain("create or replace function public.guardar_indicacion_medicamento_con_horarios");
    expect(schema).toContain("grant execute on function public.guardar_indicacion_medicamento_con_horarios(uuid, jsonb, jsonb) to authenticated");
  });

  it("keeps explicit medication constraints for empty-database hardening", () => {
    expect(schema).toContain("med_indicaciones_nombre_len_contract");
    expect(schema).toContain("med_indicaciones_familia_contract");
    expect(schema).toContain("med_indicaciones_controlados_contract");
    expect(schema).toContain("med_horarios_frecuencia_contract");
    expect(schema).toContain("med_stock_lotes_textos_contract");
    expect(schema).toContain("med_stock_lotes_vencimiento_contract");
    expect(schema).toContain("med_admin_cierre_contract");
    expect(schema).toMatch(/prescriptor_nombre\s+text not null/i);
    expect(schema).toMatch(/requiere_stock\s+boolean not null default false/i);
  });

  it("blocks expired lots during medication administration", () => {
    expect(schema).toContain("idx_med_stock_lotes_residente_vencimiento");
    expect(schema).toContain("No se puede administrar con un lote vencido");
    expect(schema).toMatch(/v_lote\.fecha_vencimiento\s+is\s+not\s+null\s+and\s+v_lote\.fecha_vencimiento\s+<\s+current_date/i);
  });

  it("keeps prescription documents private, historical and scoped to the resident", () => {
    expect(schema).toContain("create table if not exists public.medicamentos_recetas");
    expect(schema).toContain("alter table public.medicamentos_recetas enable row level security");
    expect(schema).toContain('create policy "mr_select" on public.medicamentos_recetas');
    expect(schema).toContain('create policy "mr_insert" on public.medicamentos_recetas');
    expect(schema).toContain("check (archivo_tamanio between 1 and 3145728) not valid");
    expect(schema).toContain("check (archivo_tipo in ('application/pdf','image/jpeg','image/png','image/webp')) not valid");
    expect(schema).toMatch(/create policy "mr_insert"[\s\S]*?funcionario_can\('adjuntar_recetas_medicamentos'\)/);
    expect(schema).not.toMatch(/create policy "mr_delete"/);
    expect(schema).toMatch(/not exists \(\s*select 1 from public\.medicamentos_recetas mr\s*where mr\.storage_path = name\s*\)/);
  });

  it("reports prescription, reception and use as partial DS20 evidence", () => {
    expect(schema).toContain("DS20-A10-MEDICAMENTOS-RECEPCION-USO");
    expect(schema).toMatch(/'DS20-A10-MEDICAMENTOS-RECEPCION-USO', 'avance_parcial',[\s\S]*?'\/residents', false\)/);
  });

});
