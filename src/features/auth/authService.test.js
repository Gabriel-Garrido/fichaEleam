import { describe, expect, it } from "vitest";
import { authErrorMessage, classifyAuthError, isPendingDemoError } from "./authService";

describe("auth error classification", () => {
  it("classifies pending demo errors from SQL/OAuth callbacks", () => {
    const error = { message: "DEMO_PENDING: Tu demo esta registrado" };

    expect(classifyAuthError(error)).toBe("demo_pending");
    expect(isPendingDemoError(error)).toBe(true);
    expect(authErrorMessage(error)).toContain("login se habilita");
  });

  it("maps invalid credentials to a demo-aware message", () => {
    const message = authErrorMessage({ message: "Invalid login credentials" });

    expect(classifyAuthError({ message: "Invalid login credentials" })).toBe("invalid_credentials");
    expect(message).toContain("Correo o contrase");
    expect(message).toContain("espera el correo de activaci");
  });

  it("does not expose unauthorized backend wording", () => {
    const message = authErrorMessage({ message: "Cuenta no autorizada. Debe ser aprobada" });

    expect(classifyAuthError({ message: "Cuenta no autorizada" })).toBe("unauthorized_account");
    expect(message).toContain("No encontramos una cuenta habilitada");
  });

  it("classifies network errors", () => {
    expect(classifyAuthError({ message: "Failed to fetch" })).toBe("network");
    expect(authErrorMessage({ message: "NetworkError" })).toContain("Revisa tu conexi");
  });
});
