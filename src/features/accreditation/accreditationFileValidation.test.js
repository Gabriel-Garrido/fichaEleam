import { describe, expect, it } from "vitest";
import {
  MAX_EVIDENCE_FILE_SIZE_BYTES,
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
});
