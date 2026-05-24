import { describe, expect, it } from "vitest";
import {
  INITIAL_CARE_SCHEDULE,
  buildQuickCarePlanDefaults,
  calculateCarePlanReadiness,
  formatCareSchedule,
  getCarePlanPrimaryAction,
  groupCarePresetsByArea,
} from "./carePlanUi";

describe("carePlanUi helpers", () => {
  it("formats schedule summaries with recurrence and tolerance", () => {
    expect(formatCareSchedule({
      ...INITIAL_CARE_SCHEDULE,
      turno: "mañana",
      hora: "08:30",
      tolerancia_min: 45,
    })).toBe("Mañana · 08:30 · diario · ventana 45 min");

    expect(formatCareSchedule({
      frecuencia: "semanal",
      turno: "tarde",
      hora: "15:00",
      dias_semana: [1, 3, 5],
      tolerancia_min: 0,
    })).toBe("Tarde · 15:00 · semanal (L, Mi, V) · sin margen");
  });

  it("calculates readiness from plan content, routines and family visibility", () => {
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
      dayTasks: [{ estado: "pendiente" }, { estado: "reprogramada" }],
    });

    expect(metrics).toMatchObject({
      active: 1,
      schedules: 1,
      highPriority: 1,
      followUp: 1,
      familyVisible: 1,
      openToday: 2,
      reprogrammed: 1,
      hasClinicalSummary: true,
      score: 100,
    });
  });

  it("returns action guidance for incomplete plans", () => {
    expect(getCarePlanPrimaryAction({
      plan: null,
      metrics: {},
      canManage: true,
    }).label).toBe("Crear plan rápido");

    expect(getCarePlanPrimaryAction({
      plan: { id: "p1" },
      metrics: { active: 0 },
      canManage: true,
    }).label).toBe("Agregar rutina base");
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
