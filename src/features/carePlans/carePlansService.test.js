import { describe, expect, it } from "vitest";
import {
  CARE_OPEN_STATUSES,
  careTaskDueAt,
  currentTurno,
  isCareTaskOverdue,
  nextFollowUpSlot,
  normalizeSchedule,
  normalizeSchedules,
  requireFollowUpSlot,
} from "./carePlansService";

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

  it("normalizes multiple schedules while preserving existing ids", () => {
    expect(normalizeSchedules([
      { id: "h1", frecuencia: "diaria", hora: "08:00", turno: "mañana" },
      { frecuencia: "mensual", dias_mes: [2, 2, 45], hora: "20:00", turno: "noche", tolerancia_min: -5 },
    ])).toMatchObject([
      { id: "h1", frecuencia: "diaria", hora: "08:00", turno: "mañana", activo: true },
      { id: null, frecuencia: "mensual", dias_mes: [2], hora: "20:00", turno: "noche", tolerancia_min: 0 },
    ]);
  });

  it("calculates care task due time with schedule tolerance", () => {
    const task = {
      fecha: "2026-05-14",
      hora: "10:00",
      estado: "pendiente",
      horario: { tolerancia_min: 45 },
    };
    expect(careTaskDueAt(task)?.toISOString()).toBe(new Date("2026-05-14T10:45:00").toISOString());
    expect(isCareTaskOverdue(task, new Date("2026-05-14T10:30:00"))).toBe(false);
    expect(isCareTaskOverdue(task, new Date("2026-05-14T10:46:00"))).toBe(true);
  });

  it("treats reprogrammed care tasks as operationally open", () => {
    expect(CARE_OPEN_STATUSES).toContain("reprogramada");
    expect(isCareTaskOverdue({
      fecha: "2026-05-14",
      hora: "09:00",
      estado: "reprogramada",
      horario: { tolerancia_min: 0 },
    }, new Date("2026-05-14T09:01:00"))).toBe(true);
  });

  it("defaults follow-up to the next operational shift", () => {
    expect(nextFollowUpSlot("2026-05-14", "mañana")).toEqual({ fecha: "2026-05-14", turno: "tarde" });
    expect(nextFollowUpSlot("2026-05-14", "tarde")).toEqual({ fecha: "2026-05-14", turno: "noche" });
    expect(nextFollowUpSlot("2026-05-14", "noche")).toEqual({ fecha: "2026-05-15", turno: "mañana" });
  });

  it("requires date and shift when a task creates follow-up", () => {
    expect(() => requireFollowUpSlot({ requiereSeguimiento: true })).toThrow(/fecha y turno/i);
    expect(() => requireFollowUpSlot({
      requiereSeguimiento: true,
      seguimientoFecha: "2026-05-14",
      seguimientoTurno: "tarde",
    })).not.toThrow();
  });
});
