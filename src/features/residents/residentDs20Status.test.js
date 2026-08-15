import { describe, expect, it } from "vitest";
import {
  DS20_CORE_ASSESSMENTS,
  isDs20CoreAssessment,
  residentPersonalDs20Pending,
} from "./residentDs20Status";

describe("resident DS20 pending status", () => {
  it("identifies only missing health-folder fields", () => {
    expect(residentPersonalDs20Pending({
      prevision: "",
      indice_barthel: 0,
      nivel_dependencia: "",
      diagnostico_principal: "Parkinson",
      alergias: [],
    })).toEqual(["prevision", "alergias"]);
  });

  it("accepts an explicit no-allergy statement and a classified dependency", () => {
    expect(residentPersonalDs20Pending({
      prevision: "FONASA",
      nivel_dependencia: "moderado",
      diagnostico_principal: "Sin diagnóstico vigente",
      alergias: ["Sin alergias conocidas"],
    })).toEqual([]);
  });

  it("limits DS20 urgency to the core functional, nutritional and cognitive assessments", () => {
    expect(DS20_CORE_ASSESSMENTS).toEqual(["barthel", "mna", "mmse"]);
    expect(isDs20CoreAssessment("barthel")).toBe(true);
    expect(isDs20CoreAssessment("katz")).toBe(false);
    expect(isDs20CoreAssessment("tinetti")).toBe(false);
  });
});
