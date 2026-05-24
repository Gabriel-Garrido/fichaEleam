import { describe, expect, it } from "vitest";
import {
  BARTHEL_ITEMS,
  KATZ_ITEMS,
  addDaysIso,
  computeBarthel,
  computeKatz,
  computeNextEvaluation,
  evaluationStatus,
  isAssessmentComplete,
} from "./clinicalAssessmentRules";

function maxBarthel() {
  return BARTHEL_ITEMS.reduce((acc, item) => {
    acc[item.key] = Math.max(...item.options.map((o) => o.value));
    return acc;
  }, {});
}

function minBarthel() {
  return BARTHEL_ITEMS.reduce((acc, item) => {
    acc[item.key] = 0;
    return acc;
  }, {});
}

function katzAll(value) {
  return KATZ_ITEMS.reduce((acc, item) => {
    acc[item.key] = value;
    return acc;
  }, {});
}

describe("clinical assessment rules — Barthel", () => {
  it("returns 100 and 'Independiente' for full independence", () => {
    const { puntaje, resultado } = computeBarthel(maxBarthel());
    expect(puntaje).toBe(100);
    expect(resultado).toBe("Independiente");
  });

  it("returns 0 and 'Dependencia total' when no help is available", () => {
    const { puntaje, resultado } = computeBarthel(minBarthel());
    expect(puntaje).toBe(0);
    expect(resultado).toBe("Dependencia total");
  });

  it("categorizes mid-range scores correctly", () => {
    expect(computeBarthel({ ...minBarthel(), alimentacion: 10, vestido: 10, aseo_personal: 5 }).resultado)
      .toBe("Dependencia severa");
    const moderate = { ...maxBarthel(), traslado: 5, deambulacion: 5 };
    expect(computeBarthel(moderate).resultado).toBe("Dependencia moderada");
  });

  it("isAssessmentComplete is true only when every Barthel item is set", () => {
    const partial = { ...minBarthel() };
    delete partial.orina;
    expect(isAssessmentComplete("barthel", partial)).toBe(false);
    expect(isAssessmentComplete("barthel", minBarthel())).toBe(true);
  });
});

describe("clinical assessment rules — Katz", () => {
  it("returns Katz A when all 6 are independent", () => {
    const { letra, resultado, puntaje } = computeKatz(katzAll("independiente"));
    expect(letra).toBe("A");
    expect(puntaje).toBe(6);
    expect(resultado).toMatch(/Katz A/);
  });

  it("returns Katz G when all 6 are dependent", () => {
    const { letra } = computeKatz(katzAll("dependiente"));
    expect(letra).toBe("G");
  });

  it("returns Katz B when 5 are independent", () => {
    const { letra } = computeKatz({ ...katzAll("independiente"), alimentacion: "dependiente" });
    expect(letra).toBe("B");
  });

  it("isAssessmentComplete is true only when every Katz item is set", () => {
    expect(isAssessmentComplete("katz", { bano: "independiente" })).toBe(false);
    expect(isAssessmentComplete("katz", katzAll("independiente"))).toBe(true);
  });
});

describe("clinical assessment rules — scheduling", () => {
  it("adds days to a date in ISO format", () => {
    expect(addDaysIso("2026-05-23", 180)).toBe("2026-11-19");
    expect(addDaysIso("2026-05-23", 7)).toBe("2026-05-30");
  });

  it("computes next evaluation by motivo", () => {
    expect(computeNextEvaluation("2026-05-23", "rutina")).toBe("2026-11-19");
    expect(computeNextEvaluation("2026-05-23", "post_hospitalizacion")).toBe("2026-05-30");
    expect(computeNextEvaluation("2026-05-23", "caida")).toBe("2026-06-06");
    expect(computeNextEvaluation("2026-05-23", "ingreso")).toBe("2026-06-22");
  });

  it("flags overdue evaluations", () => {
    const today = new Date(2026, 4, 23);
    const status = evaluationStatus("2026-05-13", today);
    expect(status.state).toBe("overdue");
    expect(status.tone).toBe("rose");
    expect(status.label).toMatch(/Vencida hace 10/);
  });

  it("flags due-soon evaluations within 30 days", () => {
    const today = new Date(2026, 4, 23);
    const status = evaluationStatus("2026-06-10", today);
    expect(status.state).toBe("due_soon");
    expect(status.tone).toBe("amber");
  });

  it("flags ok evaluations beyond 30 days", () => {
    const today = new Date(2026, 4, 23);
    const status = evaluationStatus("2026-11-19", today);
    expect(status.state).toBe("ok");
    expect(status.tone).toBe("emerald");
  });

  it("returns missing state when no date", () => {
    expect(evaluationStatus(null).state).toBe("missing");
    expect(evaluationStatus(undefined).tone).toBe("slate");
  });
});
