import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NAV_SECTIONS, QUICK_ACTIONS } from "../navigation/navigationConfig";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routeFile = fs.readFileSync(
  path.resolve(__dirname, "AuthenticatedApp.jsx"),
  "utf8"
);

const CRITICAL_ROUTES = [
  "/login",
  "/dashboard",
  "/establecimiento",
  "/establecimiento/camas",
  "/residents/new",
  "/personal",
  "/personal/dotacion",
  "/personal/antecedentes",
  "/operacion/turnos/nuevo",
  "/operacion/cuidados",
  "/operacion/medicamentos",
  "/cumplimiento/reclamos",
  "/cumplimiento",
  "/cumplimiento/seremi",
  "/superadmin",
  "/superadmin/clientes",
  "/superadmin/leads",
];

describe("critical authenticated flow routes", () => {
  it("mantiene declaradas las rutas principales por rol", () => {
    for (const route of CRITICAL_ROUTES) {
      expect(routeFile).toContain(`path="${route}"`);
    }
  });

  it("expone navegación o acción rápida para flujos operativos diarios", () => {
    const navPaths = NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.path));
    const quickPaths = QUICK_ACTIONS.map((item) => item.path);
    const exposed = new Set([...navPaths, ...quickPaths]);

    for (const route of [
      "/dashboard",
      "/residents",
      "/establecimiento",
      "/residents/new",
      "/personal",
      "/operacion/turnos",
      "/operacion/cuidados",
      "/operacion/medicamentos",
      "/cumplimiento",
      "/superadmin",
    ]) {
      expect(exposed.has(route)).toBe(true);
    }
  });
});
