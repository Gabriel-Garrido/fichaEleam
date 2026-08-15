import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(join(cwd(), "src", "features", "emar", "EmarResidentTab.jsx"), "utf8");

describe("resident medication workspace", () => {
  it("keeps only the three medication work areas needed by the resident team", () => {
    for (const label of ["Tratamiento y recetas", "Recepción y stock", "Administraciones"]) {
      expect(workspace).toContain(label);
    }
  });

  it("keeps DS20 checklists and duplicate dashboards out of the resident medication tab", () => {
    expect(workspace).not.toContain("Checklist DS20");
    expect(workspace).not.toContain("Ruta recomendada");
    expect(workspace).not.toContain("Vista rápida");
  });
});
