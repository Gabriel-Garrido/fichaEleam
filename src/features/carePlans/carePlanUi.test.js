import { describe, expect, it } from "vitest";
import {
  INITIAL_CARE_SCHEDULE,
  buildQuickCarePlanDefaults,
  calculateCarePlanReadiness,
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
          visible_familiar: true,
          horarios: [{ turno: "mañana", hora: "10:00", activo: true }],
        },
      ],
    });

    expect(metrics).toEqual({
      active: 1,
      familyVisible: 1,
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
});
