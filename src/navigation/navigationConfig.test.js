import { describe, expect, it } from "vitest";
import { getMobileBottomNav, getNavigationSections, getQuickActions, matchesNavigationItem } from "./navigationConfig";

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
      can: (permission) => !["administrar_medicamentos", "validar_medicamentos_controlados"].includes(permission),
    });
    const actions = getQuickActions(auth).map((item) => item.id);
    expect(actions).not.toContain("medications");
    expect(actions).toContain("daily-care");
  });

  it("muestra medicamentos a quien puede validar aunque no pueda administrar", () => {
    const auth = authFor("funcionario", {
      can: (permission) => permission === "validar_medicamentos_controlados",
    });
    expect(getQuickActions(auth).map((item) => item.id)).toContain("medications");
  });

  it("oculta cuidados cuando el usuario no puede realizar ninguna acción del turno", () => {
    const auth = authFor("funcionario", { can: () => false });
    expect(getQuickActions(auth).map((item) => item.id)).not.toContain("daily-care");
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

  it("rellena la navegación móvil con las áreas realmente habilitadas", () => {
    const auth = authFor("funcionario", {
      canFeature: (featureId) => featureId === "establishment",
    });
    expect(slotIds(getMobileBottomNav(auth))).toEqual(["establishment", "__home__"]);
  });

  it("separa la navegación operativa de la plataforma en perfiles superadmin vinculados a un ELEAM", () => {
    const auth = authFor("superadmin", {
      profile: { eleam_id: "e1" },
    });
    const sections = getNavigationSections(auth);
    expect(sections.map((section) => section.id)).toEqual(["producto"]);
    expect(slotIds(getMobileBottomNav(auth))).toEqual([
      "dashboard",
      "residents",
      "__home__",
      "personnel",
      "compliance",
    ]);
  });

  it("mantiene activa Residentes en sus flujos clínicos relacionados", () => {
    const residents = getNavigationSections(authFor("admin_eleam"))
      .flatMap((section) => section.items)
      .find((item) => item.id === "residents");
    expect(matchesNavigationItem(residents, "/residents/r1")).toBe(true);
    expect(matchesNavigationItem(residents, "/operacion/cuidados")).toBe(true);
    expect(matchesNavigationItem(residents, "/eventos-adversos/nuevo")).toBe(true);
    expect(matchesNavigationItem(residents, "/cumplimiento")).toBe(false);
  });

  it("muestra Tareas del turno a quien puede realizar al menos uno de sus registros", () => {
    const auth = authFor("funcionario", {
      can: (permission) => permission === "crear_signos_vitales",
    });
    expect(getQuickActions(auth).map((item) => item.id)).toContain("daily-care");
  });
});
