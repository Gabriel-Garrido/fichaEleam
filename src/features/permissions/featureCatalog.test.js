import { describe, expect, it } from "vitest";
import { featureDefaultMap, featuresForRole } from "./featureCatalog";

describe("featureCatalog", () => {
  it("returns only features available for the requested role", () => {
    expect(featuresForRole("funcionario").map((feature) => feature.id)).toEqual([
      "dashboard",
      "establishment",
      "residents",
      "personnel",
      "compliance",
    ]);
  });

  it("keeps features enabled by default and honors explicit false values", () => {
    expect(featureDefaultMap("funcionario", { personnel: false })).toEqual({
      dashboard: true,
      establishment: true,
      residents: true,
      personnel: false,
      compliance: true,
    });
  });
});
