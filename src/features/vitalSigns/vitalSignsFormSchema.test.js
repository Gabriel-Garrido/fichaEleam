import { describe, expect, it } from "vitest";
import { validateVitalSignsForm } from "./vitalSignsFormSchema";

const BASE = {
  residente_id: "resident-1",
  fecha_hora: "2026-05-24T09:00",
  turno: "mañana",
  presion_sistolica: "120",
  presion_diastolica: "",
  frecuencia_cardiaca: "",
  frecuencia_respiratoria: "",
  temperatura: "36.7",
  saturacion_oxigeno: "98",
  glucosa: "",
  peso: "",
  dolor_escala: "2",
  estado_conciencia: "alerta",
  observaciones: "  Control basal  ",
  requiere_seguimiento: false,
  seguimiento_fecha: "",
  seguimiento_turno: "",
};

describe("vitalSignsFormSchema", () => {
  it("normalizes numeric values and clears inactive follow-up fields", () => {
    const result = validateVitalSignsForm(BASE);

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      presion_sistolica: 120,
      presion_diastolica: null,
      temperatura: 36.7,
      saturacion_oxigeno: 98,
      dolor_escala: 2,
      observaciones: "Control basal",
      seguimiento_fecha: null,
      seguimiento_turno: null,
    });
  });

  it("rejects values outside clinical guardrails", () => {
    const result = validateVitalSignsForm({ ...BASE, saturacion_oxigeno: "140" });

    expect(result.ok).toBe(false);
    expect(result.errors.saturacion_oxigeno).toBe("SatO₂ debe ser menor o igual a 100.");
  });

  it("requires follow-up date and shift when follow-up is enabled", () => {
    const result = validateVitalSignsForm({ ...BASE, requiere_seguimiento: true });

    expect(result.ok).toBe(false);
    expect(result.errors.seguimiento_fecha).toBe("Indica la fecha del seguimiento.");
    expect(result.errors.seguimiento_turno).toBe("Indica el turno del seguimiento.");
  });
});
