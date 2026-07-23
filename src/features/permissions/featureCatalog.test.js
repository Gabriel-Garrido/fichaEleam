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
      "resident_payments",
    ]);
  });

  it("requires explicit area access for employees", () => {
    expect(featureDefaultMap("funcionario", { residents: true, personnel: false })).toEqual({
      dashboard: false,
      establishment: false,
      residents: true,
      personnel: false,
      compliance: false,
      resident_payments: false,
    });
  });

  it("keeps administrator areas enabled unless the organization disables one", () => {
    expect(featureDefaultMap("admin_eleam", { compliance: false })).toEqual({
      dashboard: true,
      establishment: true,
      residents: true,
      personnel: true,
      compliance: false,
      resident_payments: true,
    });
  });
});
