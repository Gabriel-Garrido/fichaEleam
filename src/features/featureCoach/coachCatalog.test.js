import { describe, expect, it } from "vitest";
import { COACHES, getCoach, hasCoach, listCoachIds } from "./coachCatalog";

describe("coachCatalog", () => {
  it("exposes every coach with required fields", () => {
    listCoachIds().forEach((id) => {
      const coach = COACHES[id];
      expect(coach.title, `${id} title`).toBeTruthy();
      expect(coach.description, `${id} description`).toBeTruthy();
      expect(Array.isArray(coach.steps), `${id} steps array`).toBe(true);
      expect(coach.steps.length, `${id} has at least 1 step`).toBeGreaterThan(0);
      coach.steps.forEach((step, idx) => {
        expect(step.title, `${id} step ${idx} title`).toBeTruthy();
        expect(step.text, `${id} step ${idx} text`).toBeTruthy();
      });
      expect(coach.benefit, `${id} benefit`).toBeTruthy();
    });
  });

  it("hasCoach detects existing and missing ids", () => {
    expect(hasCoach("dashboard")).toBe(true);
    expect(hasCoach("does-not-exist")).toBe(false);
    expect(hasCoach(null)).toBe(false);
  });

  it("getCoach strips roleOverrides when no rol provided", () => {
    const coach = getCoach("dashboard");
    expect(coach).not.toHaveProperty("roleOverrides");
    expect(coach.title).toBeTruthy();
  });

  it("getCoach merges roleOverrides when rol matches", () => {
    const adminCoach = getCoach("dashboard", "admin_eleam");
    expect(adminCoach.title).toBe("El estado de tu ELEAM, claro");
    expect(adminCoach).not.toHaveProperty("roleOverrides");
  });

  it("getCoach returns null for missing featureId", () => {
    expect(getCoach("missing")).toBeNull();
  });
});
