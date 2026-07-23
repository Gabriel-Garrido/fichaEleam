import { describe, expect, it } from "vitest";
import {
  FEATURE_ACTION_PERMISSIONS,
  PERMISSION_FEATURE,
  PLANTILLAS_CARGO,
  defaultPermissionsForFunction,
  normalizePaymentAccess,
} from "./teamConstants";

describe("team permission presets", () => {
  it("lets nurses create residents and update accreditation status by default", () => {
    expect(PLANTILLAS_CARGO["Enfermero/a"]).toMatchObject({
      crear_residentes: true,
      editar_acreditacion: true,
      asignar_camas: true,
    });
  });

  it("only enables medication indication create/edit permissions for doctors", () => {
    const eMarEditorCargos = Object.entries(PLANTILLAS_CARGO)
      .filter(([, permisos]) =>
        permisos.crear_indicaciones_medicamentos ||
        permisos.editar_indicaciones_medicamentos
      )
      .map(([cargo]) => cargo);

    expect(eMarEditorCargos).toEqual(["Médico/a"]);
  });

  it("derives safe defaults from the selected team function", () => {
    const caregiver = defaultPermissionsForFunction("cuidador");
    expect(caregiver.areas.residents).toBe(true);
    expect(caregiver.actions.completar_tareas_cuidado).toBe(true);
    expect(caregiver.actions.editar_indicaciones_medicamentos).toBe(false);

    const cleaner = defaultPermissionsForFunction("aseo");
    expect(Object.values(cleaner.actions).every((allowed) => allowed === false)).toBe(true);
    expect(cleaner.areas.establishment).toBe(true);
  });

  it("maps every action to the area that must be visible", () => {
    const mappedActions = Object.values(FEATURE_ACTION_PERMISSIONS).flat();
    expect(mappedActions).toHaveLength(Object.keys(PERMISSION_FEATURE).length);
    expect(PERMISSION_FEATURE.asignar_camas).toBe("establishment");
    expect(PERMISSION_FEATURE.administrar_medicamentos).toBe("residents");
    expect(PERMISSION_FEATURE.gestionar_reclamos).toBe("compliance");
    expect(PERMISSION_FEATURE.registrar_pagos_residentes).toBe("resident_payments");
    expect(PERMISSION_FEATURE.enviar_comprobantes_pagos).toBe("resident_payments");
  });

  it("closes every payment action when reading and area access disagree", () => {
    const normalized = normalizePaymentAccess(
      { resident_payments: true },
      {
        ver_pagos_residentes: false,
        registrar_pagos_residentes: true,
        enviar_comprobantes_pagos: true,
        anular_pagos_residentes: true,
      },
    );
    expect(normalized.areas.resident_payments).toBe(false);
    expect(normalized.actions).toMatchObject({
      ver_pagos_residentes: false,
      registrar_pagos_residentes: false,
      enviar_comprobantes_pagos: false,
      anular_pagos_residentes: false,
    });
  });
});
