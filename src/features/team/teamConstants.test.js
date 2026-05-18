import { describe, expect, it } from "vitest";
import { PLANTILLAS_CARGO } from "./teamConstants";

describe("team permission presets", () => {
  it("lets nurses create residents and update accreditation status by default", () => {
    expect(PLANTILLAS_CARGO["Enfermero/a"]).toMatchObject({
      crear_residentes: true,
      editar_acreditacion: true,
    });
  });

  it("only enables eMAR indication create/edit permissions for doctors", () => {
    const eMarEditorCargos = Object.entries(PLANTILLAS_CARGO)
      .filter(([, permisos]) =>
        permisos.crear_indicaciones_medicamentos ||
        permisos.editar_indicaciones_medicamentos
      )
      .map(([cargo]) => cargo);

    expect(eMarEditorCargos).toEqual(["Médico/a"]);
  });
});
