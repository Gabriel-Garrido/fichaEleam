import { describe, expect, it } from "vitest";
import {
  INITIAL_CARE_SCHEDULE,
  buildDailyShiftSchedules,
  buildQuickCarePlanDefaults,
  calculateCarePlanReadiness,
  carePlanPendingItems,
  careScheduleError,
  formatCareSchedule,
  groupCareActivitiesByTurn,
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
    const plan = {
      objetivos: "Mantener confort",
      pauta_alimentacion: "Dieta indicada",
      pauta_hidratacion: "Ofrecer líquidos",
      meta_rehabilitacion: "Mantener marcha",
      objetivo_biopsicosocial: "Participar en actividades",
      participacion_residente: "residente",
      validado_en: "2026-08-15T10:00:00Z",
      validado_por_dt: "profile-id",
    };
    const metrics = calculateCarePlanReadiness({
      plan,
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
      contentComplete: true,
      reviewed: true,
      pending: [],
    });
  });

  it("builds quick start defaults with resident context", () => {
    const defaults = buildQuickCarePlanDefaults({ nombre: "Ana", apellido: "Paz" });
    expect(defaults.titulo).toBe("Plan de cuidado de Ana Paz");
    expect(defaults.riesgo_caidas).toBe("");
    expect(defaults.objetivos).toBe("");
  });

  it("shows every schedule in its corresponding shift without hiding repeated care", () => {
    const activity = {
      id: "a1",
      titulo: "Hidratación",
      activo: true,
      horarios: [
        { id: "h1", turno: "mañana", hora: "09:00", frecuencia: "diaria", activo: true },
        { id: "h2", turno: "tarde", hora: "16:00", frecuencia: "diaria", activo: true },
      ],
    };
    const groups = groupCareActivitiesByTurn([activity]);
    expect(groups.mañana[0]).toEqual({ activity, schedule: activity.horarios[0] });
    expect(groups.tarde[0]).toEqual({ activity, schedule: activity.horarios[1] });
    expect(groups.noche).toEqual([]);
  });

  it("separates missing content from the technical review", () => {
    const pending = carePlanPendingItems({ plan: {}, activities: [] });
    expect(pending.filter((item) => item.type === "content")).toHaveLength(7);
    expect(pending.at(-1)).toEqual(expect.objectContaining({ field: "review", type: "review" }));
  });

  it("does not accept a stale technical review when required content is incomplete", () => {
    const metrics = calculateCarePlanReadiness({
      plan: { validado_en: "2026-08-15T10:00:00Z", validado_por_dt: "profile-id" },
      activities: [],
    });
    expect(metrics.reviewed).toBe(false);
    expect(metrics.contentComplete).toBe(false);
  });

  it("requires participation detail when a representative took part or participation was not possible", () => {
    const pending = carePlanPendingItems({
      plan: { participacion_residente: "representante" },
      activities: [{}],
    });
    expect(pending).toContainEqual(expect.objectContaining({ field: "participacion_detalle", type: "content" }));
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
    expect(careScheduleError({ ...INITIAL_CARE_SCHEDULE, frecuencia: "mensual", dias_mes: [0] })).toMatch(/día válido/i);
    expect(careScheduleError({ ...INITIAL_CARE_SCHEDULE, frecuencia: "mensual", dias_mes: [15] })).toBeNull();
    expect(careScheduleError({ ...INITIAL_CARE_SCHEDULE, frecuencia: "una_vez", fecha_unica: "" })).toMatch(/fecha/i);
    expect(careScheduleError({ ...INITIAL_CARE_SCHEDULE, frecuencia: "una_vez", fecha_unica: "2026-07-01" })).toBeNull();
  });

  it("ordena turnos únicos sin alterar una recurrencia ya registrada", () => {
    expect(buildDailyShiftSchedules(["noche", "mañana", "noche", "invalido"], [
      { id: "n1", turno: "noche", hora: "22:00", frecuencia: "semanal" },
    ])).toEqual([
      expect.objectContaining({ turno: "mañana", frecuencia: "diaria", activo: true }),
      expect.objectContaining({ id: "n1", turno: "noche", hora: "22:00", frecuencia: "semanal" }),
    ]);
  });
});
