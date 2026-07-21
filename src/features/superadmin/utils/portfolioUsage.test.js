import { describe, expect, it } from "vitest";
import {
  canResendDemoAccess,
  indexPortfolioUsage,
  portfolioUsageState,
  summarizePortfolioUsage,
} from "./portfolioUsage";

describe("portfolio usage", () => {
  const now = new Date("2026-07-20T12:00:00Z").getTime();

  it("resume solo cuentas habilitadas y suma actividad", () => {
    const summary = summarizePortfolioUsage([
      { eleamId: "a", usuariosTotales: 3, usuariosActivos: 2, usuariosSinPrimerIngreso: 1, registros: 20, ultimaActividad: new Date().toISOString() },
      { eleamId: "b", usuariosTotales: 2, usuariosActivos: 0, usuariosSinPrimerIngreso: 0, registros: 0, ultimaActividad: null },
      { eleamId: "lead", usuariosTotales: 0, usuariosActivos: 0, usuariosSinPrimerIngreso: 0, registros: 0, ultimaActividad: null },
    ]);

    expect(summary).toMatchObject({
      clientesHabilitados: 2,
      clientesConUso: 1,
      clientesSinUso: 1,
      usuariosTotales: 5,
      usuariosActivos: 2,
      usuariosSinPrimerIngreso: 1,
      registros: 20,
      adopcionPct: 50,
    });
  });

  it("clasifica actividad reciente, baja, inactiva y cuentas sin usuarios", () => {
    expect(portfolioUsageState({ usuariosTotales: 2, ultimaActividad: "2026-07-19T12:00:00Z" }, now).key).toBe("active");
    expect(portfolioUsageState({ usuariosTotales: 2, ultimaActividad: "2026-07-05T12:00:00Z" }, now).key).toBe("low");
    expect(portfolioUsageState({ usuariosTotales: 2, ultimaActividad: "2026-05-01T12:00:00Z" }, now).key).toBe("inactive");
    expect(portfolioUsageState({ usuariosTotales: 2, ultimaActividad: null }, now).key).toBe("never");
    expect(portfolioUsageState({ usuariosTotales: 0, ultimaActividad: null }, now).key).toBe("not_enabled");
  });

  it("crea un índice por ELEAM", () => {
    expect(indexPortfolioUsage([{ eleamId: "a", registros: 4 }])).toEqual({
      a: { eleamId: "a", registros: 4 },
    });
  });

  it("permite reenviar solo al administrador de un demo sin primer ingreso", () => {
    const pending = { adminDemoSinPrimerIngreso: true, ultimaActividad: null };
    expect(canResendDemoAccess({ plan: "demo" }, pending)).toBe(true);
    expect(canResendDemoAccess({ plan: "mensual" }, pending)).toBe(false);
    expect(canResendDemoAccess({ plan: "demo" }, { ...pending, adminDemoSinPrimerIngreso: false })).toBe(false);
    expect(canResendDemoAccess({ plan: "demo" }, { ...pending, ultimaActividad: "2026-07-20T10:00:00Z" })).toBe(true);
  });
});
