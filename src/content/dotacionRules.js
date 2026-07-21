// Cálculo referencial de dotación mínima de personal para ELEAM según el Decreto
// Supremo N°20 del MINSAL, considerando modificaciones publicadas hasta el
// Decreto N°6/2025 y la vigencia ajustada por el Decreto N°9/2025. Módulo puro
// y sin dependencias, importable por la página pública y por el generador SEO.
// La validación final de cumplimiento depende de la autoridad sanitaria (SEREMI).

export const DOTACION_META = {
  norma: "Decreto N°20 MINSAL",
  articulos: "Arts. 15, 16 y 17",
  fuenteUrl: "https://www.bcn.cl/leychile/navegar?idNorma=1182129",
  modificacionesConsideradas: ["Decreto N°6/2025", "Decreto N°9/2025"],
  vigenciaDesde: "2025-10-01",
  versionReglas: "2026-06-10",
};

// Mínimo absoluto de cuidadores en turno nocturno (Art. 17), cualquiera sea el
// número de residentes o su nivel de dependencia.
export const MIN_CUIDADORES_NOCTURNOS = 2;

// Reglas como datos: alimentan la tabla educativa del front y del prerender SEO.
export const DOTACION_REGLAS = [
  {
    articulo: "Art. 15",
    grupo: "Residentes con dependencia",
    turno: "Cuidador diurno (12 h)",
    regla: "1 cuidador hasta 8 residentes; 2 entre 9 y 16; 3 entre 17 y 24; +1 por cada 8 adicionales.",
  },
  {
    articulo: "Art. 15",
    grupo: "Residentes con dependencia",
    turno: "Cuidador nocturno",
    regla: "1 cuidador hasta 12 residentes; 2 entre 13 y 24; 3 entre 25 y 36; +1 por cada 12 adicionales.",
  },
  {
    articulo: "Art. 15",
    grupo: "Residentes con dependencia",
    turno: "Apoyo técnico (TENS/auxiliar)",
    regla: "Auxiliar o técnico de enfermería 12 horas diurnas y uno de llamada nocturna.",
  },
  {
    articulo: "Art. 16",
    grupo: "Residentes autovalentes",
    turno: "Cuidador diurno (12 h)",
    regla: "1 cuidador por cada 20 residentes.",
  },
  {
    articulo: "Art. 16",
    grupo: "Residentes autovalentes",
    turno: "Cuidador nocturno",
    regla: "1 cuidador por cada 20 residentes.",
  },
  {
    articulo: "Art. 16",
    grupo: "Residentes autovalentes",
    turno: "Apoyo técnico (TENS/auxiliar)",
    regla: "Auxiliar o técnico de enfermería de llamada las 24 horas.",
  },
  {
    articulo: "Art. 17",
    grupo: "Todos los residentes",
    turno: "Cuidador nocturno",
    regla: "Mínimo 2 cuidadores en horario nocturno, siempre.",
  },
];

function ceilDiv(n, divisor) {
  return n > 0 ? Math.ceil(n / divisor) : 0;
}

function toCount(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Calcula la dotación mínima requerida y, si se entrega `actual`, la brecha.
//   conDependencia, autovalentes: número de residentes en cada grupo.
//   actual: { cuidadoresDiurno, cuidadoresNocturno } dotación real (opcional).
export function calcularDotacion({ conDependencia = 0, autovalentes = 0, actual = {} } = {}) {
  const dep = toCount(conDependencia);
  const auto = toCount(autovalentes);
  const totalResidentes = dep + auto;

  // Cuidadores requeridos por grupo y turno (Arts. 15-16). Se suma el bloque de
  // residentes con dependencia y el de autovalentes (lectura conservadora).
  const depDiurno = ceilDiv(dep, 8);
  const depNocturno = ceilDiv(dep, 12);
  const autoDiurno = ceilDiv(auto, 20);
  const autoNocturno = ceilDiv(auto, 20);

  const cuidadoresDiurno = depDiurno + autoDiurno;
  const cuidadoresNocturnoBase = depNocturno + autoNocturno;
  // Art. 17: mínimo 2 cuidadores nocturnos siempre que haya residentes.
  const cuidadoresNocturno = totalResidentes > 0
    ? Math.max(cuidadoresNocturnoBase, MIN_CUIDADORES_NOCTURNOS)
    : 0;
  const minNocturnoAplicado = totalResidentes > 0 && cuidadoresNocturnoBase < MIN_CUIDADORES_NOCTURNOS;

  // Apoyo técnico de enfermería (Arts. 15, 16 y 18).
  let tens;
  if (dep > 0) {
    tens = {
      diurno: "12 h diurnas",
      nocturno: "De llamada",
      detalle: "Auxiliar o técnico de enfermería 12 horas diurnas y uno de llamada en la noche.",
    };
  } else if (auto > 0) {
    tens = {
      diurno: "De llamada 24 h",
      nocturno: "De llamada 24 h",
      detalle: "Auxiliar o técnico de enfermería de llamada las 24 horas.",
    };
  } else {
    tens = {
      diurno: "—",
      nocturno: "—",
      detalle: "Ingresa el número de residentes para calcular el apoyo técnico.",
    };
  }

  const requerido = {
    cuidadoresDiurno,
    cuidadoresNocturno,
    desglose: { depDiurno, depNocturno, autoDiurno, autoNocturno },
    minNocturnoAplicado,
    tens,
  };

  const tieneActual =
    actual.cuidadoresDiurno != null || actual.cuidadoresNocturno != null;
  const actualDiurno = toCount(actual.cuidadoresDiurno);
  const actualNocturno = toCount(actual.cuidadoresNocturno);

  const brecha = {
    cuidadoresDiurno: actualDiurno - cuidadoresDiurno,
    cuidadoresNocturno: actualNocturno - cuidadoresNocturno,
  };
  const deficitDiurno = tieneActual && brecha.cuidadoresDiurno < 0;
  const deficitNocturno = tieneActual && brecha.cuidadoresNocturno < 0;

  return {
    totalResidentes,
    conDependencia: dep,
    autovalentes: auto,
    requerido,
    actual: { cuidadoresDiurno: actualDiurno, cuidadoresNocturno: actualNocturno },
    brecha,
    deficitDiurno,
    deficitNocturno,
    tieneActual,
    tieneDeficit: deficitDiurno || deficitNocturno,
  };
}

// Resumen compacto para el evento de analítica `tool_use` (≤256 chars).
export function dotacionEventValue(resultado) {
  if (!resultado) return null;
  const def = resultado.tieneDeficit ? 1 : 0;
  return `dep:${resultado.conDependencia}|auto:${resultado.autovalentes}|reqD:${resultado.requerido.cuidadoresDiurno}|reqN:${resultado.requerido.cuidadoresNocturno}|def:${def}`;
}
