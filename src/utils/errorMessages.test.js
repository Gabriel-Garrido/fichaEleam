import { describe, expect, it } from "vitest";
import { friendlyError } from "./errorMessages";

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
});
