import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readFunction = (name) => readFileSync(
  new URL(`./${name}/index.ts`, import.meta.url),
  "utf8",
);

describe("Edge Function response security", () => {
  it("does not return serialized internal errors while provisioning demos", () => {
    const source = readFunction("create-demo-user");
    expect(source).not.toContain("describeError");
    expect(source).not.toMatch(/detail:\s*(?:String\(|error|err|e\b)/);
  });

  it("keeps technical schema instructions out of staff-facing errors", () => {
    const source = readFunction("create-staff-user");
    expect(source).not.toMatch(/error:\s*["'`][^"'`]*supabase_schema\.sql/i);
  });
});
