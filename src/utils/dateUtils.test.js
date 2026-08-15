import { describe, expect, it } from "vitest";
import { chileDateKey, localDateTimeToIso } from "./dateUtils";

describe("dateUtils timezone", () => {
  it("convierte datetime-local al instante UTC correspondiente", () => {
    const expected = new Date(2026, 7, 15, 19, 0).toISOString();
    expect(localDateTimeToIso("2026-08-15T19:00")).toBe(expected);
  });

  it("agrupa instantes según el día civil de Chile", () => {
    expect(chileDateKey("2026-08-16T02:30:00.000Z")).toBe("2026-08-15");
  });

  it("rechaza fechas inválidas", () => {
    expect(localDateTimeToIso("fecha inválida")).toBeNull();
    expect(chileDateKey("fecha inválida")).toBe("");
  });
});
