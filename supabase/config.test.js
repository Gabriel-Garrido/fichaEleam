import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync(new URL("./config.toml", import.meta.url), "utf8");

function verifyJwtFor(functionName) {
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = config.match(new RegExp(`\\[functions\\.${escaped}\\]\\s+verify_jwt\\s*=\\s*(true|false)`, "i"));
  return match?.[1]?.toLowerCase() === "true";
}

describe("Supabase Edge Function authentication contract", () => {
  it.each([
    "create-demo-user",
    "create-staff-user",
    "update-staff-user",
    "delete-staff-user",
    "mp-create-subscription",
    "mp-cancel-subscription",
    "send-crm-email-campaign",
    "send-resident-payment-receipt",
  ])("requires JWT for %s", (functionName) => {
    expect(verifyJwtFor(functionName)).toBe(true);
  });

  it.each([
    "mp-webhook",
    "track-landing-event",
    "crm-unsubscribe",
  ])("declares %s public because it performs its own validation", (functionName) => {
    expect(verifyJwtFor(functionName)).toBe(false);
  });
});
