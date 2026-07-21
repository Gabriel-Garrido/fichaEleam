import { describe, expect, it } from "vitest";
import {
  PLAZOS_FAQ,
  PLAZOS_HITOS,
  PLAZOS_META,
  diasRestantesPlazo,
  plazoEstado,
} from "./plazosDecreto20";

describe("plazosDecreto20", () => {
  it("define los 3 hitos del período transitorio en orden cronológico", () => {
    expect(PLAZOS_HITOS.map((h) => h.id)).toEqual(["vigencia", "general", "incendios"]);
    expect(PLAZOS_HITOS.map((h) => h.fecha)).toEqual(["2025-10-01", "2028-10-01", "2030-10-01"]);
    for (const hito of PLAZOS_HITOS) {
      expect(hito.titulo).toBeTruthy();
      expect(hito.fechaLegible).toContain("octubre");
      expect(hito.descripcion.length).toBeGreaterThan(60);
      expect(hito.acciones.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("diasRestantesPlazo calcula días con fecha base fija", () => {
    const hoy = new Date(2026, 5, 11); // 11-06-2026
    expect(diasRestantesPlazo("2026-06-12", hoy)).toBe(1);
    expect(diasRestantesPlazo("2026-06-11", hoy)).toBe(0);
    expect(diasRestantesPlazo("2026-06-10", hoy)).toBe(-1);
    expect(diasRestantesPlazo("2028-10-01", hoy)).toBe(843);
  });

  it("plazoEstado clasifica por urgencia", () => {
    expect(plazoEstado(-1)).toBe("vencido");
    expect(plazoEstado(0)).toBe("urgente");
    expect(plazoEstado(365)).toBe("urgente");
    expect(plazoEstado(366)).toBe("vigente");
  });

  it("la meta reutiliza la fuente oficial del decreto", () => {
    expect(PLAZOS_META.fuenteUrl).toContain("bcn.cl");
    expect(PLAZOS_META.descripcion).toContain("Decreto N°20");
  });

  it("FAQ cubre vigencia, plazos y consecuencias", () => {
    expect(PLAZOS_FAQ.length).toBeGreaterThanOrEqual(4);
    const allText = PLAZOS_FAQ.map((f) => `${f.q} ${f.a}`).join(" ");
    expect(allText).toContain("2025");
    expect(allText).toContain("2028");
    expect(allText).toContain("2030");
  });
});
