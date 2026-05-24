import { describe, expect, it } from "vitest";
import { EXCEL_IMPORT_LIMITS, validateExcelFile } from "./excelWorkbook";

describe("validateExcelFile", () => {
  it("exige archivo .xlsx", () => {
    expect(() => validateExcelFile({ name: "residentes.csv", size: 10 })).toThrow(/\.xlsx/);
  });

  it("rechaza planillas demasiado pesadas", () => {
    expect(() =>
      validateExcelFile({
        name: "residentes.xlsx",
        size: EXCEL_IMPORT_LIMITS.maxFileSizeBytes + 1,
      }),
    ).toThrow(/máximo 2\.0 MB/);
  });

  it("acepta planilla xlsx dentro del límite", () => {
    expect(() =>
      validateExcelFile({
        name: "residentes.xlsx",
        size: EXCEL_IMPORT_LIMITS.maxFileSizeBytes,
      }),
    ).not.toThrow();
  });
});
