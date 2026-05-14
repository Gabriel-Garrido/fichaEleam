import { describe, expect, it } from "vitest";
import { featureDefaultMap, featuresForRole } from "./featureCatalog";

describe("featureCatalog", () => {
  it("returns only features available for the requested role", () => {
    expect(featuresForRole("familiar").map((feature) => feature.id)).toEqual([
      "familiar",
      "familiar-visitas",
    ]);
  });

  it("keeps features enabled by default and honors explicit false values", () => {
    expect(featureDefaultMap("familiar", { "familiar-visitas": false })).toEqual({
      familiar: true,
      "familiar-visitas": false,
    });
  });
});
