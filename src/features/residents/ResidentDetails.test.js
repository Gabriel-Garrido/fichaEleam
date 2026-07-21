import { describe, expect, it } from "vitest";
import { normalizeResidentTab } from "./residentUtils";

describe("ResidentDetails navigation", () => {
  it("preserva enlaces antiguos sin reintroducir pestañas duplicadas", () => {
    expect(normalizeResidentTab("info")).toBe("resumen");
    expect(normalizeResidentTab("signos")).toBe("resumen");
    expect(normalizeResidentTab("observaciones")).toBe("resumen");
    expect(normalizeResidentTab("tareas")).toBe("turno");
  });

  it("acepta secciones vigentes y recupera valores desconocidos", () => {
    expect(normalizeResidentTab("emar")).toBe("emar");
    expect(normalizeResidentTab("desconocida")).toBe("resumen");
  });
});
