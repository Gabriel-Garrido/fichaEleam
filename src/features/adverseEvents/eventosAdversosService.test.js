import { describe, expect, it } from "vitest";
import * as service from "./eventosAdversosService";

describe("eventosAdversosService exports", () => {
  it("expone CRUD principal", () => {
    expect(typeof service.listAdverseEvents).toBe("function");
    expect(typeof service.getAdverseEvent).toBe("function");
    expect(typeof service.createAdverseEvent).toBe("function");
    expect(typeof service.updateAdverseEvent).toBe("function");
    expect(typeof service.closeAdverseEvent).toBe("function");
    expect(typeof service.reopenAdverseEvent).toBe("function");
    expect(typeof service.cancelAdverseEvent).toBe("function");
  });

  it("expone timeline y auditoría", () => {
    expect(typeof service.listEventActions).toBe("function");
    expect(typeof service.addEventAction).toBe("function");
    expect(typeof service.listEventAudit).toBe("function");
  });

  it("expone helpers de portal familiar y métricas", () => {
    expect(typeof service.listFamiliarAdverseEvents).toBe("function");
    expect(typeof service.getOpenAdverseEventsCount).toBe("function");
  });
});

describe("getOpenAdverseEventsCount", () => {
  it("devuelve totales en cero si no hay eleamId", async () => {
    const result = await service.getOpenAdverseEventsCount(null);
    expect(result).toEqual({ total: 0, gravesOCriticos: 0 });
  });
});

describe("listFamiliarAdverseEvents", () => {
  it("devuelve lista vacía cuando no hay residente_id", async () => {
    const result = await service.listFamiliarAdverseEvents(null);
    expect(result).toEqual([]);
  });
});

describe("createAdverseEvent", () => {
  it("falla sin eleamId", async () => {
    await expect(service.createAdverseEvent({}, {})).rejects.toThrow(/eleam_id/);
  });
});
