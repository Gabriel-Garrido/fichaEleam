import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("../../services/supabaseConfig", () => ({
  supabase: { rpc },
}));

import { requestDemoLead } from "./landingService";

describe("requestDemoLead", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("uses the sanitized request_demo_lead RPC contract", async () => {
    const payload = {
      p_nombre: "Maria Perez",
      p_cargo: "Director/a",
      p_eleam_nombre: "Residencia Norte",
      p_email: "maria@example.cl",
      p_telefono: "+56 9 1234 5678",
    };
    const result = { ok: true, duplicate: false, account_approved: false, estado: "nuevo" };
    rpc.mockResolvedValueOnce({ data: result, error: null });

    await expect(requestDemoLead(payload)).resolves.toBe(result);
    expect(rpc).toHaveBeenCalledWith("request_demo_lead", payload);
  });

  it("propagates backend validation errors", async () => {
    const error = new Error("El email no es valido");
    rpc.mockResolvedValueOnce({ data: null, error });

    await expect(requestDemoLead({ p_email: "bad" })).rejects.toThrow("El email no es valido");
  });
});
