import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const drawer = readFileSync("src/features/superadmin/components/EleamCustomerDrawer.jsx", "utf8");
const table = readFileSync("src/features/superadmin/components/EleamTable.jsx", "utf8");
const service = readFileSync("src/features/superadmin/superadminService.js", "utf8");
const edge = readFileSync("supabase/functions/manage-demo-engagement/index.ts", "utf8");
const schema = readFileSync("supabase_schema.sql", "utf8");
const invitationModal = readFileSync("src/features/superadmin/components/DemoRestartInvitationModal.jsx", "utf8");

describe("contratos UX y seguridad de Superadmin", () => {
  it("divide el detalle del cliente para no mostrar todo simultáneamente", () => {
    expect(drawer).toContain('["summary", "Resumen"]');
    expect(drawer).toContain('["usage", "Uso"]');
    expect(drawer).toContain('["followup", "Seguimiento"]');
  });

  it("muestra capacidad y último ingreso en la cartera", () => {
    expect(table).toContain("residentesActivos");
    expect(table).toContain("camasOcupadas");
    expect(table).toContain("demoLoginLabel");
  });

  it("gestiona demos exclusivamente mediante una Edge Function autenticada", () => {
    expect(service).toContain(["functions", 'invoke("manage-demo-engagement"'].join("."));
    expect(edge).toContain('profile.rol !== "superadmin"');
    expect(edge).toContain('eleam.plan !== "demo"');
    expect(edge).toContain("recoveryEmailIsCoolingDown");
    expect(edge).toContain('action === "preview_restart_invitation"');
    expect(edge).toContain('action === "restart_invitation"');
    expect(edge).toContain("hasPaidPlan(eleam.plan)");
  });

  it("muestra el correo exacto antes de reiniciar y enviar", () => {
    expect(invitationModal).toContain("Vista previa de la invitación");
    expect(invitationModal).toContain("preview.subject");
    expect(invitationModal).toContain("preview.body");
    expect(invitationModal).toContain("preview.cta");
    expect(invitationModal).toContain("Reiniciar 30 días y enviar");
  });

  it("la consulta agregada incluye residentes y camas", () => {
    for (const column of ["residentes_totales", "residentes_activos", "camas_totales", "camas_ocupadas"]) {
      expect(schema).toContain(column);
    }
    const dropAt = schema.indexOf("drop function if exists public.superadmin_portfolio_usage(integer)");
    const createAt = schema.indexOf("create function public.superadmin_portfolio_usage");
    expect(dropAt).toBeGreaterThanOrEqual(0);
    expect(createAt).toBeGreaterThan(dropAt);
  });
});
