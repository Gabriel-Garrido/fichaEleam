import { describe, expect, it } from "vitest";
import { computeClientScore } from "./superadminService";

function contextFor(eleamId, values = {}) {
  return {
    residentCounts: new Map([[eleamId, values.residents ?? 0]]),
    activeResidentCounts: new Map([[eleamId, values.activeResidents ?? 0]]),
    staffCounts: new Map([[eleamId, values.staff ?? 0]]),
    documentCounts: new Map([[eleamId, values.docs ?? 0]]),
    criticalDocumentCounts: new Map([[eleamId, values.criticalDocs ?? 0]]),
    overdueTaskCounts: new Map([[eleamId, values.overdueTasks ?? 0]]),
    lastActivity: new Map([[eleamId, values.lastActivity ?? null]]),
  };
}

describe("computeClientScore", () => {
  it("prioriza como saludable a un cliente activo con uso, equipo y evidencia", () => {
    const eleam = {
      id: "e1",
      nombre: "ELEAM Activo",
      pago_activo: true,
      plan: "mensual",
      riesgo_churn: "bajo",
      crm_estado: "cliente_activo",
    };

    const score = computeClientScore(eleam, contextFor("e1", {
      residents: 12,
      activeResidents: 12,
      staff: 8,
      docs: 20,
      lastActivity: new Date().toISOString(),
    }));

    expect(score.score).toBeGreaterThanOrEqual(85);
    expect(score.tone).toBe("emerald");
    expect(score.reasons).toEqual(["Sin alertas relevantes"]);
  });

  it("baja el score ante demo sin uso, documentos críticos y tareas vencidas", () => {
    const eleam = {
      id: "e2",
      nombre: "Demo sin uso",
      pago_activo: false,
      plan: "demo",
      riesgo_churn: "alto",
      crm_estado: "cliente_riesgo",
    };

    const oldActivity = new Date(Date.now() - 45 * 86400000).toISOString();
    const score = computeClientScore(eleam, contextFor("e2", {
      residents: 0,
      activeResidents: 0,
      staff: 0,
      docs: 0,
      criticalDocs: 2,
      overdueTasks: 2,
      lastActivity: oldActivity,
    }));

    expect(score.score).toBeLessThan(35);
    expect(score.tone).toBe("rose");
    expect(score.reasons).toEqual([
      "Riesgo churn alto",
      "2 tareas vencidas",
      "2 documentos críticos",
      "Demo sin uso",
    ]);
  });
});
