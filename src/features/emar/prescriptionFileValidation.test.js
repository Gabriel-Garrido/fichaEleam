import { describe, expect, it } from "vitest";
import { MAX_PRESCRIPTION_FILE_SIZE_BYTES, validatePrescriptionFile } from "./emarService";

const pdf = (overrides = {}) => ({ name: "receta.pdf", type: "application/pdf", size: 1024, ...overrides });

describe("prescription file validation", () => {
  it("accepts PDF and supported images up to the 3 MB limit", () => {
    expect(validatePrescriptionFile(pdf({ size: MAX_PRESCRIPTION_FILE_SIZE_BYTES }))).toBeNull();
    expect(validatePrescriptionFile({ name: "receta.jpg", type: "image/jpeg", size: 1024 })).toBeNull();
    expect(validatePrescriptionFile({ name: "receta.jpeg", type: "image/jpg", size: 1024 })).toBeNull();
    expect(validatePrescriptionFile({ name: "receta.png", type: "image/png", size: 1024 })).toBeNull();
    expect(validatePrescriptionFile({ name: "receta.webp", type: "image/webp", size: 1024 })).toBeNull();
  });

  it("rejects oversized, empty, unsupported and mismatched files with clear messages", () => {
    expect(validatePrescriptionFile(pdf({ size: MAX_PRESCRIPTION_FILE_SIZE_BYTES + 1 }))).toContain("3 MB");
    expect(validatePrescriptionFile(pdf({ size: 0 }))).toContain("vacío");
    expect(validatePrescriptionFile(pdf({ name: "receta.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }))).toContain("PDF");
    expect(validatePrescriptionFile(pdf({ name: "receta.pdf", type: "image/jpeg" }))).toContain("PDF");
  });
});
