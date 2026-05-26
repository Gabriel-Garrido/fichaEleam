import { describe, expect, it } from "vitest";
import { parseFilterValue, serializeFilterValue, useFilterParams } from "./useFilterParams";

describe("parseFilterValue", () => {
  it("returns default for empty/null/undefined raw value", () => {
    expect(parseFilterValue(null, "string", "fallback")).toBe("fallback");
    expect(parseFilterValue(undefined, "string", "fallback")).toBe("fallback");
    expect(parseFilterValue("", "string", "fallback")).toBe("fallback");
  });

  it("parses booleans tolerantly", () => {
    expect(parseFilterValue("true", "boolean", false)).toBe(true);
    expect(parseFilterValue("1", "boolean", false)).toBe(true);
    expect(parseFilterValue("false", "boolean", true)).toBe(false);
    expect(parseFilterValue("0", "boolean", true)).toBe(false);
    expect(parseFilterValue("garbage", "boolean", true)).toBe(true);
  });

  it("parses numbers and falls back when invalid", () => {
    expect(parseFilterValue("42", "number", 0)).toBe(42);
    expect(parseFilterValue("3.14", "number", 0)).toBe(3.14);
    expect(parseFilterValue("not-a-number", "number", 7)).toBe(7);
  });

  it("validates YYYY-MM-DD date strings", () => {
    expect(parseFilterValue("2026-05-25", "date", "")).toBe("2026-05-25");
    expect(parseFilterValue("25/05/2026", "date", "")).toBe("");
    expect(parseFilterValue("not-a-date", "date", "2020-01-01")).toBe("2020-01-01");
  });

  it("parses list type from comma-separated string", () => {
    expect(parseFilterValue("a,b,c", "list", [])).toEqual(["a", "b", "c"]);
    expect(parseFilterValue("a, , b ", "list", [])).toEqual(["a", "b"]);
    expect(parseFilterValue("", "list", [])).toEqual([]);
  });

  it("returns string for unknown types", () => {
    expect(parseFilterValue("abc", "string", "")).toBe("abc");
  });
});

describe("serializeFilterValue", () => {
  it("returns null for empty strings", () => {
    expect(serializeFilterValue("", "string", "")).toBeNull();
    expect(serializeFilterValue("   ", "string", "")).toBeNull();
  });

  it("returns null when value matches the default (avoids URL noise)", () => {
    expect(serializeFilterValue("activo", "string", "activo")).toBeNull();
    expect(serializeFilterValue(false, "boolean", false)).toBeNull();
  });

  it("serializes true booleans only", () => {
    expect(serializeFilterValue(true, "boolean", false)).toBe("true");
    expect(serializeFilterValue(false, "boolean", true)).toBeNull();
  });

  it("serializes lists with comma join, null when empty", () => {
    expect(serializeFilterValue(["a", "b"], "list", [])).toBe("a,b");
    expect(serializeFilterValue([], "list", [])).toBeNull();
    expect(serializeFilterValue(undefined, "list", [])).toBeNull();
  });

  it("serializes numbers and dates as plain strings", () => {
    expect(serializeFilterValue(42, "number", 0)).toBe("42");
    expect(serializeFilterValue("2026-05-25", "date", "")).toBe("2026-05-25");
  });
});

describe("useFilterParams (smoke)", () => {
  it("exports a function", () => {
    expect(typeof useFilterParams).toBe("function");
  });
});
