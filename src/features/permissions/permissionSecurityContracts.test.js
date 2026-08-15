import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("supabase_schema.sql", "utf8");
const migration = readFileSync("supabase/migrations/20260815190000_harden_team_permission_policies.sql", "utf8");

describe("contratos de seguridad de permisos", () => {
  it.each([schema, migration])("exige ELEAM vigente al modificar permisos", (sql) => {
    expect(sql).toMatch(/create policy "fp_admin_all"[\s\S]*?eleam_has_access\(public\.my_eleam_id\(\)\)/);
    expect(sql).toMatch(/create policy "pfp_admin_all"[\s\S]*?eleam_has_access\(public\.my_eleam_id\(\)\)/);
  });
});
