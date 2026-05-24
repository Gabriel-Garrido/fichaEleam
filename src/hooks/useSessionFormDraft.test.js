import { describe, expect, it } from "vitest";
import { stableStringify } from "./useSessionFormDraft";

describe("stableStringify", () => {
  it("keeps object comparison stable regardless of key order", () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
  });

  it("keeps nested arrays and objects deterministic", () => {
    const first = { form: { title: "Plan" }, schedules: [{ turno: "mañana", hora: "09:00" }] };
    const second = { schedules: [{ hora: "09:00", turno: "mañana" }], form: { title: "Plan" } };
    expect(stableStringify(first)).toBe(stableStringify(second));
  });
});
