import { describe, expect, it } from "vitest";
import { cleanField, normalizeLandingEvent } from "./eventValidation.ts";

describe("cleanField", () => {
  it("devuelve null para valores no-string", () => {
    expect(cleanField(123, 64)).toBeNull();
    expect(cleanField(null, 64)).toBeNull();
    expect(cleanField(undefined, 64)).toBeNull();
    expect(cleanField({}, 64)).toBeNull();
  });

  it("devuelve null para strings vacíos o solo espacios", () => {
    expect(cleanField("", 64)).toBeNull();
    expect(cleanField("   ", 64)).toBeNull();
  });

  it("recorta a la longitud máxima", () => {
    expect(cleanField("a".repeat(200), 64)).toHaveLength(64);
  });

  it("trimea y conserva strings válidos", () => {
    expect(cleanField("  hola  ", 64)).toBe("hola");
  });
});

describe("normalizeLandingEvent", () => {
  it("ignora tipos fuera de la allowlist", () => {
    expect(normalizeLandingEvent({ tipo: "evil_event" })).toBeNull();
    expect(normalizeLandingEvent({ tipo: "" })).toBeNull();
    expect(normalizeLandingEvent({})).toBeNull();
  });

  it("ignora bodies que no son objeto", () => {
    expect(normalizeLandingEvent(null)).toBeNull();
    expect(normalizeLandingEvent("cta_click")).toBeNull();
    expect(normalizeLandingEvent(42)).toBeNull();
  });

  it("acepta los tipos de la allowlist", () => {
    for (const tipo of [
      "cta_click",
      "nav_click",
      "scroll_depth",
      "section_view",
      "form_view",
      "form_submit",
    ]) {
      expect(normalizeLandingEvent({ tipo })?.tipo).toBe(tipo);
    }
  });

  it("recorta los campos largos del payload", () => {
    const row = normalizeLandingEvent({
      tipo: "cta_click",
      pagina: "/" + "x".repeat(500),
      elemento: "e".repeat(500),
      referrer: "r".repeat(900),
    });
    expect(row?.pagina).toHaveLength(256);
    expect(row?.elemento).toHaveLength(128);
    expect(row?.referrer).toHaveLength(512);
  });

  it("normaliza la fila con todos los campos esperados", () => {
    const row = normalizeLandingEvent({
      tipo: "form_submit",
      pagina: "/landing",
      elemento: "demo_request_modal",
      valor: "hero",
      session_id: "sid-1",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "lanzamiento",
      referrer: "https://google.com",
    });
    expect(row).toEqual({
      tipo: "form_submit",
      pagina: "/landing",
      elemento: "demo_request_modal",
      valor: "hero",
      session_id: "sid-1",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "lanzamiento",
      referrer: "https://google.com",
    });
  });

  it("rellena con null los campos ausentes", () => {
    const row = normalizeLandingEvent({ tipo: "scroll_depth" });
    expect(row).toEqual({
      tipo: "scroll_depth",
      pagina: null,
      elemento: null,
      valor: null,
      session_id: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      referrer: null,
    });
  });
});
