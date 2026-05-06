// Rangos clínicos de referencia para adultos mayores en ELEAM.
// Devuelve un "status" por parámetro que dirige el color y el icono en la UI.
//
// Niveles:
//   - normal:   dentro del rango habitual
//   - warning:  fuera de rango, requiere atención del personal
//   - critical: requiere intervención inmediata
//   - unknown:  no hay valor

export const STATUS = {
  normal: {
    label: "Normal",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
  warning: {
    label: "Atención",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
    ring: "ring-amber-200",
  },
  critical: {
    label: "Crítico",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    text: "text-rose-700",
    dot: "bg-rose-500",
    ring: "ring-rose-200",
  },
  unknown: {
    label: "Sin dato",
    badge: "bg-gray-50 text-gray-500 border-gray-200",
    text: "text-gray-400",
    dot: "bg-gray-300",
    ring: "ring-gray-200",
  },
};

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

// Presión sistólica (mmHg)
export function systolicStatus(v) {
  const n = num(v);
  if (n == null) return "unknown";
  if (n < 90 || n >= 180) return "critical";
  if (n < 100 || n >= 140) return "warning";
  return "normal";
}

// Presión diastólica (mmHg)
export function diastolicStatus(v) {
  const n = num(v);
  if (n == null) return "unknown";
  if (n < 50 || n >= 110) return "critical";
  if (n < 60 || n >= 90) return "warning";
  return "normal";
}

// Toma de presión completa: combina sistólica + diastólica devolviendo el peor estado
export function bloodPressureStatus(s, d) {
  const ss = systolicStatus(s);
  const ds = diastolicStatus(d);
  const order = ["unknown", "normal", "warning", "critical"];
  return order[Math.max(order.indexOf(ss), order.indexOf(ds))];
}

// Frecuencia cardiaca (lpm)
export function heartRateStatus(v) {
  const n = num(v);
  if (n == null) return "unknown";
  if (n < 50 || n > 120) return "critical";
  if (n < 60 || n > 100) return "warning";
  return "normal";
}

// Frecuencia respiratoria (rpm)
export function respiratoryRateStatus(v) {
  const n = num(v);
  if (n == null) return "unknown";
  if (n < 10 || n > 24) return "critical";
  if (n < 12 || n > 20) return "warning";
  return "normal";
}

// Temperatura (°C)
export function temperatureStatus(v) {
  const n = num(v);
  if (n == null) return "unknown";
  if (n < 35 || n >= 39) return "critical";
  if (n < 36 || n >= 37.8) return "warning";
  return "normal";
}

// Saturación de oxígeno (%)
export function oxygenStatus(v) {
  const n = num(v);
  if (n == null) return "unknown";
  if (n < 90) return "critical";
  if (n < 95) return "warning";
  return "normal";
}

// Glucosa capilar (mg/dL) — referencia general en ayunas/postprandial
export function glucoseStatus(v) {
  const n = num(v);
  if (n == null) return "unknown";
  if (n < 60 || n >= 250) return "critical";
  if (n < 70 || n >= 180) return "warning";
  return "normal";
}

// Escala de dolor 0-10
export function painStatus(v) {
  const n = num(v);
  if (n == null) return "unknown";
  if (n >= 7) return "critical";
  if (n >= 4) return "warning";
  return "normal";
}

// Definición de cada parámetro: rango normal, unidades y formateador.
export const VITAL_DEFS = {
  presion: {
    label: "Presión arterial",
    short: "P/A",
    unit: "mmHg",
    normal: "100–139 / 60–89",
    icon: "🩺",
    format: (s, d) => (s && d ? `${s}/${d}` : s || d || "—"),
    statusFor: (r) => bloodPressureStatus(r.presion_sistolica, r.presion_diastolica),
  },
  fc: {
    label: "Frec. cardiaca",
    short: "FC",
    unit: "lpm",
    normal: "60–100",
    icon: "❤️",
    format: (v) => (v != null ? v : "—"),
    statusFor: (r) => heartRateStatus(r.frecuencia_cardiaca),
  },
  fr: {
    label: "Frec. respiratoria",
    short: "FR",
    unit: "rpm",
    normal: "12–20",
    icon: "🫁",
    format: (v) => (v != null ? v : "—"),
    statusFor: (r) => respiratoryRateStatus(r.frecuencia_respiratoria),
  },
  temp: {
    label: "Temperatura",
    short: "Temp",
    unit: "°C",
    normal: "36.0–37.7",
    icon: "🌡️",
    format: (v) => (v != null ? `${Number(v).toFixed(1)}°` : "—"),
    statusFor: (r) => temperatureStatus(r.temperatura),
  },
  spo2: {
    label: "Saturación O₂",
    short: "SatO₂",
    unit: "%",
    normal: "≥ 95",
    icon: "💨",
    format: (v) => (v != null ? `${v}%` : "—"),
    statusFor: (r) => oxygenStatus(r.saturacion_oxigeno),
  },
  glucosa: {
    label: "Glucosa",
    short: "Glucosa",
    unit: "mg/dL",
    normal: "70–179",
    icon: "🩸",
    format: (v) => (v != null ? v : "—"),
    statusFor: (r) => glucoseStatus(r.glucosa),
  },
  dolor: {
    label: "Dolor",
    short: "Dolor",
    unit: "/10",
    normal: "0–3",
    icon: "🔥",
    format: (v) => (v != null ? `${v}/10` : "—"),
    statusFor: (r) => painStatus(r.dolor_escala),
  },
};

// Resumen general de un registro: peor status entre todos los parámetros.
export function recordOverallStatus(record) {
  const order = ["unknown", "normal", "warning", "critical"];
  let worst = "unknown";
  for (const def of Object.values(VITAL_DEFS)) {
    const s = def.statusFor(record);
    if (order.indexOf(s) > order.indexOf(worst)) worst = s;
  }
  return worst;
}

// Etiqueta corta del peor status para mostrar como pill global del registro
export function recordOverallLabel(record) {
  const s = recordOverallStatus(record);
  if (s === "critical") return { status: s, label: "Requiere atención inmediata" };
  if (s === "warning") return { status: s, label: "Valores fuera de rango" };
  if (s === "normal") return { status: s, label: "Dentro de rango" };
  return { status: s, label: "Sin datos suficientes" };
}
