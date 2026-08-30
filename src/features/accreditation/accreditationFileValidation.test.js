import { describe, expect, it } from "vitest";
import {
  MAX_EVIDENCE_FILE_SIZE_BYTES,
  getDocumentValidity,
  validateFile,
} from "./accreditationService";

const pdf = (size) => ({
  name: "respaldo.pdf",
  size,
  type: "application/pdf",
});

describe("accreditation evidence file validation", () => {
  it("accepts a document at the 10 MB limit", () => {
    expect(validateFile(pdf(MAX_EVIDENCE_FILE_SIZE_BYTES))).toBeNull();
  });

  it("rejects a document larger than 10 MB with a useful message", () => {
    expect(validateFile(pdf(MAX_EVIDENCE_FILE_SIZE_BYTES + 1))).toBe(
      "El archivo excede el máximo de tamaño permitido de 10 MB. Reduce su peso e intenta nuevamente.",
    );
  });

  it("calculates document validity with date-only Chile-safe comparisons", () => {
    expect(getDocumentValidity({ vigente: true, fecha_vencimiento: "2026-08-30" }, "2026-08-30")).toMatchObject({ status: "vencido", days: 0 });
    expect(getDocumentValidity({ vigente: true, fecha_vencimiento: "2026-09-05" }, "2026-08-30")).toMatchObject({ status: "por_vencer", days: 6 });
    expect(getDocumentValidity({ vigente: true, fecha_vencimiento: null }, "2026-08-30")).toMatchObject({ status: "vigente", days: null });
    expect(getDocumentValidity({ vigente: false, fecha_vencimiento: "2027-01-01" }, "2026-08-30")).toMatchObject({ status: "historico" });
  });
});
