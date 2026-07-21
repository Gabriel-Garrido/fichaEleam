import { describe, expect, it } from "vitest";
import {
  INITIAL_CARE_SCHEDULE,
  buildDailyShiftSchedules,
  buildQuickCarePlanDefaults,
  calculateCarePlanReadiness,
  careScheduleError,
  formatCareSchedule,
  groupCarePresetsByArea,
} from "./carePlanUi";

describe("carePlanUi helpers", () => {
  it("formats schedule summaries with recurrence", () => {
    expect(formatCareSchedule({
      ...INITIAL_CARE_SCHEDULE,
      turno: "mañana",
      hora: "08:30",
    })).toBe("Mañana · 08:30 · diario");

    expect(formatCareSchedule({
      frecuencia: "semanal",
      turno: "tarde",
      hora: "15:00",
      dias_semana: [1, 3, 5],
    })).toBe("Tarde · 15:00 · semanal (L, Mi, V)");
  });

  it("calculates readiness counts from plan content and routines", () => {
    const metrics = calculateCarePlanReadiness({
      plan: { objetivos: "Mantener confort", riesgo_caidas: "medio" },
      activities: [
        {
          titulo: "Hidratación",
          prioridad: "alta",
          requiere_observacion: true,
          horarios: [{ turno: "mañana", hora: "10:00", activo: true }],
        },
      ],
    });

    expect(metrics).toEqual({
      active: 1,
      hasClinicalSummary: true,
    });
  });

  it("builds quick start defaults with resident context", () => {
    const defaults = buildQuickCarePlanDefaults({ nombre: "Ana", apellido: "Paz" });
    expect(defaults.titulo).toBe("Plan de cuidado de Ana Paz");
    expect(defaults.riesgo_caidas).toBe("medio");
    expect(defaults.objetivos).toMatch(/seguridad/i);
  });

  it("groups care presets by clinical area", () => {
    const groups = groupCarePresetsByArea();
    expect(groups.Nutrición.length).toBeGreaterThan(0);
    expect(groups.Higiene.length).toBeGreaterThan(0);
  });

  it("careScheduleError detecta horarios que se guardarían mal", () => {
    expect(careScheduleError(INITIAL_CARE_SCHEDULE)).toBeNull();
    expect(careScheduleError({ ...INITIAL_CARE_SCHEDULE, hora: "" })).toMatch(/hora/i);
    expect(careScheduleError({ ...INITIAL_CARE_SCHEDULE, frecuencia: "semanal", dias_semana: [] })).toMatch(/un día/i);
    expect(careScheduleError({ ...INITIAL_CARE_SCHEDULE, frecuencia: "semanal", dias_semana: [1, 3] })).toBeNull();
    expect(careScheduleError({ ...INITIAL_CARE_SCHEDULE, frecuencia: "una_vez", fecha_unica: "" })).toMatch(/fecha/i);
    expect(careScheduleError({ ...INITIAL_CARE_SCHEDULE, frecuencia: "una_vez", fecha_unica: "2026-07-01" })).toBeNull();
  });

  it("reduce la programación de cuidado a turnos diarios únicos", () => {
    expect(buildDailyShiftSchedules(["noche", "mañana", "noche", "invalido"], [
      { id: "n1", turno: "noche", hora: "22:00", frecuencia: "semanal" },
    ])).toEqual([
      expect.objectContaining({ turno: "mañana", frecuencia: "diaria", activo: true }),
      expect.objectContaining({ id: "n1", turno: "noche", hora: "22:00", frecuencia: "diaria" }),
    ]);
  });
});
