import { describe, expect, it, vi } from "vitest";
import {
  CARE_TURN_PERMISSIONS,
  MEDICATION_TURN_PERMISSIONS,
  canUseFeatureAction,
  hasAnyPermission,
} from "./accessRules";

describe("reglas compartidas de acceso", () => {
  it("acepta cualquiera de los permisos alternativos", () => {
    const can = vi.fn((permission) => permission === "validar_medicamentos_controlados");
    expect(hasAnyPermission(can, MEDICATION_TURN_PERMISSIONS)).toBe(true);
  });

  it("exige tanto el área como una acción autorizada", () => {
    expect(canUseFeatureAction({ canFeature: () => false, can: () => true }, "residents", CARE_TURN_PERMISSIONS)).toBe(false);
    expect(canUseFeatureAction({ canFeature: () => true, can: () => false }, "residents", CARE_TURN_PERMISSIONS)).toBe(false);
    expect(canUseFeatureAction({ canFeature: () => true, can: () => true }, "residents", CARE_TURN_PERMISSIONS)).toBe(true);
  });

  it("falla cerrado si faltan las funciones de autorización", () => {
    expect(hasAnyPermission(undefined, CARE_TURN_PERMISSIONS)).toBe(false);
    expect(canUseFeatureAction({}, "residents", [])).toBe(false);
  });
});
