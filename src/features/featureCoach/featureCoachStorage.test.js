import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  coachStorageKey,
  hasSeenCoach,
  markCoachSeen,
  resetAllCoaches,
  resetCoachSeen,
} from "./featureCoachStorage";

function createMockStorage() {
  const store = new Map();
  return {
    get length() { return store.size; },
    key(i) { return Array.from(store.keys())[i] ?? null; },
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); },
  };
}

describe("featureCoachStorage", () => {
  beforeEach(() => {
    globalThis.window = { localStorage: createMockStorage() };
  });
  afterEach(() => {
    delete globalThis.window;
  });

  it("builds a stable key from featureId and userId", () => {
    expect(coachStorageKey("emar", "user-123")).toBe("fichaeleam_coach_v1_emar_user-123");
  });

  it("returns null key when missing args", () => {
    expect(coachStorageKey(null, "user-1")).toBeNull();
    expect(coachStorageKey("emar", null)).toBeNull();
  });

  it("reports unseen by default", () => {
    expect(hasSeenCoach("emar", "user-1")).toBe(false);
  });

  it("marks and reads coach as seen", () => {
    markCoachSeen("emar", "user-1");
    expect(hasSeenCoach("emar", "user-1")).toBe(true);
  });

  it("resets a single coach", () => {
    markCoachSeen("emar", "user-1");
    markCoachSeen("beds", "user-1");
    resetCoachSeen("emar", "user-1");
    expect(hasSeenCoach("emar", "user-1")).toBe(false);
    expect(hasSeenCoach("beds", "user-1")).toBe(true);
  });

  it("resets all coaches of a user without touching others", () => {
    markCoachSeen("emar", "user-1");
    markCoachSeen("beds", "user-1");
    markCoachSeen("emar", "user-2");
    const removed = resetAllCoaches("user-1");
    expect(removed).toBe(2);
    expect(hasSeenCoach("emar", "user-1")).toBe(false);
    expect(hasSeenCoach("beds", "user-1")).toBe(false);
    expect(hasSeenCoach("emar", "user-2")).toBe(true);
  });

  it("is safe with undefined userId on read", () => {
    expect(hasSeenCoach("emar", undefined)).toBe(false);
  });
});
