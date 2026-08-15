import { describe, expect, it } from "vitest";
import { friendlyError, sanitizeUserMessage } from "./errorMessages";

describe("friendlyError", () => {
  it.each([
    [{ code: "42501", message: "internal policy detail" }, "No tienes permisos"],
    [{ code: "23505", message: "residentes_rut_key" }, "Ya existe un registro"],
    [{ code: "PGRST116" }, "no existe o fue eliminado"],
    [{ status: 429 }, "demasiadas veces"],
  ])("maps stable backend codes without exposing internals", (error, expected) => {
    const message = friendlyError(error);
    expect(message).toContain(expected);
    expect(message).not.toContain(error.message ?? "internal policy detail");
  });

  it("uses a domain fallback for unknown internal errors", () => {
    expect(friendlyError({ code: "XX000", message: "relation secret_table failed" }, "No se pudo guardar."))
      .toBe("No se pudo guardar.");
  });

  it.each([
    { code: "42703", message: 'column "ver_pagos_residentes" does not exist' },
    { code: "42P01", message: 'relation "internal_table" does not exist' },
    { code: "PGRST202", message: "Could not find the function in the schema cache" },
  ])("does not expose schema drift details", (error) => {
    expect(friendlyError(error, "No se pudo guardar.")).toBe("No se pudo guardar.");
  });

  it("sanitizes technical strings before a global error toast renders them", () => {
    expect(sanitizeUserMessage('column "ver_pagos_residentes" does not exist'))
      .toBe("No pudimos completar la acción. Intenta nuevamente.");
    expect(sanitizeUserMessage("Completa el campo obligatorio."))
      .toBe("Completa el campo obligatorio.");
  });

  it("keeps the actionable duplicate mapping before sanitizing database details", () => {
    expect(friendlyError({ message: "duplicate key value violates unique constraint" }))
      .toContain("Ya existe un registro");
  });
});
