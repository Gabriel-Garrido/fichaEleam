import { describe, expect, it } from "vitest";
import {
  WELCOME_VALUE,
  WELCOME_PILLARS,
  WELCOME_HIGHLIGHTS,
  WELCOME_START_STEPS,
} from "./welcomeContent";

describe("welcomeContent", () => {
  it("has a concise value proposition", () => {
    expect(WELCOME_VALUE).toBeTruthy();
    expect(WELCOME_VALUE.length).toBeLessThanOrEqual(220);
  });

  it("exposes pillars with icon, title and text", () => {
    expect(WELCOME_PILLARS.length).toBe(3);
    WELCOME_PILLARS.forEach((pillar) => {
      expect(pillar.icon).toBeTruthy();
      expect(pillar.title).toBeTruthy();
      expect(pillar.text).toBeTruthy();
    });
  });

  it("exposes feature highlights with icon, title and value", () => {
    expect(WELCOME_HIGHLIGHTS.length).toBeGreaterThanOrEqual(6);
    WELCOME_HIGHLIGHTS.forEach((item) => {
      expect(item.icon).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.value).toBeTruthy();
    });
  });

  it("exposes getting-started steps", () => {
    expect(WELCOME_START_STEPS.length).toBeGreaterThan(0);
    WELCOME_START_STEPS.forEach((step) => {
      expect(step.title).toBeTruthy();
      expect(step.text).toBeTruthy();
    });
  });
});
