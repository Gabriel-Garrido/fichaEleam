import { describe, expect, it } from "vitest";
import { buildBedMetrics, formatBedLocation, withResidentLocation } from "./bedsUtils";

describe("beds utilities", () => {
  it("calculates occupancy with reserved hospitalization beds as unavailable", () => {
    const metrics = buildBedMetrics({
      camas: [
        { id: "1", estado: "operativa", assignment: { estado: "ocupada" } },
        { id: "2", estado: "operativa", assignment: { estado: "reservada_hospitalizacion" } },
        { id: "3", estado: "operativa", assignment: null },
        { id: "4", estado: "mantenimiento", assignment: null },
      ],
      residentes: [
        { estado: "activo", cama_actual_id: "1" },
        { estado: "activo", cama_actual_id: null },
        { estado: "hospitalizado", cama_actual_id: null },
      ],
    });

    expect(metrics).toMatchObject({
      operativas: 3,
      ocupadas: 1,
      reservadasHospitalizacion: 1,
      disponibles: 1,
      fueraServicio: 1,
      residentesSinCama: 1,
      porcentajeOcupacion: 67,
    });
  });

  it("formats and normalizes resident location from bed relations", () => {
    const cama = {
      codigo: "B",
      habitacion: { codigo: "204" },
    };

    expect(formatBedLocation(cama)).toBe("Hab. 204 · Cama B");
    expect(withResidentLocation({ nombre: "Ana", cama_actual: cama })).toMatchObject({
      habitacion: "204",
      cama: "B",
      ubicacion_label: "Hab. 204 · Cama B",
    });
  });
});
