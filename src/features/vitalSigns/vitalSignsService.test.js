import { describe, expect, it } from "vitest";
import { requireVitalSignsFollowUpSlot } from "./vitalSignsService";

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
});
