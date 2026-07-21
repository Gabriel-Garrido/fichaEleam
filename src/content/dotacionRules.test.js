import { describe, expect, it } from "vitest";
import {
  calcularDotacion,
  dotacionEventValue,
  DOTACION_META,
  MIN_CUIDADORES_NOCTURNOS,
} from "./dotacionRules";

describe("DOTACION_META", () => {
  it("declara vigencia y modificaciones normativas consideradas", () => {
    expect(DOTACION_META.vigenciaDesde).toBe("2025-10-01");
    expect(DOTACION_META.modificacionesConsideradas).toEqual([
      "Decreto N°6/2025",
      "Decreto N°9/2025",
    ]);
    expect(DOTACION_META.versionReglas).toBe("2026-06-10");
  });
});

describe("calcularDotacion — residentes con dependencia (Art. 15)", () => {
  it("aplica 1 cuidador diurno hasta 8 residentes", () => {
    expect(calcularDotacion({ conDependencia: 8 }).requerido.desglose.depDiurno).toBe(1);
  });

  it("aplica 2 cuidadores diurnos entre 9 y 16", () => {
    expect(calcularDotacion({ conDependencia: 9 }).requerido.desglose.depDiurno).toBe(2);
    expect(calcularDotacion({ conDependencia: 16 }).requerido.desglose.depDiurno).toBe(2);
  });

  it("aplica 3 cuidadores diurnos entre 17 y 24", () => {
    expect(calcularDotacion({ conDependencia: 17 }).requerido.desglose.depDiurno).toBe(3);
    expect(calcularDotacion({ conDependencia: 24 }).requerido.desglose.depDiurno).toBe(3);
  });

  it("suma +1 cuidador diurno por cada 8 adicionales", () => {
    expect(calcularDotacion({ conDependencia: 25 }).requerido.desglose.depDiurno).toBe(4);
  });

  it("aplica 1 cuidador nocturno hasta 12 residentes", () => {
    expect(calcularDotacion({ conDependencia: 12 }).requerido.desglose.depNocturno).toBe(1);
  });

  it("aplica 2 cuidadores nocturnos entre 13 y 24", () => {
    expect(calcularDotacion({ conDependencia: 13 }).requerido.desglose.depNocturno).toBe(2);
    expect(calcularDotacion({ conDependencia: 24 }).requerido.desglose.depNocturno).toBe(2);
  });

  it("aplica 3 cuidadores nocturnos entre 25 y 36", () => {
    expect(calcularDotacion({ conDependencia: 25 }).requerido.desglose.depNocturno).toBe(3);
    expect(calcularDotacion({ conDependencia: 36 }).requerido.desglose.depNocturno).toBe(3);
  });

  it("define apoyo técnico 12 h diurnas + llamada nocturna", () => {
    const tens = calcularDotacion({ conDependencia: 10 }).requerido.tens;
    expect(tens.diurno).toContain("12 h");
    expect(tens.nocturno).toContain("llamada");
  });
});

describe("calcularDotacion — residentes autovalentes (Art. 16)", () => {
  it("aplica 1 cuidador por cada 20 en cada turno", () => {
    const r20 = calcularDotacion({ autovalentes: 20 }).requerido;
    expect(r20.desglose.autoDiurno).toBe(1);
    expect(r20.desglose.autoNocturno).toBe(1);
  });

  it("suma +1 al pasar de 20", () => {
    expect(calcularDotacion({ autovalentes: 21 }).requerido.desglose.autoDiurno).toBe(2);
  });

  it("define apoyo técnico de llamada 24 horas", () => {
    const tens = calcularDotacion({ autovalentes: 30 }).requerido.tens;
    expect(tens.diurno).toContain("24 h");
  });
});

describe("calcularDotacion — mínimo nocturno (Art. 17)", () => {
  it("fuerza mínimo 2 cuidadores nocturnos con pocos residentes", () => {
    const r = calcularDotacion({ conDependencia: 4 });
    expect(r.requerido.cuidadoresNocturno).toBe(MIN_CUIDADORES_NOCTURNOS);
    expect(r.requerido.minNocturnoAplicado).toBe(true);
  });

  it("no aplica el mínimo cuando la fórmula ya exige 2 o más", () => {
    const r = calcularDotacion({ conDependencia: 13 });
    expect(r.requerido.cuidadoresNocturno).toBe(2);
    expect(r.requerido.minNocturnoAplicado).toBe(false);
  });

  it("no exige cuidadores si no hay residentes", () => {
    const r = calcularDotacion({ conDependencia: 0, autovalentes: 0 });
    expect(r.requerido.cuidadoresDiurno).toBe(0);
    expect(r.requerido.cuidadoresNocturno).toBe(0);
    expect(r.requerido.minNocturnoAplicado).toBe(false);
  });
});

describe("calcularDotacion — poblaciones mixtas y brecha", () => {
  it("suma los bloques de dependientes y autovalentes", () => {
    const r = calcularDotacion({ conDependencia: 16, autovalentes: 20 });
    // diurno: ceil(16/8)=2 + ceil(20/20)=1 = 3 ; nocturno: ceil(16/12)=2 + 1 = 3
    expect(r.requerido.cuidadoresDiurno).toBe(3);
    expect(r.requerido.cuidadoresNocturno).toBe(3);
  });

  it("detecta déficit cuando la dotación actual es insuficiente", () => {
    const r = calcularDotacion({ conDependencia: 24, actual: { cuidadoresDiurno: 2, cuidadoresNocturno: 1 } });
    expect(r.tieneActual).toBe(true);
    expect(r.deficitDiurno).toBe(true); // requiere 3, hay 2
    expect(r.deficitNocturno).toBe(true); // requiere 2, hay 1
    expect(r.brecha.cuidadoresDiurno).toBe(-1);
  });

  it("no marca déficit cuando la dotación cubre o supera lo requerido", () => {
    const r = calcularDotacion({ conDependencia: 8, actual: { cuidadoresDiurno: 1, cuidadoresNocturno: 2 } });
    expect(r.tieneDeficit).toBe(false);
  });

  it("ignora entradas inválidas tratándolas como cero", () => {
    const r = calcularDotacion({ conDependencia: -5, autovalentes: "abc" });
    expect(r.totalResidentes).toBe(0);
  });
});

describe("dotacionEventValue", () => {
  it("genera un resumen compacto bajo 256 caracteres", () => {
    const value = dotacionEventValue(calcularDotacion({ conDependencia: 24, autovalentes: 10 }));
    expect(value).toMatch(/^dep:24\|auto:10\|reqD:\d+\|reqN:\d+\|def:[01]$/);
    expect(value.length).toBeLessThanOrEqual(256);
  });
});
