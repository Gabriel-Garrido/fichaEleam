import { describe, expect, it } from "vitest";
import { chileDateFromTimestamp, requireVitalSignsFollowUpSlot, residentWasCreatedByDate } from "./vitalSignsService";

describe("vitalSignsService helpers", () => {
  it("requires date and shift when vital signs create a follow-up", () => {
    expect(() => requireVitalSignsFollowUpSlot({ requiereSeguimiento: false })).not.toThrow();
    expect(() => requireVitalSignsFollowUpSlot({ requiereSeguimiento: true })).toThrow(/fecha y turno/i);
    expect(() => requireVitalSignsFollowUpSlot({
      requiereSeguimiento: true,
      seguimientoFecha: "2026-05-16",
      seguimientoTurno: "tarde",
    })).not.toThrow();
  });

  it("starts virtual pending controls on the resident creation date, not admission date", () => {
    const resident = { creado_en: "2026-08-20T02:30:00.000Z", fecha_ingreso: "2024-01-10" };
    expect(chileDateFromTimestamp(resident.creado_en)).toBe("2026-08-19");
    expect(residentWasCreatedByDate(resident, "2026-08-18")).toBe(false);
    expect(residentWasCreatedByDate(resident, "2026-08-19")).toBe(true);
    expect(residentWasCreatedByDate(resident, "2026-08-20")).toBe(true);
  });
});
