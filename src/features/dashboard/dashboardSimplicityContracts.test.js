import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(new URL("./AdminDashboard.jsx", import.meta.url), "utf8");
const panels = readFileSync(new URL("./DashboardPanels.jsx", import.meta.url), "utf8");
const service = readFileSync(new URL("./dashboardService.js", import.meta.url), "utf8");

describe("dashboard simple y orientado al turno", () => {
  it("ubica las acciones principales antes que alertas e indicadores", () => {
    expect(dashboard).toContain('title="Resumen del día"');
    expect(dashboard.indexOf("dashboard-actions-title")).toBeLessThan(dashboard.indexOf("<CriticalAlerts"));
    expect(dashboard).toContain("Acciones del turno");
  });

  it("evita accesos redundantes con el menú lateral", () => {
    expect(dashboard).not.toContain("Preparar carpeta");
    expect(dashboard).not.toContain("Más accesos");
    expect(dashboard).not.toContain("Gestionar personal");
    expect(dashboard).not.toContain('label: "Signos vitales"');
    expect(dashboard).not.toContain('label: "Registro de evolución"');
  });

  it("muestra sólo alertas activas y repliega la información secundaria", () => {
    expect(panels).toContain("chip.visible && chip.value > 0");
    expect(dashboard).toContain("Más información");
    expect(dashboard).toContain("<details");
  });

  it("consulta únicamente las áreas habilitadas y filtra acciones granulares", () => {
    expect(dashboard).toContain("loadDashboard(dashboardAccess)");
    expect(service).toContain('enabled("residents")');
    expect(service).toContain('enabled("compliance")');
    expect(service).toContain('enabled("personnel")');
    expect(panels).toContain("visible: canMedications");
    expect(panels).toContain("visible: canFollowUps");
  });
});
