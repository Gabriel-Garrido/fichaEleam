import { describe, expect, it } from "vitest";
import { validateBedForm, validateRoomForm } from "./bedsFormSchema";

describe("bedsFormSchema", () => {
  it("normalizes room payloads before saving", () => {
    const result = validateRoomForm({
      codigo: "  101 ",
      nombre: "",
      piso: "  1 ",
      sector: "",
      estado: "operativa",
      orden: "",
      notas: "  Cerca de enfermería ",
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      codigo: "101",
      nombre: null,
      piso: "1",
      sector: null,
      orden: 0,
      notas: "Cerca de enfermería",
    });
  });

  it("requires room and bed codes", () => {
    expect(validateRoomForm({ codigo: "", estado: "operativa" }).errors.codigo).toBe("Código es obligatorio.");
    expect(validateBedForm({ habitacion_id: "", codigo: "", tipo: "estandar", estado: "operativa" }).errors.habitacion_id)
      .toBe("Habitación es obligatorio.");
  });

  it("rejects invalid bed order and status", () => {
    const result = validateBedForm({
      habitacion_id: "room-1",
      codigo: "A",
      tipo: "estandar",
      estado: "bloqueada",
      orden: "-1",
    });

    expect(result.errors.estado).toBe("Estado no es válido.");
    expect(result.errors.orden).toBe("Orden debe ser mayor o igual a 0.");
  });
});
