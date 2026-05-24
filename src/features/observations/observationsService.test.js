import { describe, expect, it } from "vitest";
import { continuarSeguimiento, resolverSeguimiento } from "./observationsService";

describe("observations follow-up service guards", () => {
  it("requires notes before resolving a follow-up", async () => {
    await expect(resolverSeguimiento("obs-1", { notas: "   " })).rejects.toThrow(/evolución/i);
  });

  it("requires notes and next slot before continuing a follow-up", async () => {
    await expect(continuarSeguimiento("obs-1", { notas: "" })).rejects.toThrow(/evolución/i);
    await expect(continuarSeguimiento("obs-1", { notas: "Evoluciona estable" })).rejects.toThrow(/fecha y turno/i);
  });
});
