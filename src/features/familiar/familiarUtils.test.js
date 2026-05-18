import { describe, expect, it, vi } from "vitest";
import { applyOwnVisitFilter, summarizeFamilySnapshot } from "./familiarUtils";

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

describe("applyOwnVisitFilter", () => {
  it("filters family visit queries by authenticated profile", () => {
    const query = { eq: vi.fn().mockReturnThis() };

    expect(applyOwnVisitFilter(query, "profile-123")).toBe(query);
    expect(query.eq).toHaveBeenCalledWith("profile_id", "profile-123");
  });
});
