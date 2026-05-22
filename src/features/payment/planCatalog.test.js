import { describe, expect, it } from "vitest";
import {
  countFuncionarioSlots,
  countPlanResidentSlots,
  getEffectivePlanLimits,
  planFitsUsage,
  PUBLIC_PLAN_CATALOG,
} from "./planCatalog";

describe("planCatalog", () => {
  it("counts active and hospitalized residents against the plan quota", () => {
    expect(countPlanResidentSlots([
      { estado: "activo" },
      { estado: "hospitalizado" },
      { estado: "egresado" },
      { estado: "fallecido" },
    ])).toBe(2);
  });

  it("uses plan limits before eleam overrides", () => {
    expect(getEffectivePlanLimits({
      max_residentes: 99,
      max_funcionarios: 99,
      planes: { max_residentes: 14, max_funcionarios: 10 },
    })).toEqual({ maxResidents: 14, maxStaff: 10 });
  });

  it("falls back to eleam overrides when no plan row is loaded", () => {
    expect(getEffectivePlanLimits({
      max_residentes: 34,
      max_funcionarios: 30,
      planes: null,
    })).toEqual({ maxResidents: 34, maxStaff: 30 });
  });

  it("counts pending funcionario invitations as occupied staff slots", () => {
    expect(countFuncionarioSlots({
      members: [
        { rol: "admin_eleam" },
        { rol: "funcionario" },
        { rol: "familiar" },
      ],
      pendingInvites: [
        { rol: "funcionario" },
        { rol: "familiar" },
        { rol: null },
      ],
    })).toBe(3);
  });

  it("rejects plans that are smaller than current usage", () => {
    const plan14 = PUBLIC_PLAN_CATALOG[0];
    expect(planFitsUsage(plan14, { residents: 14, staff: 10 })).toBe(true);
    expect(planFitsUsage(plan14, { residents: 15, staff: 10 })).toBe(false);
    expect(planFitsUsage(plan14, { residents: 14, staff: 11 })).toBe(false);
  });
});
