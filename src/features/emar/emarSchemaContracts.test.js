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
  });

  it("blocks expired lots during medication administration", () => {
    expect(schema).toContain("idx_med_stock_lotes_residente_vencimiento");
    expect(schema).toContain("No se puede administrar con un lote vencido");
    expect(schema).toMatch(/v_lote\.fecha_vencimiento\s+is\s+not\s+null\s+and\s+v_lote\.fecha_vencimiento\s+<\s+current_date/i);
  });
});
