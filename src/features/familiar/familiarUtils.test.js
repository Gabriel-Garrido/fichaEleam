import { describe, expect, it } from "vitest";
import { summarizeFamilySnapshot } from "./familiarUtils";

describe("summarizeFamilySnapshot", () => {
  it("counts visible care and medication states for family cards", () => {
    expect(summarizeFamilySnapshot({
      care: [
        { estado: "cumplida" },
        { estado: "pendiente" },
        { estado: "omitida" },
      ],
      medications: [
        { estado: "administrado" },
        { estado: "validado" },
        { estado: "pendiente" },
      ],
    })).toEqual({
      careDone: 1,
      carePending: 1,
      medicationsDone: 2,
      medicationsPending: 1,
    });
  });
});
