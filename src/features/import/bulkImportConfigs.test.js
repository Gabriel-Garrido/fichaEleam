import { describe, expect, it } from "vitest";
import { normalizeResidentRows, normalizeStaffRows } from "./bulkImportConfigs";

const family = {
  familiar_nombre: "Paula Rojas",
  familiar_parentesco: "hija",
  familiar_email: "paula.rojas@gmail.com",
  familiar_telefono: "+56 9 1234 5678",
};

describe("bulkImportConfigs", () => {
  it("blocks imported active and hospitalized residents over the plan quota", () => {
    const rows = normalizeResidentRows([
      { rowNumber: 2, raw: { nombre: "Ana", apellido: "Rojas", fecha_ingreso: "2026-01-01", estado: "activo", ...family } },
      { rowNumber: 3, raw: { nombre: "Luis", apellido: "Diaz", fecha_ingreso: "2026-01-01", estado: "hospitalizado", ...family, familiar_email: "luis.fam@gmail.com" } },
      { rowNumber: 4, raw: { nombre: "Eva", apellido: "Perez", fecha_ingreso: "2026-01-01", estado: "activo", ...family, familiar_email: "eva.fam@gmail.com" } },
    ], {
      existingResidents: [{ estado: "activo" }],
      maxResidentes: 2,
    });

    expect(rows[0].errors).toEqual([]);
    expect(rows[1].errors.join(" ")).toContain("máximo 2 residentes");
    expect(rows[2].errors.join(" ")).toContain("máximo 2 residentes");
  });

  it("normalizes common human labels in resident import enums", () => {
    const rows = normalizeResidentRows([
      {
        rowNumber: 2,
        raw: {
          nombre: "Teresa",
          apellido: "Araya",
          fecha_ingreso: "2026-05-17",
          sexo: "F",
          estado: "Activa",
          nivel_dependencia: "Moderada",
          estado_civil: "Soltera",
          ...family,
        },
      },
      {
        rowNumber: 3,
        raw: {
          nombre: "Rosa",
          apellido: "Contreras",
          fecha_ingreso: "2026-05-18",
          sexo: "mujer",
          estado: "hospitalizada",
          nivel_dependencia: "alta",
          estado_civil: "Divorciada",
          ...family,
          familiar_email: "rosa.contreras@gmail.com",
        },
      },
    ]);

    expect(rows[0].errors).toEqual([]);
    expect(rows[0].payload).toMatchObject({
      sexo: "femenino",
      estado: "activo",
      nivel_dependencia: "moderado",
      estado_civil: "soltero",
    });
    expect(rows[1].errors).toEqual([]);
    expect(rows[1].payload).toMatchObject({
      sexo: "femenino",
      estado: "hospitalizado",
      nivel_dependencia: "severo",
      estado_civil: "divorciado",
    });
    expect(rows[0].familyPayload).toMatchObject({
      nombre: "Paula Rojas",
      parentesco: "hijo/a",
      email: "paula.rojas@gmail.com",
    });
  });

  it("returns an actionable error when resident RUT checksum is invalid", () => {
    const rows = normalizeResidentRows([
      {
        rowNumber: 2,
        raw: {
          nombre: "Luis",
          apellido: "Fernandez",
          rut: "22.111.333-4",
          fecha_ingreso: "2026-05-16",
          ...family,
        },
      },
    ]);

    expect(rows[0].errors.join(" ")).toContain("revisa el dígito verificador");
    expect(rows[0].payload.rut).toBeNull();
  });

  it("requires a complete familiar on every resident import row", () => {
    const rows = normalizeResidentRows([
      {
        rowNumber: 2,
        raw: {
          nombre: "Julia",
          apellido: "Navarro",
          fecha_ingreso: "2026-05-16",
          familiar_nombre: "Carolina Navarro",
          familiar_parentesco: "hija",
          familiar_email: "carolina@example.com",
        },
      },
    ]);

    expect(rows[0].familyPayload).toBeNull();
    expect(rows[0].errors.join(" ")).toContain("Teléfono del familiar");
  });

  it("counts pending staff invitations against staff import quota", () => {
    const rows = normalizeStaffRows([
      { rowNumber: 2, raw: { nombre: "Ana Rojas", email: "ana@residencia.cl", cargo: "Enfermero/a" } },
    ], {
      existingMembers: [{ email: "admin@residencia.cl", rol: "admin_eleam" }],
      pendingInvites: [{ email: "staff@gmail.com", rol: "funcionario" }],
      currentFuncionarios: 1,
      maxFuncionarios: 1,
    });

    expect(rows[0].errors.join(" ")).toContain("máximo 1 funcionarios");
  });

  it("rejects oversized staff import fields before calling Edge Functions", () => {
    const rows = normalizeStaffRows([
      {
        rowNumber: 2,
        raw: {
          nombre: "A".repeat(121),
          email: `${"b".repeat(252)}@cl`,
          cargo: "Enfermero/a",
        },
      },
    ]);

    expect(rows[0].errors.join(" ")).toContain("Nombre completo no puede superar 120 caracteres");
    expect(rows[0].errors.join(" ")).toContain("Correo electrónico no puede superar 254 caracteres");
  });
});
