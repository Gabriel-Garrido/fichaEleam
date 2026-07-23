import { describe, expect, it } from "vitest";
import { PROTOCOLOS_REQUERIDOS, protocolosFaltantes, validateProtocolPayload } from "./cumplimientoService";

describe("protocolos mínimos de cumplimiento", () => {
  it("conserva solo los tres protocolos documentales exigidos en esta sección", () => {
    expect(PROTOCOLOS_REQUERIDOS).toEqual([
      "ingreso_egreso",
      "urgencias_medicas",
      "fallecimiento",
    ]);
  });

  it("considera completo únicamente un protocolo vigente", () => {
    expect(protocolosFaltantes([
      { tipo: "ingreso_egreso", estado: "vigente" },
      { tipo: "urgencias_medicas", estado: "revision" },
      { tipo: "fallecimiento", estado: "vigente" },
    ])).toEqual(["urgencias_medicas"]);
  });

  it("valida contenido, estados y fechas antes de guardar", () => {
    expect(validateProtocolPayload({
      tipo: "ingreso_egreso",
      contenido: "  Pasos claros y responsables.  ",
      estado: "vigente",
      fecha_aprobacion: "2026-07-01",
      fecha_revision: "2027-07-01",
    })).toMatchObject({ contenido: "Pasos claros y responsables.", estado: "vigente" });

    expect(() => validateProtocolPayload({ tipo: "otro", contenido: "Texto" })).toThrow(/válido/i);
    expect(() => validateProtocolPayload({ tipo: "fallecimiento", contenido: "Texto", estado: "publicado" })).toThrow(/estado válido/i);
    expect(() => validateProtocolPayload({ tipo: "fallecimiento", contenido: "Texto", fecha_revision: "2026-02-31" })).toThrow(/fecha de revisión/i);
    expect(() => validateProtocolPayload({ tipo: "fallecimiento", contenido: "Texto", estado: "vigente" })).toThrow(/aprobación/i);
    expect(() => validateProtocolPayload({
      tipo: "urgencias_medicas",
      contenido: "Texto suficiente",
      fecha_aprobacion: "2026-08-01",
      fecha_revision: "2026-07-01",
    })).toThrow(/posterior/i);
  });
});
