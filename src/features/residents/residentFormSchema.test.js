import { describe, expect, it } from "vitest";
import { validateResidentForm } from "./residentFormSchema";

const baseResident = {
  nombre: "Elena",
  apellido: "Rojas",
  rut: "",
  fecha_nacimiento: "1940-02-10",
  sexo: "femenino",
  nacionalidad: "Chilena",
  estado_civil: "viudo",
  direccion_anterior: "",
  prevision: "FONASA",
  diagnostico_principal: "Hipertensión arterial",
  alergias: "Penicilina, Ibuprofeno",
  grupo_sanguineo: "O+",
  fecha_ingreso: "2026-05-20",
  estado: "activo",
  nivel_dependencia: "moderado",
  fecha_egreso: "",
  motivo_egreso: "",
};

describe("residentFormSchema", () => {
  it("normalizes a resident without Barthel/Katz/contact cache fields", () => {
    const result = validateResidentForm(baseResident, { isEditing: false });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      nombre: "Elena",
      apellido: "Rojas",
      estado: "activo",
      alergias: ["Penicilina", "Ibuprofeno"],
      nivel_dependencia: "moderado",
    });
    expect(result.data).not.toHaveProperty("indice_barthel");
    expect(result.data).not.toHaveProperty("nombre_contacto");
  });

  it("blocks egreso/fallecido during resident creation", () => {
    const result = validateResidentForm({ ...baseResident, estado: "egresado" }, { isEditing: false });

    expect(result.ok).toBe(false);
    expect(result.errors.estado).toContain("no es válido");
  });

  it("allows dependency to remain unclassified for DS20 alerts", () => {
    const result = validateResidentForm({ ...baseResident, nivel_dependencia: "" }, { isEditing: false });

    expect(result.ok).toBe(true);
    expect(result.data.nivel_dependencia).toBeNull();
  });

  it("requires egreso date and reason when editing to egresado", () => {
    const result = validateResidentForm({ ...baseResident, estado: "egresado" }, { isEditing: true });

    expect(result.ok).toBe(false);
    expect(result.errors.fecha_egreso).toContain("obligatoria");
    expect(result.errors.motivo_egreso).toContain("motivo");
  });

  it("rejects a future egreso date", () => {
    const future = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const result = validateResidentForm(
      { ...baseResident, estado: "egresado", fecha_egreso: future, motivo_egreso: "Traslado" },
      { isEditing: true }
    );

    expect(result.ok).toBe(false);
    expect(result.errors.fecha_egreso).toContain("futura");
  });

});
