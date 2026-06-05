import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  welcomeStorageKey,
  hasSeenWelcome,
  markWelcomeSeen,
  resetWelcome,
} from "./welcomeStorage";

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

describe("welcomeStorage", () => {
  beforeEach(() => {
    globalThis.window = { localStorage: createMockStorage() };
  });
  afterEach(() => {
    delete globalThis.window;
  });

  it("builds a stable key from userId", () => {
    expect(welcomeStorageKey("user-123")).toBe("fichaeleam_welcome_v1_user-123");
  });

  it("returns null key when userId missing", () => {
    expect(welcomeStorageKey(null)).toBeNull();
    expect(welcomeStorageKey(undefined)).toBeNull();
  });

  it("reports unseen by default", () => {
    expect(hasSeenWelcome("user-1")).toBe(false);
  });

  it("marks and reads welcome as seen", () => {
    markWelcomeSeen("user-1");
    expect(hasSeenWelcome("user-1")).toBe(true);
  });

  it("resets welcome for a user without touching others", () => {
    markWelcomeSeen("user-1");
    markWelcomeSeen("user-2");
    resetWelcome("user-1");
    expect(hasSeenWelcome("user-1")).toBe(false);
    expect(hasSeenWelcome("user-2")).toBe(true);
  });

  it("is safe with undefined userId on read", () => {
    expect(hasSeenWelcome(undefined)).toBe(false);
  });
});
