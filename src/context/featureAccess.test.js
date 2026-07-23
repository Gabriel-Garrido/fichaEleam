import { describe, expect, it } from "vitest";
import { computeCanFeature, resolveFeatureHomePath } from "./featureAccess";

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

  it("bloquea al funcionario mientras sus áreas aún no cargan", () => {
    expect(computeCanFeature({
      featureId: "beds",
      isSuperadmin: false,
      isAdminEleam: false,
      isFuncionario: true,
      featurePermissions: null,
      featurePermissionsError: false,
    })).toBe(false);
  });

  it("bloquea una feature explícitamente deshabilitada", () => {
    expect(computeCanFeature({
      featureId: "beds",
      isSuperadmin: false,
      featurePermissions: { beds: false },
      featurePermissionsError: false,
    })).toBe(false);
  });

  it("exige habilitación explícita para funcionarios", () => {
    expect(computeCanFeature({
      featureId: "beds",
      isSuperadmin: false,
      isAdminEleam: false,
      isFuncionario: true,
      featurePermissions: { beds: true },
      featurePermissionsError: false,
    })).toBe(true);
    expect(computeCanFeature({
      featureId: "vital-signs",
      isSuperadmin: false,
      isAdminEleam: false,
      isFuncionario: true,
      featurePermissions: {},
      featurePermissionsError: false,
    })).toBe(false);
  });

  it("usa el permiso de lectura explícito para cumplimiento", () => {
    const base = {
      featureId: "compliance",
      isSuperadmin: false,
      isAdminEleam: false,
      isFuncionario: true,
      featurePermissions: { compliance: true },
      featurePermissionsError: false,
    };
    expect(computeCanFeature(base)).toBe(true);
    expect(computeCanFeature({ ...base, featurePermissions: { compliance: false } })).toBe(false);
  });

  it("mantiene cumplimiento disponible para el administrador", () => {
    expect(computeCanFeature({
      featureId: "compliance",
      isSuperadmin: false,
      isAdminEleam: true,
      isFuncionario: false,
      permisos: null,
      featurePermissions: { compliance: true },
      featurePermissionsError: false,
    })).toBe(true);
  });
});

describe("resolveFeatureHomePath", () => {
  it("uses cobranza when it is the only visible feature", () => {
    expect(resolveFeatureHomePath((featureId) => featureId === "resident_payments")).toBe("/cobranza");
  });

  it("falls back safely when no feature is visible", () => {
    expect(resolveFeatureHomePath(() => false)).toBe("/sin-permisos");
  });
});
