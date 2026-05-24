import { describe, expect, it } from "vitest";
import {
  getLandingContext,
  getLandingSessionId,
  getLandingUtms,
  LANDING_CONTEXT_LIMITS,
} from "./landingContext";

describe("getLandingUtms", () => {
  it("extrae y sanea UTM desde querystring", () => {
    expect(getLandingUtms("?utm_source= Google &utm_medium=cpc&utm_campaign=demo%20eleam")).toEqual({
      utm_source: "Google",
      utm_medium: "cpc",
      utm_campaign: "demo eleam",
    });
  });

  it("trunca valores UTM externos", () => {
    const utms = getLandingUtms(`?utm_source=${"x".repeat(200)}`);
    expect(utms.utm_source).toHaveLength(LANDING_CONTEXT_LIMITS.utm);
  });
});

describe("getLandingContext", () => {
  it("incluye pagina_origen y referrer con límites seguros", () => {
    const context = getLandingContext({
      search: "?utm_medium=qr",
      pathname: "/".padEnd(400, "p"),
      referrer: "https://example.com/".padEnd(700, "r"),
    });

    expect(context.utm_medium).toBe("qr");
    expect(context.pagina_origen).toHaveLength(LANDING_CONTEXT_LIMITS.page);
    expect(context.referrer).toHaveLength(LANDING_CONTEXT_LIMITS.referrer);
  });
});

describe("getLandingSessionId", () => {
  it("reutiliza session id existente", () => {
    const storage = {
      getItem: () => "existing",
      setItem: () => { throw new Error("no debería escribir"); },
    };

    expect(getLandingSessionId({ storage, idFactory: () => "new" })).toBe("existing");
  });

  it("crea y guarda session id cuando no existe", () => {
    const writes = [];
    const storage = {
      getItem: () => null,
      setItem: (key, value) => writes.push([key, value]),
    };

    expect(getLandingSessionId({ storage, idFactory: () => "generated" })).toBe("generated");
    expect(writes).toEqual([["fe_sid", "generated"]]);
  });

  it("devuelve id aunque storage falle", () => {
    const storage = {
      getItem: () => { throw new Error("blocked"); },
    };

    expect(getLandingSessionId({ storage, idFactory: () => "fallback" })).toBe("fallback");
  });
});
