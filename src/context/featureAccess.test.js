import { describe, expect, it } from "vitest";
import { computeCanFeature } from "./featureAccess";

describe("computeCanFeature", () => {
  it("permite cuando no hay featureId (ruta sin gate)", () => {
    expect(computeCanFeature({
      featureId: null,
      isSuperadmin: false,
      featurePermissions: {},
      featurePermissionsError: false,
    })).toBe(true);
  });

  it("permite siempre a superadmin, incluso con error de permisos", () => {
    expect(computeCanFeature({
      featureId: "beds",
      isSuperadmin: true,
      featurePermissions: null,
      featurePermissionsError: true,
    })).toBe(true);
  });

  it("fail-closed: bloquea la feature si los permisos no cargaron", () => {
    expect(computeCanFeature({
      featureId: "beds",
      isSuperadmin: false,
      featurePermissions: null,
      featurePermissionsError: true,
    })).toBe(false);
  });

  it("permite mientras los permisos aún cargan (sin error)", () => {
    expect(computeCanFeature({
      featureId: "beds",
      isSuperadmin: false,
      featurePermissions: null,
      featurePermissionsError: false,
    })).toBe(true);
  });

  it("bloquea una feature explícitamente deshabilitada", () => {
    expect(computeCanFeature({
      featureId: "beds",
      isSuperadmin: false,
      featurePermissions: { beds: false },
      featurePermissionsError: false,
    })).toBe(false);
  });

  it("permite una feature habilitada o ausente del mapa", () => {
    expect(computeCanFeature({
      featureId: "beds",
      isSuperadmin: false,
      featurePermissions: { beds: true },
      featurePermissionsError: false,
    })).toBe(true);
    expect(computeCanFeature({
      featureId: "vital-signs",
      isSuperadmin: false,
      featurePermissions: {},
      featurePermissionsError: false,
    })).toBe(true);
  });
});
