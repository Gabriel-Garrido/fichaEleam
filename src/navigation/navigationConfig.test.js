import { describe, expect, it } from "vitest";
import { getMobileBottomNav, getNavigationSections, getQuickActions } from "./navigationConfig";

function authFor(role, overrides = {}) {
  return {
    user: { id: "u1" },
    rol: role,
    profile: { eleam_id: role === "superadmin" ? null : "e1" },
    pagoActivo: true,
    isSuperadmin: role === "superadmin",
    canFeature: () => true,
    can: () => true,
    ...overrides,
  };
}

function slotIds(slots) {
  return slots.map((slot) => (slot.type === "home" ? "__home__" : slot.item.id));
}

describe("navigationConfig role workflows", () => {
  it("mantiene las cinco áreas principales para funcionarios", () => {
    const slots = getMobileBottomNav(authFor("funcionario"));
    expect(slotIds(slots)).toEqual([
      "dashboard",
      "residents",
      "__home__",
      "personnel",
      "compliance",
    ]);
  });

  it("mantiene las cinco áreas principales para administradores", () => {
    const slots = getMobileBottomNav(authFor("admin_eleam"));
    expect(slotIds(slots)).toEqual([
      "dashboard",
      "residents",
      "__home__",
      "personnel",
      "compliance",
    ]);
  });

  it("oculta acciones si falta permiso granular", () => {
    const auth = authFor("funcionario", {
      can: (permission) => permission !== "administrar_medicamentos",
    });
    const actions = getQuickActions(auth).map((item) => item.id);
    expect(actions).not.toContain("medications");
    expect(actions).toContain("daily-care");
  });

  it.each(["dashboard", "establishment", "residents", "personnel", "compliance", "resident_payments"])(
    "oculta %s en escritorio y móvil cuando el área está denegada",
    (deniedFeature) => {
      const auth = authFor("funcionario", {
        canFeature: (featureId) => featureId !== deniedFeature,
      });
      const items = getNavigationSections(auth).flatMap((section) => section.items.map((item) => item.id));
      expect(items).not.toContain(deniedFeature);
      expect(slotIds(getMobileBottomNav(auth))).not.toContain(deniedFeature);
    },
  );

  it("mantiene la cobranza separada de las cinco áreas operativas", () => {
    const sections = getNavigationSections(authFor("admin_eleam"));
    const items = sections.flatMap((section) => section.items.map((item) => item.id));
    expect(items).toEqual(["dashboard", "establishment", "residents", "personnel", "compliance", "resident_payments"]);
  });
});
