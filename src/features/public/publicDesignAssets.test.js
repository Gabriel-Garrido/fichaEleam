import { describe, expect, it } from "vitest";
import { PUBLIC_ASSETS } from "./publicDesignAssets";

describe("publicDesignAssets", () => {
  it("exposes the SEREMI asset used by public DS20 pages", () => {
    expect(PUBLIC_ASSETS.seremi).toMatchObject({
      publicSrc: "/marketing/excel-papel-vs-fichaeleam-dashboard.png",
      width: 1600,
      height: 900,
    });
  });
});
