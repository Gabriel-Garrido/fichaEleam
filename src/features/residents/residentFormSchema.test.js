import { describe, expect, it } from "vitest";
import { validateFamilyForm, validateResidentForm } from "./residentFormSchema";

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
  it("normalizes a resident without Barthel/Katz/contact fields", () => {
    const result = validateResidentForm(baseResident, { isEditing: false });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      nombre: "Elena",
      apellido: "Rojas",
      estado: "activo",
      alergias: ["Penicilina", "Ibuprofeno"],
    });
    expect(result.data).not.toHaveProperty("indice_barthel");
    expect(result.data).not.toHaveProperty("nombre_contacto");
  });

  it("blocks egreso/fallecido during resident creation", () => {
    const result = validateResidentForm({ ...baseResident, estado: "egresado" }, { isEditing: false });

    expect(result.ok).toBe(false);
    expect(result.errors.estado).toContain("no es válido");
  });

  it("requires egreso date and reason when editing to egresado", () => {
    const result = validateResidentForm({ ...baseResident, estado: "egresado" }, { isEditing: true });

    expect(result.ok).toBe(false);
    expect(result.errors.fecha_egreso).toContain("obligatoria");
    expect(result.errors.motivo_egreso).toContain("motivo");
  });

  it("requires family name, email, phone and relationship", () => {
    const result = validateFamilyForm({
      nombre: " Paula  Rojas ",
      parentesco: "hijo/a",
      email: " PAULA.ROJAS@GMAIL.COM ",
      telefono: "+56 9 1234 5678",
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      nombre: "Paula Rojas",
      parentesco: "hijo/a",
      email: "paula.rojas@gmail.com",
    });
    expect(result.data.telefono).toBe("+56 9 1234 5678");
  });

  it("returns actionable family validation errors", () => {
    const result = validateFamilyForm({
      nombre: "",
      parentesco: "",
      email: "correo-invalido",
      telefono: "123",
    });

    expect(result.ok).toBe(false);
    expect(result.errors.nombre).toContain("obligatorio");
    expect(result.errors.parentesco).toContain("obligatorio");
    expect(result.errors.email).toContain("formato válido");
    expect(result.errors.telefono).toContain("chileno válido");
  });
});
