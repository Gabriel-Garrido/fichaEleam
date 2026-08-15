import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

const read = (...parts) => readFileSync(join(cwd(), ...parts), "utf8");
const edge = read("supabase", "functions", "create-staff-user", "index.ts");
const schema = read("supabase_schema.sql");
const service = read("src", "features", "team", "teamService.js");
const directory = read("src", "features", "team", "StaffDirectory.jsx");
const email = read("supabase", "functions", "_shared", "email.ts");
const updateEdge = read("supabase", "functions", "update-staff-user", "index.ts");

describe("same-ELEAM administrator creation contracts", () => {
  it("allows only an authenticated ELEAM admin to select the two supported roles", () => {
    expect(edge).toContain('profile.rol !== "admin_eleam" || !profile.eleam_id');
    expect(edge).toContain('["funcionario", "admin_eleam"].includes(requestedRole)');
  });

  it("derives the target ELEAM exclusively from the caller profile", () => {
    expect(edge).toContain("eleamId: profile.eleam_id");
    expect(edge).toContain("eleam_id_direct: profile.eleam_id");
    expect(edge).not.toContain("body.eleam_id");
  });

  it("authorizes the server-signed admin_created provisioning path in the database trigger", () => {
    expect(schema.match(/'demo_approved', 'superadmin_created', 'admin_created'/g)?.length).toBeGreaterThanOrEqual(2);
    expect(schema).toContain("v_account_source = 'admin_created'");
  });

  it("forwards the selected role but never assigns granular staff permissions to an admin", () => {
    expect(service).toContain("body: { nombre, email, telefono, rol }");
    expect(directory).toContain('if (!isAdmin)');
    expect(directory).toContain("Esta cuenta tendrá control total del ELEAM");
  });

  it("identifies administrator access correctly in the welcome email", () => {
    expect(email).toContain('rol === "admin_eleam" ? "Administrador del ELEAM"');
  });

  it("uses Google directly for Gmail and password activation for other domains", () => {
    expect(edge).toContain("GMAIL_RE.test(cleanEmail)");
    expect(edge).toContain("gmailStaffWelcomeEmail");
    expect(edge).toContain("generateAccessLink(sb, email)");
    expect(edge).toContain("access_method: accessMethod");
    expect(updateEdge).toContain("Esta cuenta ingresa con Google");
  });
});
