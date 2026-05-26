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
  visible_familiar: false,
  resumen_familiar: "",
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
      resumen_familiar: null,
    });
  });

  it("requires follow-up date and shift only when follow-up is enabled", () => {
    const result = validateObservationForm({ ...BASE, requiere_seguimiento: true });

    expect(result.ok).toBe(false);
    expect(result.errors.seguimiento_fecha).toBe("Indica la fecha del seguimiento.");
    expect(result.errors.seguimiento_turno).toBe("Indica el turno del seguimiento.");
  });

  it("requires a family summary before publishing to family portal", () => {
    const result = validateObservationForm({ ...BASE, visible_familiar: true });

    expect(result.ok).toBe(false);
    expect(result.errors.resumen_familiar).toBe("Escribe un resumen para familia antes de publicar esta observación.");
  });
});
