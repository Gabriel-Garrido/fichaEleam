import { describe, expect, it } from "vitest";
import {
  MAX_CONSENT_DOCUMENT_SIZE_BYTES,
  validateConsentDocument,
} from "./ds20Service";

const document = (overrides = {}) => ({
  name: "consentimiento.pdf",
  size: 1024,
  type: "application/pdf",
  ...overrides,
});

describe("signed consent document validation", () => {
  it("accepts a PDF within the configured limit", () => {
    expect(validateConsentDocument(document())).toBeNull();
  });

  it("rejects oversized and non-PDF documents", () => {
    expect(validateConsentDocument(document({ size: MAX_CONSENT_DOCUMENT_SIZE_BYTES + 1 }))).toContain("10 MB");
    expect(validateConsentDocument(document({ name: "consentimiento.jpg", type: "image/jpeg" }))).toContain("formato PDF");
  });
});
