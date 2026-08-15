import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("inicio de demos según proveedor de correo", () => {
  it("clasifica Gmail y evita exigir una contraseña en ese flujo", () => {
    const provisioning = read("supabase/functions/_shared/provisioning.ts");
    const demo = read("supabase/functions/create-demo-user/index.ts");
    expect(provisioning).toContain("@gmail\\.com");
    expect(demo).toContain("const mustResetPassword = !GMAIL_RE.test(cleanEmail)");
    expect(demo).toContain('accessMethod === "google"');
  });

  it("genera un enlace de recuperación sólo para el acceso con contraseña", () => {
    const demo = read("supabase/functions/create-demo-user/index.ts");
    const googleBranch = demo.indexOf('if (accessMethod === "google")');
    const recoveryLink = demo.indexOf("generateAccessLink(sb, email)", googleBranch);
    expect(googleBranch).toBeGreaterThan(-1);
    expect(recoveryLink).toBeGreaterThan(googleBranch);
  });

  it("envía instrucciones diferenciadas y menciona la cuenta exacta", () => {
    const email = read("supabase/functions/_shared/email.ts");
    expect(email).toContain("No necesitas crear ni recordar una contraseña");
    expect(email).toContain("Crear mi contraseña");
    expect(email).toContain("Selecciona exactamente");
    expect(email).toContain("¿Olvidaste tu contraseña?");
  });

  it("usa la misma vigencia de acceso para todos los cambios del equipo", () => {
    const shared = read("supabase/functions/_shared/supabase.ts");
    expect(shared).toContain("eleamHasOperationalAccess");
    expect(shared).toContain('eleam.plan === "demo" && eleam.subscription_status === "pendiente"');
    expect(read("supabase/functions/create-staff-user/index.ts")).toContain("hasOperationalAccess(eleam)");
    for (const functionName of ["update-staff-user", "delete-staff-user"]) {
      expect(read(`supabase/functions/${functionName}/index.ts`)).toContain("eleamHasOperationalAccess(profile.eleam_id)");
    }
  });
});
