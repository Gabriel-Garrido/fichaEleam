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

  it("bounds public metadata before sending it to the RPC", () => {
    const payload = normalizeDemoLeadForm({
      nombre: "A".repeat(200),
      cargo: "Director/a",
      eleam_nombre: "Residencia Norte",
      email: "maria@example.cl",
      telefono: "+56 9 1234 5678",
    }, {
      utm_campaign: "x".repeat(200),
      referrer: "https://example.cl/".padEnd(700, "r"),
    });

    expect(payload.p_nombre).toHaveLength(120);
    expect(payload.p_utm_campaign).toHaveLength(128);
    expect(payload.p_referrer).toHaveLength(512);
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
      nombre: "Ingresa tu nombre completo.",
      cargo: "Selecciona tu cargo para orientar la demo.",
      eleam_nombre: "Ingresa el nombre del ELEAM o residencia.",
      email: "Ingresa un email válido para coordinar el acceso.",
      telefono: "Ingresa un teléfono válido para contactarte.",
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

  it("rejects oversized visible fields before submit", () => {
    expect(validateDemoLeadForm({
      nombre: "A".repeat(121),
      cargo: "B".repeat(81),
      eleam_nombre: "C".repeat(161),
      email: "maria@example.cl",
      telefono: "+56 9 1234 5678".padEnd(41, "0"),
    })).toMatchObject({
      nombre: "El nombre no puede superar 120 caracteres.",
      cargo: "El cargo no puede superar 80 caracteres.",
      eleam_nombre: "El nombre del ELEAM no puede superar 160 caracteres.",
      telefono: "El teléfono no puede superar 40 caracteres.",
    });
  });
});
