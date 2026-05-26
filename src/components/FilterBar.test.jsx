import { describe, expect, it, vi } from "vitest";
import { buildActiveChips } from "./filterBarUtils";

describe("buildActiveChips", () => {
  const onChange = vi.fn();

  it("does not include chips for empty/default values", () => {
    const defs = [
      { name: "estado", label: "Estado", type: "select", options: [["activo", "Activo"]] },
    ];
    const chips = buildActiveChips({ estado: "" }, defs, onChange);
    expect(chips).toHaveLength(0);
  });

  it("creates a chip for a non-default select value with the option label", () => {
    const defs = [
      {
        name: "estado",
        label: "Estado",
        type: "select",
        options: [
          ["activo", "Activo"],
          ["hospitalizado", "Hospitalizado"],
        ],
      },
    ];
    const chips = buildActiveChips({ estado: "hospitalizado" }, defs, onChange);
    expect(chips).toHaveLength(1);
    expect(chips[0].label).toBe("Estado: Hospitalizado");
    expect(chips[0].key).toBe("estado");
    chips[0].onRemove();
    expect(onChange).toHaveBeenCalledWith("estado", "");
  });

  it("creates a chip for a true toggle and removes by setting false", () => {
    const reset = vi.fn();
    const defs = [{ name: "soloPendientes", label: "Solo pendientes", type: "toggle" }];
    const chips = buildActiveChips({ soloPendientes: true }, defs, reset);
    expect(chips).toHaveLength(1);
    expect(chips[0].label).toBe("Solo pendientes");
    chips[0].onRemove();
    expect(reset).toHaveBeenCalledWith("soloPendientes", false);
  });

  it("creates a single chip combining desde/hasta for dateRange", () => {
    const reset = vi.fn();
    const defs = [{ name: "fecha", label: "Fecha" , type: "dateRange" }];
    const chips = buildActiveChips({ fecha_desde: "2026-05-01", fecha_hasta: "2026-05-31" }, defs, reset);
    expect(chips).toHaveLength(1);
    expect(chips[0].label).toContain("Fecha:");
    expect(chips[0].label).toContain("desde 2026-05-01");
    expect(chips[0].label).toContain("hasta 2026-05-31");
    chips[0].onRemove();
    expect(reset).toHaveBeenCalledWith("fecha_desde", "");
    expect(reset).toHaveBeenCalledWith("fecha_hasta", "");
  });

  it("creates a chip listing selected options for list type", () => {
    const reset = vi.fn();
    const defs = [{
      name: "severidad",
      label: "Severidad",
      type: "list",
      options: [["leve", "Leve"], ["grave", "Grave"], ["critico", "Crítico"]],
    }];
    const chips = buildActiveChips({ severidad: ["leve", "grave"] }, defs, reset);
    expect(chips).toHaveLength(1);
    expect(chips[0].label).toContain("Leve");
    expect(chips[0].label).toContain("Grave");
    chips[0].onRemove();
    expect(reset).toHaveBeenCalledWith("severidad", []);
  });

  it("skips hidden filter definitions", () => {
    const defs = [{ name: "x", label: "X", type: "select", options: [["1", "1"]], hidden: true }];
    const chips = buildActiveChips({ x: "1" }, defs, onChange);
    expect(chips).toHaveLength(0);
  });
});
