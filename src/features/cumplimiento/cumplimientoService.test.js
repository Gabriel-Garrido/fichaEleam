import { describe, expect, it } from "vitest";
import {
  PROTOCOLOS_REQUERIDOS,
  currentPeriodo,
  hitoTone,
  isValidPeriodoSenama,
  protocolosFaltantes,
} from "./cumplimientoService";

describe("cumplimiento DS20 helpers", () => {
  it("calcula el período trimestral SENAMA", () => {
    expect(currentPeriodo(new Date("2026-01-15T12:00:00Z"))).toBe("2026-T1");
    expect(currentPeriodo(new Date("2026-04-01T12:00:00Z"))).toBe("2026-T2");
    expect(currentPeriodo(new Date("2026-09-30T12:00:00Z"))).toBe("2026-T3");
    expect(currentPeriodo(new Date("2026-12-31T12:00:00Z"))).toBe("2026-T4");
  });

  it("valida el formato del período SENAMA", () => {
    expect(isValidPeriodoSenama("2026-T1")).toBe(true);
    expect(isValidPeriodoSenama("2026-T4")).toBe(true);
    expect(isValidPeriodoSenama("2026-T0")).toBe(false);
    expect(isValidPeriodoSenama("2026-Q1")).toBe(false);
  });

  it("exige los protocolos operativos base para una carpeta fiscalizable", () => {
    expect(PROTOCOLOS_REQUERIDOS).toEqual([
      "urgencias_medicas",
      "fallecimiento",
      "ingreso",
      "egreso",
      "aseo_desinfeccion",
    ]);

    const faltantes = protocolosFaltantes([
      { tipo: "urgencias_medicas", estado: "vigente" },
      { tipo: "fallecimiento", estado: "revision" },
      { tipo: "ingreso", estado: "vigente" },
    ]);

    expect(faltantes).toEqual([
      "fallecimiento",
      "egreso",
      "aseo_desinfeccion",
    ]);
  });

  it("marca hitos vencidos, cercanos y lejanos con tono consistente", () => {
    expect(hitoTone(-1)).toBe("rose");
    expect(hitoTone(180)).toBe("amber");
    expect(hitoTone(181)).toBe("emerald");
  });
});
