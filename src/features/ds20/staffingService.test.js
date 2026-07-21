import { describe, expect, it } from "vitest";
import { addDaysIso, mondayOfWeek, shiftRoleForStaff } from "./staffingService";

describe("staffingService helpers", () => {
  it("calcula la semana usando fechas locales sin desplazarlas", () => {
    expect(mondayOfWeek("2026-07-21")).toBe("2026-07-20");
    expect(addDaysIso("2026-07-20", 6)).toBe("2026-07-26");
  });

  it("infiere un rol de turno simple desde el tipo de dotación", () => {
    expect(shiftRoleForStaff("cuidador")).toBe("cuidador");
    expect(shiftRoleForStaff("tens")).toBe("tens");
    expect(shiftRoleForStaff("profesional")).toBe("responsable");
    expect(shiftRoleForStaff("aseo")).toBe("apoyo");
  });
});
