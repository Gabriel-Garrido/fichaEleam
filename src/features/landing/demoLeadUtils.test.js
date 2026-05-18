import { describe, expect, it } from "vitest";
import { normalizeDemoLeadForm, validateDemoLeadForm } from "./demoLeadUtils";

describe("normalizeDemoLeadForm", () => {
  it("trims text fields and lowercases email for the demo RPC payload", () => {
    expect(normalizeDemoLeadForm({
      nombre: "  Maria Perez  ",
      cargo: " Director/a ",
      eleam_nombre: "  Residencia Norte ",
      email: "  MARIA@EXAMPLE.CL ",
      telefono: " +56 9   1234 5678 ",
      num_residentes: "",
    }, {
      utm_source: "google",
      pagina_origen: "/",
    })).toMatchObject({
      p_nombre: "Maria Perez",
      p_cargo: "Director/a",
      p_eleam_nombre: "Residencia Norte",
      p_email: "maria@example.cl",
      p_telefono: "+56 9 1234 5678",
      p_num_residentes: null,
      p_utm_source: "google",
      p_pagina_origen: "/",
    });
  });
});

describe("validateDemoLeadForm", () => {
  it("requires core fields and a valid phone", () => {
    expect(validateDemoLeadForm({
      nombre: "",
      cargo: "",
      eleam_nombre: "",
      email: "bad",
      telefono: "123",
    })).toMatchObject({
      nombre: "Requerido",
      cargo: "Selecciona tu cargo",
      eleam_nombre: "Requerido",
      email: "Email no válido",
      telefono: "Ingresa un teléfono válido",
    });
  });

  it("accepts a complete valid request", () => {
    expect(validateDemoLeadForm({
      nombre: "Maria Perez",
      cargo: "Director/a",
      eleam_nombre: "Residencia Norte",
      email: "maria@example.cl",
      telefono: "+56 9 1234 5678",
    })).toEqual({});
  });
});
