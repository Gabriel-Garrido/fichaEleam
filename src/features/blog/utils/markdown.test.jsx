import { describe, expect, it } from "vitest";
import { normalizeMarkdownUrl } from "./markdown";

describe("markdown url sanitizer", () => {
  it("allows http, https, anchors and internal absolute paths", () => {
    expect(normalizeMarkdownUrl("https://fichaeleam.cl/blog")).toBe("https://fichaeleam.cl/blog");
    expect(normalizeMarkdownUrl("http://example.com/a")).toBe("http://example.com/a");
    expect(normalizeMarkdownUrl("/blog/post")).toBe("/blog/post");
    expect(normalizeMarkdownUrl("#seccion")).toBe("#seccion");
  });

  it("blocks script, data and protocol-relative urls", () => {
    expect(normalizeMarkdownUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeMarkdownUrl("data:text/html,hi")).toBeNull();
    expect(normalizeMarkdownUrl("//evil.example/script.js")).toBeNull();
    expect(normalizeMarkdownUrl("mailto:test@example.com")).toBeNull();
  });
});
