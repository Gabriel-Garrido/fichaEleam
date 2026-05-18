import { describe, expect, it } from "vitest";
import { FAMILY_VISIBILITY_ERROR, normalizeFamilyVisibility } from "./familyVisibility";

describe("normalizeFamilyVisibility", () => {
  it("defaults to internal content", () => {
    expect(normalizeFamilyVisibility({})).toEqual({
      visible_familiar: false,
      resumen_familiar: null,
    });
  });

  it("clears family summary when content is not published", () => {
    expect(normalizeFamilyVisibility({
      visible_familiar: false,
      resumen_familiar: " Texto previo ",
    })).toEqual({
      visible_familiar: false,
      resumen_familiar: null,
    });
  });

  it("requires a summary when publishing to family portal", () => {
    expect(() => normalizeFamilyVisibility({
      visible_familiar: true,
      resumen_familiar: "   ",
    })).toThrow(FAMILY_VISIBILITY_ERROR);
  });

  it("trims summary when publishing", () => {
    expect(normalizeFamilyVisibility({
      visible_familiar: true,
      resumen_familiar: "  Se realizó actividad sin novedades.  ",
    })).toEqual({
      visible_familiar: true,
      resumen_familiar: "Se realizó actividad sin novedades.",
    });
  });
});
