import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const read = (...parts) => readFileSync(join(cwd(), ...parts), "utf8");
const schema = read("supabase_schema.sql");
const edge = read("supabase", "functions", "delete-staff-user", "index.ts");
const directory = read("src", "features", "team", "StaffDirectory.jsx");
const service = read("src", "features", "team", "teamService.js");
const migration = read("supabase", "migrations", "20260815183000_fix_team_access_history_relation.sql");

describe("ciclo seguro de acceso de usuarios", () => {
  it("conserva el perfil y registra cada desactivación o restauración", () => {
    expect(schema).toContain("create table if not exists public.usuario_acceso_historial");
    expect(schema).toContain("acceso_activo boolean not null default true");
    expect(schema).toContain("'desactivado', v_motivo, v_caller.id");
    expect(schema).toContain("'restaurado', v_caller.id");
    expect(edge).not.toContain("deleteUser(");
  });

  it("bloquea Auth y deniega por RLS a una cuenta desactivada", () => {
    expect(edge).toContain('ban_duration: banDuration');
    expect(schema).toContain("and acceso_activo = true");
    expect(schema).toContain("select rol from public.profiles where id = (select auth.uid()) and acceso_activo = true");
  });

  it("impide auto-desactivarse y protege al último administrador", () => {
    expect(schema).toContain("if p_profile_id = v_caller.id then");
    expect(schema).toContain("if v_admins_activos <= 1 then");
    expect(schema).toContain("for update;");
  });

  it("ofrece motivo, confirmación, historial y restauración en la interfaz", () => {
    expect(directory).toContain("Motivo de la desactivación");
    expect(directory).toContain("Accesos desactivados");
    expect(directory).toContain("Restaurar acceso");
    expect(directory).toContain("deactivateAcknowledged");
  });

  it("resuelve los responsables sin depender de una relación inválida en el cache", () => {
    expect(service).toContain("realizado_por, realizado_en");
    expect(service).not.toContain("autor:profiles!usuario_acceso_historial_realizado_por_fkey");
    expect(service).toContain('from("profiles")');
    expect(migration).toContain("references public.profiles(id)");
    expect(migration).toContain("reload schema");
  });

  it("no bloquea el directorio si falla una consulta secundaria", () => {
    expect(directory).toContain("Promise.allSettled");
    expect(directory).toContain('membersResult.status === "rejected"');
    expect(directory).toContain("El directorio está disponible");
  });
});
