import { describe, expect, it } from "vitest";
import {
  HEALTH_CONTROL_STATES,
  HEALTH_CONTROL_TYPES,
  healthControlCopy,
  initialHealthControlForm,
  validateHealthControlForm,
} from "./healthControlForm";

function complete(overrides = {}) {
  return {
    ...initialHealthControlForm(),
    centro_atencion: "CESFAM Los Aromos",
    motivo: "Control de condición crónica",
    resultado: "Sin indicaciones nuevas. Mantener controles habituales.",
    ...overrides,
  };
}

describe("health control form", () => {
  it("uses clear control and status choices", () => {
    expect(HEALTH_CONTROL_TYPES.map(([value]) => value)).toEqual(["control", "derivacion", "urgencia", "teleconsulta", "otro"]);
    expect(HEALTH_CONTROL_STATES.map(([, label]) => label)).toEqual(["Atención realizada", "Pendiente o programada", "Cancelada", "No asistió"]);
  });

  it("requires the minimum traceability for a completed attention", () => {
    const result = validateHealthControlForm(initialHealthControlForm());
    expect(result.ok).toBe(false);
    expect(result.errors.centro_atencion).toBeTruthy();
    expect(result.errors.motivo).toBeTruthy();
    expect(result.errors.resultado).toBeTruthy();
    expect(validateHealthControlForm(complete()).ok).toBe(true);
  });

  it("shows only the fields required by the selected situation", () => {
    const scheduled = validateHealthControlForm(complete({ estado: "programado", resultado: "" }));
    expect(scheduled.ok).toBe(true);
    expect(healthControlCopy({ estado: "programado" }).dateLabel).toBe("Fecha programada");
    expect(healthControlCopy({ estado: "cancelado" }).reasonLabel).toBe("Motivo de cancelación");
  });

  it("validates continuity and documented family coordination", () => {
    const result = validateHealthControlForm(complete({
      proximo_control: "2020-01-01",
      familia_informada: true,
      coordinacion_familia: "",
    }));
    expect(result.ok).toBe(false);
    expect(result.errors.proximo_control).toBeTruthy();
    expect(result.errors.coordinacion_familia).toBeTruthy();
  });
});
