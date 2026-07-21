import { describe, expect, it } from "vitest";
import { NAV_ICON_IDS } from "../../components/NavIcon";
import { COACHES, getCoach, hasCoach, listCoachIds } from "./coachCatalog";

// Presupuestos de copy: mantienen las guías breves y escaneables a medida
// que el catálogo crece. Si un texto los excede, acortar el copy (no subir
// el límite) — la guía debe leerse en menos de 30 segundos.
const LIMITS = {
  title: 60,
  description: 140,
  stepTitle: 36,
  stepText: 100,
  benefit: 140,
  minSteps: 2,
  maxSteps: 4,
};

function expectCoachQuality(id, coach, variant = "base") {
  const label = `${id} (${variant})`;
  expect(coach.title, `${label} title`).toBeTruthy();
  expect(coach.title.length, `${label} title ≤ ${LIMITS.title}`).toBeLessThanOrEqual(LIMITS.title);
  expect(coach.description, `${label} description`).toBeTruthy();
  expect(coach.description.length, `${label} description ≤ ${LIMITS.description}`).toBeLessThanOrEqual(LIMITS.description);
  expect(Array.isArray(coach.steps), `${label} steps array`).toBe(true);
  expect(coach.steps.length, `${label} steps ≥ ${LIMITS.minSteps}`).toBeGreaterThanOrEqual(LIMITS.minSteps);
  expect(coach.steps.length, `${label} steps ≤ ${LIMITS.maxSteps}`).toBeLessThanOrEqual(LIMITS.maxSteps);
  coach.steps.forEach((step, idx) => {
    expect(step.title, `${label} step ${idx} title`).toBeTruthy();
    expect(step.title.length, `${label} step ${idx} title ≤ ${LIMITS.stepTitle}`).toBeLessThanOrEqual(LIMITS.stepTitle);
    expect(step.text, `${label} step ${idx} text`).toBeTruthy();
    expect(step.text.length, `${label} step ${idx} text ≤ ${LIMITS.stepText}`).toBeLessThanOrEqual(LIMITS.stepText);
  });
  expect(coach.benefit, `${label} benefit`).toBeTruthy();
  expect(coach.benefit.length, `${label} benefit ≤ ${LIMITS.benefit}`).toBeLessThanOrEqual(LIMITS.benefit);
}

describe("coachCatalog", () => {
  it("exposes every coach with required fields and copy budgets", () => {
    listCoachIds().forEach((id) => {
      const coach = COACHES[id];
      expectCoachQuality(id, coach);
      expect(coach.eyebrow, `${id} eyebrow`).toBeTruthy();
      expect(coach.icon, `${id} icon`).toBeTruthy();
    });
  });

  it("every coach icon exists in NavIcon", () => {
    listCoachIds().forEach((id) => {
      expect(NAV_ICON_IDS, `${id} icon "${COACHES[id].icon}" registrado en NavIcon`).toContain(COACHES[id].icon);
    });
  });

  it("role overrides meet the same quality budgets", () => {
    listCoachIds().forEach((id) => {
      const overrides = COACHES[id].roleOverrides;
      if (!overrides) return;
      Object.keys(overrides).forEach((rol) => {
        const merged = getCoach(id, rol);
        expectCoachQuality(id, merged, rol);
      });
    });
  });

  it("no coach uses emojis (design system: solo Heroicons SVG)", () => {
    const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    const scan = (id, value, path) => {
      expect(emojiPattern.test(value), `${id} ${path} sin emojis`).toBe(false);
    };
    listCoachIds().forEach((id) => {
      const coach = COACHES[id];
      scan(id, coach.title, "title");
      scan(id, coach.description, "description");
      scan(id, coach.benefit, "benefit");
      coach.steps.forEach((step, idx) => {
        scan(id, step.title, `step ${idx} title`);
        scan(id, step.text, `step ${idx} text`);
      });
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
    expect(adminCoach.title).toBe("El pulso de tu ELEAM");
    expect(adminCoach).not.toHaveProperty("roleOverrides");
  });

  it("getCoach returns null for missing featureId", () => {
    expect(getCoach("missing")).toBeNull();
  });
});
