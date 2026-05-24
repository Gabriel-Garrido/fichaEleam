import { describe, expect, it } from "vitest";
import { getPasswordStrength, PASSWORD_MAX_LENGTH, validatePassword } from "./passwordValidation";

describe("validatePassword", () => {
  it("requiere largo mínimo, mayúscula y número", () => {
    expect(validatePassword("Abc12", "Abc12")).toMatch(/al menos 8/);
    expect(validatePassword("abcdefgh1", "abcdefgh1")).toMatch(/mayúscula/);
    expect(validatePassword("Abcdefgh", "Abcdefgh")).toMatch(/número/);
  });

  it("rechaza contraseñas demasiado largas", () => {
    const password = `A1${"x".repeat(PASSWORD_MAX_LENGTH)}`;
    expect(validatePassword(password, password)).toMatch(/no puede superar 128/);
  });

  it("rechaza confirmación distinta y acepta una contraseña válida", () => {
    expect(validatePassword("Abcdefgh1", "Abcdefgh2")).toBe("Las contraseñas no coinciden.");
    expect(validatePassword("Abcdefgh1", "Abcdefgh1")).toBeNull();
  });
});

describe("getPasswordStrength", () => {
  it("no muestra indicador para contraseña vacía", () => {
    expect(getPasswordStrength("")).toBeNull();
  });

  it("clasifica fortaleza con la misma escala visual usada por UI", () => {
    expect(getPasswordStrength("abc")?.txt).toBe("Débil");
    expect(getPasswordStrength("abcdefgh1")?.txt).toBe("Regular");
    expect(getPasswordStrength("Abcdefgh1")?.txt).toBe("Buena");
    expect(getPasswordStrength("Abcdefgh1234")?.txt).toBe("Muy fuerte");
  });
});
