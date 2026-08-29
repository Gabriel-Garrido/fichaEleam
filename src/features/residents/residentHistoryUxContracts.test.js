import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tab = readFileSync(new URL("./ResidentTraceabilityTab.jsx", import.meta.url), "utf8");
const service = readFileSync(new URL("./residentTraceabilityService.js", import.meta.url), "utf8");

describe("historial del residente simple y eficiente", () => {
  it("paginates the summary feed and exposes an explicit load-more action", () => {
    expect(tab).toContain("const PAGE_SIZE = 25");
    expect(tab).toContain("Cargar registros anteriores");
    expect(tab).toContain("cursorRef.current");
  });

  it("loads event details only after the user opens a row", () => {
    expect(tab).toContain("toggleDetail");
    expect(tab).toContain("getResidentTraceDetail");
    expect(tab).toContain("Ver detalle");
    expect(service).toContain('"obtener_detalle_historial_residente_v2"');
  });

  it("applies advanced filters explicitly instead of querying on every keystroke", () => {
    expect(tab).toContain("applyFilters");
    expect(tab).toContain("Aplicar filtros");
    expect(tab).toContain("Buscar en el historial");
    expect(tab).toContain("sameFilters");
  });
});
