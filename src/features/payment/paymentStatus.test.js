import { describe, expect, it } from "vitest";
import { canStartSubscription, hasPendingDemoAccess, subscriptionButtonLabel } from "./paymentStatus";

const NOW = new Date("2026-05-17T12:00:00.000Z");

describe("hasPendingDemoAccess", () => {
  it("keeps demo access while a MercadoPago checkout is pending", () => {
    expect(hasPendingDemoAccess({
      plan: "demo",
      subscription_status: "pendiente",
      fecha_vencimiento_suscripcion: "2026-05-20T00:00:00.000Z",
    }, NOW)).toBe(true);
  });

  it("does not keep access for expired pending demos", () => {
    expect(hasPendingDemoAccess({
      plan: "demo",
      subscription_status: "pendiente",
      fecha_vencimiento_suscripcion: "2026-05-01T00:00:00.000Z",
    }, NOW)).toBe(false);
  });
});

describe("canStartSubscription", () => {
  it("allows active demos to start a paid subscription", () => {
    expect(canStartSubscription({
      plan: "demo",
      subscription_status: "activo",
    })).toBe(true);
  });

  it("blocks active paid subscriptions", () => {
    expect(canStartSubscription({
      plan: "mensual",
      subscription_status: "activo",
    })).toBe(false);
  });

  it("blocks duplicate pending preapprovals", () => {
    expect(canStartSubscription({
      plan: "demo",
      subscription_status: "pendiente",
      mp_preapproval_id: "abc",
    })).toBe(false);
  });
});

describe("subscriptionButtonLabel", () => {
  it("shows a pending payment label for the selected pending plan", () => {
    expect(subscriptionButtonLabel({
      isDemo: true,
      isPendingPlan: true,
      user: { id: "u" },
      isAdminEleam: true,
    })).toBe("Pago en curso");
  });
});
