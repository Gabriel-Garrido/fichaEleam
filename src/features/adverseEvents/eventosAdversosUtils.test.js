import { describe, expect, it } from "vitest";
import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  ESTADOS,
  ESTADO_LABEL,
  SEVERIDADES,
  SEVERIDAD_LABEL,
  SEVERIDAD_TONE,
  formatEventDateTime,
  isOpenEvent,
  severityTone,
  shouldSuggestAdverseEventForObservation,
  suggestSeverityFromCategory,
} from "./eventosAdversosUtils";

describe("catálogos", () => {
  it("CATEGORIAS y CATEGORIA_LABEL coinciden 1:1", () => {
    for (const k of CATEGORIAS) expect(CATEGORIA_LABEL[k]).toBeTruthy();
    expect(Object.keys(CATEGORIA_LABEL).length).toBe(CATEGORIAS.length);
  });

  it("SEVERIDADES y SEVERIDAD_LABEL/TONE coinciden 1:1", () => {
    for (const s of SEVERIDADES) {
      expect(SEVERIDAD_LABEL[s]).toBeTruthy();
      expect(SEVERIDAD_TONE[s]).toBeTruthy();
    }
  });

  it("ESTADOS y ESTADO_LABEL coinciden 1:1", () => {
    for (const e of ESTADOS) expect(ESTADO_LABEL[e]).toBeTruthy();
  });
});

describe("severityTone", () => {
  it("devuelve el tone correspondiente", () => {
    expect(severityTone("leve").dot).toMatch(/emerald/);
    expect(severityTone("moderado").dot).toMatch(/amber/);
    expect(severityTone("grave").dot).toMatch(/rose-500/);
    expect(severityTone("critico").dot).toMatch(/rose-700/);
  });

  it("retorna leve como fallback para valores desconocidos", () => {
    expect(severityTone("inexistente").dot).toMatch(/emerald/);
    expect(severityTone(null).dot).toMatch(/emerald/);
  });
});

describe("suggestSeverityFromCategory", () => {
  it("sugiere moderado para caída con lesión y broncoaspiración", () => {
    expect(suggestSeverityFromCategory("caida_con_lesion")).toBe("moderado");
    expect(suggestSeverityFromCategory("broncoaspiracion")).toBe("moderado");
  });

  it("sugiere grave para fuga, agresión y autolesión", () => {
    expect(suggestSeverityFromCategory("fuga")).toBe("grave");
    expect(suggestSeverityFromCategory("agresion")).toBe("grave");
    expect(suggestSeverityFromCategory("autolesion")).toBe("grave");
  });

  it("default es leve para categorías menores", () => {
    expect(suggestSeverityFromCategory("otro")).toBe("leve");
    expect(suggestSeverityFromCategory("caida_sin_lesion")).toBe("leve");
  });
});

describe("isOpenEvent", () => {
  it("considera abierto cualquier estado distinto de cerrado/cancelado", () => {
    expect(isOpenEvent({ estado: "registrado" })).toBe(true);
    expect(isOpenEvent({ estado: "en_revision" })).toBe(true);
    expect(isOpenEvent({ estado: "en_seguimiento" })).toBe(true);
    expect(isOpenEvent({ estado: "cerrado" })).toBe(false);
    expect(isOpenEvent({ estado: "cancelado" })).toBe(false);
    expect(isOpenEvent(null)).toBe(false);
  });
});

describe("shouldSuggestAdverseEventForObservation", () => {
  it("sugiere solo en observaciones tipo caida e incidente", () => {
    expect(shouldSuggestAdverseEventForObservation("caida")).toBe(true);
    expect(shouldSuggestAdverseEventForObservation("incidente")).toBe(true);
    expect(shouldSuggestAdverseEventForObservation("observacion_general")).toBe(false);
    expect(shouldSuggestAdverseEventForObservation("higiene")).toBe(false);
  });
});

describe("formatEventDateTime", () => {
  it("formatea fecha y hora juntas", () => {
    const out = formatEventDateTime("2026-05-25", "08:30");
    expect(out).toMatch(/25\/05\/2026/);
    expect(out).toContain("08:30");
  });

  it("usa solo fecha si no hay hora", () => {
    expect(formatEventDateTime("2026-05-25", null)).toMatch(/25\/05\/2026/);
  });

  it("retorna em-dash si no hay fecha", () => {
    expect(formatEventDateTime(null, "08:30")).toBe("—");
  });
});
