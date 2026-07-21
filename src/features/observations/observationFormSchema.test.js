import { describe, expect, it } from "vitest";
import { validateObservationForm } from "./observationFormSchema";

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
});
