import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { scheduleDebounce, useDebouncedValue } from "./useDebouncedValue";

describe("scheduleDebounce", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("executes the callback after the given delay", () => {
    const cb = vi.fn();
    scheduleDebounce(cb, 200);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(199);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("cancel() prevents execution if invoked before the delay finishes", () => {
    const cb = vi.fn();
    const cancel = scheduleDebounce(cb, 200);
    vi.advanceTimersByTime(150);
    cancel();
    vi.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
  });

  it("executes immediately when delay <= 0", () => {
    const cb = vi.fn();
    scheduleDebounce(cb, 0);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("throws if callback is not a function", () => {
    expect(() => scheduleDebounce(null, 100)).toThrow(TypeError);
    expect(() => scheduleDebounce(undefined, 100)).toThrow(TypeError);
  });
});

describe("useDebouncedValue (smoke)", () => {
  it("exports a function", () => {
    expect(typeof useDebouncedValue).toBe("function");
  });
});
