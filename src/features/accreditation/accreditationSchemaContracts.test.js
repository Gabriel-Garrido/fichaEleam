import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

const schema = readFileSync(join(cwd(), "supabase_schema.sql"), "utf8");

describe("DS20 accreditation schema contracts", () => {
  it("does not complete the annual training requirement from hours alone", () => {
    expect(schema).toMatch(/'DS20-A25-CAPACITACION-ANUAL-22H', 'avance_parcial',[\s\S]*?'\/personal\/equipo', false\)/);
  });

  it("keeps only the explicit DS20 review periods as forced expirations", () => {
    expect(schema).toContain("'DS20-A12-REPORTE-SENAMA' then 90");
    expect(schema).toContain("when codigo in ('DS20-A25-CAPACITACION-ANUAL-22H', 'DS20-A28-INVENTARIO-BIENES') then 365");
    expect(schema).toContain("else null");
  });

  it("does not claim the establishment asset inventory verifies resident belongings", () => {
    expect(schema).toMatch(/origen_evidencia = 'documental',[\s\S]*?requisito_operacional = false,[\s\S]*?where codigo = 'DS20-A28-INVENTARIO-BIENES'/);
  });

  it("records the corrected legal references and automatic renewal rule", () => {
    expect(schema).toContain("when 'DS20-A12-REPORTE-SENAMA' then 'Art. 12 letra t'");
    expect(schema).toContain("renueva automática y sucesivamente mientras no sea dejada sin efecto");
  });

  it("keeps document validity automatic, atomic and manually overridable", () => {
    const migration = readFileSync(join(cwd(), "supabase/migrations/20260830020000_automatic_compliance_document_validity.sql"), "utf8");
    expect(migration).toContain("estado_modo text not null default 'automatico'");
    expect(migration).toContain("create or replace function public.acred_sincronizar_vigencias");
    expect(migration).toContain("doc.fecha_vencimiento <= v_today then 'vencido'");
    expect(migration).toContain("create or replace function public.acred_registrar_documento");
    expect(migration).toContain("create or replace function public.acred_establecer_estado_manual");
    expect(migration).toContain("create or replace function public.acred_reactivar_estado_automatico");
    expect(migration).toContain("revoke insert, update, delete on public.acred_documentos from authenticated");
  });
});
