import { describe, expect, it, vi } from "vitest";
import {
  applyPostgresErrorToForm,
  optionalNumber,
  parsePostgresError,
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

describe("parsePostgresError", () => {
  const fieldMap = {
    email: { field: "email", message: "El correo no tiene un formato válido." },
    eleam_nombre: { field: "eleam_nombre", message: "El nombre del ELEAM no tiene el formato permitido." },
    motivo_perdida: { field: "motivo_perdida", message: "Indica el motivo de pérdida." },
    crm_prospects_lost_reason_required: { field: "motivo_perdida", message: "Cuando la etapa es perdido debes indicar un motivo." },
    crm_prospects_email_unique: { field: "email", message: "Ya existe un prospecto con ese correo." },
  };

  it("maps NOT NULL violations to the named column", () => {
    const err = {
      code: "23502",
      message: 'null value in column "eleam_nombre" of relation "crm_prospects" violates not-null constraint',
    };
    const parsed = parsePostgresError(err, fieldMap);
    expect(parsed?.field).toBe("eleam_nombre");
    expect(parsed?.message).toMatch(/ELEAM/);
  });

  it("maps UNIQUE violations using fieldMap index name first, then table_col_unique convention", () => {
    const err = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "crm_prospects_email_unique"',
    };
    const parsed = parsePostgresError(err, fieldMap);
    expect(parsed?.field).toBe("email");
    expect(parsed?.message).toMatch(/correo/);
  });

  it("maps explicitly-named CHECK constraints via the fieldMap key", () => {
    const err = {
      code: "23514",
      message: 'new row for relation "crm_prospects" violates check constraint "crm_prospects_lost_reason_required"',
    };
    const parsed = parsePostgresError(err, fieldMap);
    expect(parsed?.field).toBe("motivo_perdida");
    expect(parsed?.message).toMatch(/perdido/);
  });

  it("falls back to extracting column from auto-named <table>_<col>_check constraints", () => {
    const err = {
      code: "23514",
      message: 'new row for relation "crm_prospects" violates check constraint "crm_prospects_email_check"',
    };
    const parsed = parsePostgresError(err, fieldMap);
    expect(parsed?.field).toBe("email");
  });

  it("returns generic message when CHECK constraint name cannot be mapped", () => {
    const err = {
      code: "23514",
      message: 'new row for relation "crm_prospects" violates check constraint "some_unknown_constraint"',
    };
    const parsed = parsePostgresError(err, fieldMap);
    expect(parsed?.field).toBeNull();
    expect(parsed?.message).toMatch(/some_unknown_constraint|formato/);
  });

  it("identifies invalid input syntax for specific Postgres types", () => {
    expect(parsePostgresError({ code: "22P02", message: 'invalid input syntax for type integer: "abc"' })?.message).toMatch(/numérico/);
    expect(parsePostgresError({ code: "22P02", message: 'invalid input syntax for type date: "xxx"' })?.message).toMatch(/fecha/);
    expect(parsePostgresError({ code: "22P02", message: 'invalid input syntax for type uuid: "xxx"' })?.message).toMatch(/identificador/);
  });

  it("returns the raw P0001 message but tries to map columns by name", () => {
    const err = { code: "P0001", message: "eleam_nombre es obligatorio" };
    const parsed = parsePostgresError(err, fieldMap);
    expect(parsed?.field).toBe("eleam_nombre");
  });

  it("returns null when error is null or undefined", () => {
    expect(parsePostgresError(null)).toBeNull();
    expect(parsePostgresError(undefined)).toBeNull();
  });
});

describe("applyPostgresErrorToForm", () => {
  it("sets a field-level error when the column is identifiable", () => {
    const setErrors = vi.fn((updater) => updater({}));
    const err = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "crm_prospects_email_unique"',
    };
    const result = applyPostgresErrorToForm(err, setErrors, {
      fieldMap: { crm_prospects_email_unique: { field: "email", message: "Ya existe un prospecto con ese correo." } },
    });
    expect(result.field).toBe("email");
    expect(setErrors).toHaveBeenCalled();
  });

  it("falls back to _form general error when no field can be mapped", () => {
    let capturedState = null;
    const setErrors = vi.fn((updater) => { capturedState = updater({}); return capturedState; });
    const err = { code: "22001", message: "value too long for type character varying(40)" };
    const result = applyPostgresErrorToForm(err, setErrors, { fallback: "No se pudo guardar." });
    expect(result.field).toBeNull();
    expect(capturedState._form).toMatch(/largo máximo/);
  });
});
