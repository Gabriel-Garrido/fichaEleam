import { describe, expect, it } from "vitest";
import { demoGrantResultMessage, getDemoLeadAccessState } from "./demoAccess";

describe("getDemoLeadAccessState", () => {
  it("detects a pending request", () => {
    expect(getDemoLeadAccessState({ estado: "nuevo" })).toMatchObject({
      key: "pending_request",
      canGrant: true,
      actionLabel: "Crear cuenta demo",
    });
  });

  it("detects approved demo accounts", () => {
    expect(getDemoLeadAccessState({ estado: "demo_activo", demo_user_id: "user-id" })).toMatchObject({
      key: "account_demo",
      canGrant: true,
      actionLabel: "Reenviar acceso",
    });
  });

  it("blocks terminal lead states", () => {
    expect(getDemoLeadAccessState({ estado: "descartado" })).toMatchObject({
      key: "blocked_state",
      canGrant: false,
    });
  });
});

describe("demoGrantResultMessage", () => {
  it("describes created demo accounts", () => {
    expect(demoGrantResultMessage({ code: "created", email_sent: true }).toast).toBe("Usuario demo creado correctamente");
  });

  it("describes repaired auth users", () => {
    expect(demoGrantResultMessage({ code: "repaired_auth" })).toMatchObject({
      title: "Cuenta reparada",
    });
  });

  it("describes reused demo accounts", () => {
    expect(demoGrantResultMessage({ code: "reused_demo", email_sent: true })).toMatchObject({
      title: "Demo reutilizado",
      toast: "Demo activado y enlace de acceso enviado",
    });
  });

  it("describes already active demos", () => {
    expect(demoGrantResultMessage({ code: "access_resent", email_sent: true })).toMatchObject({
      title: "Demo ya aprobado",
      toast: "Nuevo enlace de acceso enviado",
    });
  });

  it("describes email delivery failures", () => {
    expect(demoGrantResultMessage({
      code: "created",
      email_sent: false,
      email_error: "RESEND_API_KEY missing",
    }).toast).toContain("no se pudo enviar");
  });
});
