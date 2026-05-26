import { describe, expect, it } from "vitest";
import {
  optionalNumber,
  parseWithSchema,
  requiredDateTime,
  userFacingFormError,
  z,
} from "./formValidation";

describe("formValidation helpers", () => {
  it("normalizes optional numbers and enforces integer ranges", () => {
    const schema = z.object({
      value: optionalNumber("Cantidad", { min: 1, max: 10, integer: true }),
    });

    expect(parseWithSchema(schema, { value: "" })).toEqual({ ok: true, data: { value: null }, errors: {} });
    expect(parseWithSchema(schema, { value: "7" }).data).toEqual({ value: 7 });
    expect(parseWithSchema(schema, { value: "7.5" }).errors.value).toBe("Cantidad debe ser un número entero.");
    expect(parseWithSchema(schema, { value: "12" }).errors.value).toBe("Cantidad debe ser menor o igual a 10.");
  });

  it("requires local datetime values with date and hour", () => {
    const schema = z.object({ fecha_hora: requiredDateTime("Fecha y hora") });

    expect(parseWithSchema(schema, { fecha_hora: "2026-05-24T09:30" }).ok).toBe(true);
    expect(parseWithSchema(schema, { fecha_hora: "2026-05-24" }).errors.fecha_hora).toBe(
      "Fecha y hora debe tener fecha y hora válidas."
    );
  });

  it("maps backend and network errors to actionable form messages", () => {
    expect(userFacingFormError(new Error("Failed to fetch"))).toContain("conectar");
    expect(userFacingFormError(new Error("duplicate key value violates unique constraint"))).toContain("Ya existe");
    expect(userFacingFormError(new Error("PGRST301: token expired"), "No se pudo guardar.")).toBe("No se pudo guardar.");
  });
});
