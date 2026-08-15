import { describe, expect, it } from "vitest";
import { applyPermissionToggle, evaluateFuncionarioPermission } from "./actionPermission";

describe("dependencias de permisos de funcionarios", () => {
  it("exige lectura para registrar una entrega de turno", () => {
    expect(evaluateFuncionarioPermission({ registrar_entregas_turno: true, ver_entregas_turno: false }, "registrar_entregas_turno")).toBe(false);
    expect(evaluateFuncionarioPermission({ registrar_entregas_turno: true, ver_entregas_turno: true }, "registrar_entregas_turno")).toBe(true);
  });

  it.each(["registrar_pagos_residentes", "enviar_comprobantes_pagos", "anular_pagos_residentes"])(
    "exige lectura de cobranza para %s",
    (permission) => {
      expect(evaluateFuncionarioPermission({ [permission]: true, ver_pagos_residentes: false }, permission)).toBe(false);
      expect(evaluateFuncionarioPermission({ [permission]: true, ver_pagos_residentes: true }, permission)).toBe(true);
    },
  );

  it("falla cerrado ante datos ausentes o permisos desconocidos", () => {
    expect(evaluateFuncionarioPermission(null, "crear_residentes")).toBe(false);
    expect(evaluateFuncionarioPermission({}, "permiso_inexistente")).toBe(false);
  });

  it("mantiene dependencias coherentes al configurar permisos", () => {
    expect(applyPermissionToggle({}, "registrar_entregas_turno", true)).toMatchObject({
      registrar_entregas_turno: true,
      ver_entregas_turno: true,
    });
    expect(applyPermissionToggle({ registrar_entregas_turno: true, ver_entregas_turno: true }, "ver_entregas_turno", false)).toMatchObject({
      registrar_entregas_turno: false,
      ver_entregas_turno: false,
    });
  });
});
