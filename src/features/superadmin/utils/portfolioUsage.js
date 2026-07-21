export function usageDaysSince(value, now = Date.now()) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((now - timestamp) / 86400000));
}

export function portfolioUsageState(row, now = Date.now()) {
  if (!row || row.usuariosTotales === 0) {
    return { key: "not_enabled", label: "Sin usuarios", tone: "slate" };
  }
  const days = usageDaysSince(row.ultimaActividad, now);
  if (days != null && days <= 7) return { key: "active", label: "Activo", tone: "emerald" };
  if (days != null && days <= 30) return { key: "low", label: "Uso bajo", tone: "amber" };
  if (days == null) return { key: "never", label: "Sin uso", tone: "rose" };
  return { key: "inactive", label: `Inactivo ${days}d`, tone: "rose" };
}

export function summarizePortfolioUsage(rows = []) {
  const enabled = rows.filter((row) => row.usuariosTotales > 0);
  const active = enabled.filter((row) => row.registros > 0);
  const activeLast7d = enabled.filter((row) => {
    const days = usageDaysSince(row.ultimaActividad);
    return days != null && days <= 7;
  });

  return {
    clientesHabilitados: enabled.length,
    clientesConUso: active.length,
    clientesActivos7d: activeLast7d.length,
    clientesSinUso: enabled.length - active.length,
    usuariosTotales: enabled.reduce((sum, row) => sum + row.usuariosTotales, 0),
    usuariosActivos: enabled.reduce((sum, row) => sum + row.usuariosActivos, 0),
    usuariosSinPrimerIngreso: enabled.reduce((sum, row) => sum + row.usuariosSinPrimerIngreso, 0),
    registros: enabled.reduce((sum, row) => sum + row.registros, 0),
    adopcionPct: enabled.length ? Math.round((active.length / enabled.length) * 100) : 0,
  };
}

export function indexPortfolioUsage(rows = []) {
  return Object.fromEntries(rows.map((row) => [row.eleamId, row]));
}

export function canResendDemoAccess(eleam, usage) {
  return eleam?.plan === "demo"
    && usage?.adminDemoSinPrimerIngreso === true;
}
