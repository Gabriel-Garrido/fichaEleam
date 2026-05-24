import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.join(process.cwd(), "src/features/familiar/FamiliarPortal.jsx"), "utf8");

describe("family portal visible language contracts", () => {
  it("uses calm family-facing section names", () => {
    expect(source).toContain('title="Cuidados de hoy"');
    expect(source).toContain('title="Medicamentos del día"');
    expect(source).toContain('title="Signos recientes"');
    expect(source).toContain('title="Visitas"');
  });

  it("does not expose operational medication inventory language", () => {
    expect(source).not.toMatch(/eMAR|kardex|psicotrópico|estupefaciente|stock|lote/i);
  });

  it("rephrases internal validation and omission states for families", () => {
    expect(source).toContain('pendiente_validacion: { label: "En revisión"');
    expect(source).toContain('omitido:      { label: "No administrado"');
  });
});
