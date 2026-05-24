import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

const visibleSources = [
  "src/navigation/navigationConfig.js",
  "src/features/carePlans/CareTasksPage.jsx",
  "src/features/carePlans/CarePlanTab.jsx",
  "src/features/emar/EmarTurnPage.jsx",
  "src/features/emar/EmarResidentTab.jsx",
  "src/features/residents/ResidentDetails.jsx",
  "src/features/permissions/featureCatalog.js",
].map(read).join("\n");

describe("clinical visible language contracts", () => {
  it("keeps technical medication module names out of visible copy", () => {
    expect(visibleSources).not.toMatch(/eMAR|kardex|psicotrópico/);
  });

  it("uses aligned operational names for the main clinical surfaces", () => {
    expect(visibleSources).toContain("Tareas del turno");
    expect(visibleSources).toContain("Medicamentos");
    expect(visibleSources).toContain("Plan de cuidado");
    expect(visibleSources).toContain("Doble firma");
  });

  it("does not reintroduce older technical validation copy", () => {
    expect(visibleSources).not.toContain("validación adicional");
    expect(visibleSources).not.toContain("Conciliar lote");
    expect(visibleSources).not.toContain("Conciliar");
    expect(visibleSources).not.toContain("conciliación de lote");
  });
});
