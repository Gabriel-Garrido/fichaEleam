import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("contratos visuales de carga", () => {
  it("mantiene indicadores accesibles para carga de página y operaciones globales", () => {
    const source = read("src/components/Loading.jsx");
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-busy="true"');
    expect(source).toContain("export function LoadingOverlay");
    expect(source).toContain("export function PageLoading");
  });

  it("resuelve perfil y ELEAM antes de decidir si muestra planes", () => {
    const source = read("src/routes/AuthenticatedApp.jsx");
    const profileGuard = source.indexOf("profileLoading || !profile");
    const demoDecision = source.indexOf("hasActiveDemo(eleam)", profileGuard);
    const paymentPage = source.indexOf("<PaymentPage", demoDecision);
    expect(profileGuard).toBeGreaterThan(-1);
    expect(demoDecision).toBeGreaterThan(profileGuard);
    expect(paymentPage).toBeGreaterThan(demoDecision);
  });

  it("no presenta ceros de ocupación mientras camas todavía está cargando", () => {
    const source = read("src/features/beds/BedsPage.jsx");
    expect(source).toContain('value={loading ? "…" : metrics.operativas}');
    expect(source).toContain('loading ? "Calculando…"');
  });

  it("distingue fallos de carga de estados vacíos en vistas críticas", () => {
    const compliance = read("src/features/accreditation/AccreditationDashboard.jsx");
    const residents = read("src/features/residents/ResidentList.jsx");
    const staffing = read("src/features/ds20/StaffingPage.jsx");
    expect(compliance).toContain("if (loadError)");
    expect(residents).toContain("error && residents.length === 0");
    expect(staffing).toContain("Sin verificar");
  });
});
