import { describe, expect, it } from "vitest";
import { buildComplianceAreas, simpleRequirementStatus } from "./accreditationOverview";

const item = (areaCode, order, estado = "pendiente") => ({
  id: `${areaCode}-${order}`,
  estado,
  documentos: [],
  requisito: { codigo: `${areaCode}-${order}`, orden: order, ambito: { codigo: areaCode, nombre: areaCode, orden: areaCode === "B" ? 2 : 1 } },
});

const evidence = (code, overrides = {}) => ({
  requisito_codigo: code,
  completa_requisito: true,
  estado_calculado: "completo",
  numerador: 4,
  denominador: 4,
  porcentaje: 100,
  detalle: "Calculado desde los registros.",
  ...overrides,
});

describe("compliance overview", () => {
  it("groups requirements in report order and calculates simple progress", () => {
    const groups = buildComplianceAreas([
      item("B", 2, "pendiente"),
      item("A", 2, "vigente"),
      item("A", 1, "no_aplica"),
    ]);
    expect(groups.map((group) => group.area.codigo)).toEqual(["A", "B"]);
    expect(groups[0]).toMatchObject({ ready: 2, compliant: 1, notApplicable: 1, pending: 0, percentage: 100 });
    expect(groups[0].items.map((entry) => entry.requisito.orden)).toEqual([1, 2]);
  });

  it("attaches open observations to their requirement", () => {
    const groups = buildComplianceAreas([item("A", 1, "observado")], [
      { requisito_eleam_id: "A-1", estado: "abierta" },
      { requisito_eleam_id: "A-1", estado: "cerrada" },
    ]);
    expect(groups[0].items[0].openObservations).toBe(1);
    expect(groups[0].observed).toBe(1);
  });

  it("uses plain-language status and acknowledges uploaded evidence", () => {
    expect(simpleRequirementStatus({ estado: "vencido" }).label).toBe("Vencido");
    expect(simpleRequirementStatus({ estado: "pendiente", documentos: [{ vigente: true }] }).help).toContain("respaldo cargado");
  });

  it("uses a complete automatic verifier as the effective status", () => {
    const groups = buildComplianceAreas(
      [item("A", 1, "pendiente")],
      [],
      [evidence("A-1")],
    );

    expect(groups[0]).toMatchObject({ ready: 1, compliant: 1, pending: 0, percentage: 100 });
    expect(simpleRequirementStatus(groups[0].items[0])).toMatchObject({ label: "Al día", tone: "emerald" });
  });

  it("does not let an automatic metric hide an open observation", () => {
    const groups = buildComplianceAreas(
      [item("A", 1, "observado")],
      [{ requisito_eleam_id: "A-1", estado: "abierta" }],
      [evidence("A-1")],
    );

    expect(groups[0]).toMatchObject({ ready: 0, compliant: 0, pending: 1, observed: 1 });
    expect(simpleRequirementStatus(groups[0].items[0]).label).toBe("Por corregir");
  });

  it("shows partial operational evidence without completing the requirement", () => {
    const groups = buildComplianceAreas(
      [item("A", 1, "pendiente")],
      [],
      [evidence("A-1", { completa_requisito: false })],
    );

    expect(groups[0].ready).toBe(0);
    expect(groups[0].items[0].operationalEvidence.porcentaje).toBe(100);
    expect(simpleRequirementStatus(groups[0].items[0]).label).toBe("Pendiente");
  });
});
