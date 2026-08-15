import { describe, expect, it } from "vitest";
import {
  evidencePresentation,
  filterComplianceAreas,
  requirementMatchesFilter,
  requirementNextAction,
  summarizeEvidence,
} from "./complianceGuidance";

const requirement = (overrides = {}) => ({
  estado: "pendiente",
  documentos: [],
  effectiveReady: false,
  requisito: { origen_evidencia: "documental", criticidad: "media" },
  ...overrides,
});

describe("compliance guidance", () => {
  it("differentiates verified, supported and external evidence", () => {
    expect(evidencePresentation(requirement({ operationalEvidence: { completa_requisito: true } })).kind).toBe("verified");
    expect(evidencePresentation(requirement({ operationalEvidence: { completa_requisito: false } })).kind).toBe("supported");
    expect(evidencePresentation(requirement()).kind).toBe("document");
    expect(evidencePresentation(requirement({ requisito: { origen_evidencia: "operacional" } })).kind).toBe("document");
  });

  it("prioritizes incomplete operational records with a useful instruction", () => {
    expect(requirementNextAction(requirement({
      operationalEvidence: { estado_calculado: "incompleto", detalle: "Faltan 2 evaluaciones." },
    }))).toBe("Faltan 2 evaluaciones.");
  });

  it("does not request an external document already uploaded", () => {
    expect(requirementMatchesFilter(requirement({ documentos: [{ vigente: true }] }), "documents")).toBe(false);
    expect(requirementMatchesFilter(requirement({ estado: "no_aplica" }), "documents")).toBe(false);
  });

  it("filters groups without losing their area metadata", () => {
    const ready = requirement({ effectiveReady: true });
    const pending = requirement();
    const result = filterComplianceAreas([{ area: { codigo: "A" }, items: [ready, pending] }], "priority");
    expect(result).toHaveLength(1);
    expect(result[0].area.codigo).toBe("A");
    expect(result[0].items).toEqual([pending]);
  });

  it("summarizes evidence and critical pending points", () => {
    expect(summarizeEvidence([{ items: [
      requirement({ operationalEvidence: { completa_requisito: true }, requisito: { criticidad: "critica" } }),
      requirement({ operationalEvidence: { completa_requisito: false } }),
      requirement({ effectiveReady: true }),
    ] }])).toEqual({ verified: 1, supported: 1, document: 1, criticalPending: 1 });
  });
});
