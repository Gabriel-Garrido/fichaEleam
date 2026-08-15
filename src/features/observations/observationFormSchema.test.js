import { describe, expect, it } from "vitest";
import { OBSERVATION_CATEGORY_GUIDANCE, OBSERVATION_TYPES, validateObservationForm } from "./observationFormSchema";

const BASE = {
  residente_id: "resident-1",
  fecha_hora: "2026-05-24T10:30",
  turno: "mañana",
  tipo: "observacion_general",
  descripcion: "  Evoluciona tranquilo.  ",
  acciones_tomadas: "",
  requiere_seguimiento: false,
  seguimiento_fecha: "",
  seguimiento_turno: "",
};

describe("observationFormSchema", () => {
  it("normalizes blank optional values before submit", () => {
    const result = validateObservationForm(BASE);

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      descripcion: "Evoluciona tranquilo.",
      acciones_tomadas: null,
      seguimiento_fecha: null,
      seguimiento_turno: null,
    });
  });

  it("requires follow-up date and shift only when follow-up is enabled", () => {
    const result = validateObservationForm({ ...BASE, requiere_seguimiento: true });

    expect(result.ok).toBe(false);
    expect(result.errors.seguimiento_fecha).toBe("Indica la fecha del seguimiento.");
    expect(result.errors.seguimiento_turno).toBe("Indica el turno del seguimiento.");
  });

  it("offers only focused evolution categories and excludes duplicated workflows", () => {
    expect(OBSERVATION_TYPES.map(([value]) => value)).toEqual([
      "observacion_general",
      "cambio_clinico",
      "dolor",
      "piel_heridas",
      "conducta_animo",
    ]);
    expect(OBSERVATION_TYPES.flat().join(" ")).not.toMatch(/medicamento|alimentación|higiene|actividad|visita médica|caída/i);
    expect(OBSERVATION_CATEGORY_GUIDANCE.dolor.help).toContain("0 a 10");
  });

  it("requires actions and response for clinically actionable categories", () => {
    const missingActions = validateObservationForm({ ...BASE, tipo: "dolor", acciones_tomadas: "" });
    expect(missingActions.ok).toBe(false);
    expect(missingActions.errors.acciones_tomadas).toBe("Registra la atención realizada y la respuesta del residente.");

    const complete = validateObservationForm({ ...BASE, tipo: "dolor", acciones_tomadas: "Se acomodó y refiere dolor 3/10 tras reevaluación." });
    expect(complete.ok).toBe(true);
  });
});
