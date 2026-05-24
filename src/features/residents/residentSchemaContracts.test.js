import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

const schema = readFileSync(join(cwd(), "supabase_schema.sql"), "utf8");

describe("resident and family schema contracts", () => {
  it("stores family contact data on profiles and invitations", () => {
    expect(schema).toContain("telefono   text");
    expect(schema).toContain("add column if not exists telefono text");
    expect(schema).toContain("nombre        text check");
    expect(schema).toContain("parentesco    text check");
  });

  it("keeps emergency contact columns out of resident creation", () => {
    const residentTable = schema.slice(
      schema.indexOf("create table if not exists public.residentes"),
      schema.indexOf("alter table public.residentes", schema.indexOf("create table if not exists public.residentes")),
    );

    expect(residentTable).not.toContain("nombre_contacto");
    expect(residentTable).not.toContain("telefono_contacto");
    expect(residentTable).not.toContain("parentesco_contacto");
    expect(schema).toContain("drop column if exists nombre_contacto");
  });

  it("keeps Barthel and Katz only as resident cache fields", () => {
    expect(schema).toContain("indice_barthel           integer check");
    expect(schema).toContain("escala_katz              text");
    expect(schema).toContain("create or replace function public.registrar_evaluacion_clinica");
    expect(schema).toContain("set indice_barthel = new.puntaje");
    expect(schema).toContain("set escala_katz = new.resultado");
  });
});
