import { describe, expect, it } from "vitest";
import { currentTurno, normalizeSchedule } from "./carePlansService";

describe("carePlansService helpers", () => {
  it("maps local hours to operational shifts", () => {
    expect(currentTurno(new Date("2026-05-14T08:00:00"))).toBe("mañana");
    expect(currentTurno(new Date("2026-05-14T16:00:00"))).toBe("tarde");
    expect(currentTurno(new Date("2026-05-14T23:30:00"))).toBe("noche");
  });

  it("normalizes weekly schedules and clamps tolerance", () => {
    expect(normalizeSchedule({
      frecuencia: "semanal",
      dias_semana: [2, 2, 9, 1],
      hora: "10:30",
      turno: "mañana",
      tolerancia_min: 900,
    })).toMatchObject({
      frecuencia: "semanal",
      dias_semana: [1, 2],
      hora: "10:30",
      turno: "mañana",
      tolerancia_min: 720,
    });
  });
});
