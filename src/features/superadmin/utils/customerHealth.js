// Calcula la "salud del cliente" combinando varias señales.
// Se inspira en el patrón de Customer Success Platforms: salud = mix
// de pagos al día, churn risk, fecha de último contacto y vencimiento.

import { daysUntil } from "./superadminFormatters";

const NEVER_CONTACTED_DAYS = 60;   // sin contacto > 60d → señal mala
const SOON_EXPIRES_DAYS    = 14;   // vence en <= 14d → warning

export function customerHealth(eleam, { tasksOverdue = 0 } = {}) {
  if (!eleam) return { state: "unknown", label: "Desconocido", reasons: [] };

  const reasons = [];

  // Pago / suscripción
  const status = eleam.subscription_status ?? "inactivo";
  const inactiveStates = new Set(["inactivo", "cancelado", "vencido", "pausado", "pendiente"]);
  const pagoOk = ["activo", "en_gracia"].includes(status) || eleam.pago_activo === true;

  if (!pagoOk && eleam.crm_estado === "cliente_activo") {
    reasons.push("Marcado como cliente activo pero sin pago vigente");
  }
  if (inactiveStates.has(status) && eleam.crm_estado !== "lead") {
    reasons.push(`Suscripción ${status}`);
  }

  // Vencimiento próximo
  const dVenc = daysUntil(eleam.fecha_vencimiento_suscripcion);
  if (dVenc !== null && dVenc < 0) reasons.push(`Vencido hace ${Math.abs(dVenc)}d`);
  else if (dVenc !== null && dVenc <= SOON_EXPIRES_DAYS && dVenc >= 0)
    reasons.push(`Vence en ${dVenc}d`);

  // Riesgo declarado
  if (eleam.riesgo_churn === "alto")  reasons.push("Riesgo churn alto");
  if (eleam.riesgo_churn === "medio") reasons.push("Riesgo churn medio");

  // Último contacto
  const dContact = eleam.ultimo_contacto ? daysUntil(eleam.ultimo_contacto) : null;
  if (dContact === null) reasons.push("Sin contacto registrado");
  else if (dContact !== null) {
    const ago = -dContact; // dContact es negativo si pasó
    if (ago > NEVER_CONTACTED_DAYS)
      reasons.push(`Sin contacto hace ${ago}d`);
  }

  // Tareas vencidas
  if (tasksOverdue > 0) reasons.push(`${tasksOverdue} tarea(s) vencida(s)`);

  // Estado CRM negativo
  if (eleam.crm_estado === "cliente_riesgo") reasons.push("CRM: cliente en riesgo");
  if (eleam.crm_estado === "perdido")        reasons.push("CRM: cliente perdido");

  // Lógica de scoring
  if (eleam.crm_estado === "perdido") {
    return { state: "risk", label: "Perdido", reasons };
  }

  const isRisk =
    eleam.riesgo_churn === "alto" ||
    eleam.crm_estado === "cliente_riesgo" ||
    (status === "vencido") ||
    (dVenc !== null && dVenc < 0) ||
    tasksOverdue >= 2;

  if (isRisk) return { state: "risk", label: "En riesgo", reasons };

  const isWarning =
    eleam.riesgo_churn === "medio" ||
    (dVenc !== null && dVenc <= SOON_EXPIRES_DAYS) ||
    (dContact !== null && -dContact > NEVER_CONTACTED_DAYS) ||
    tasksOverdue === 1 ||
    !pagoOk;

  if (isWarning) return { state: "warning", label: "Atención", reasons };

  if (pagoOk && eleam.riesgo_churn !== "alto") {
    return { state: "healthy", label: "Saludable", reasons: reasons.length ? reasons : ["Todo en orden"] };
  }

  return { state: "unknown", label: "Desconocido", reasons };
}

export const HEALTH_STYLES = {
  healthy: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: "✓" },
  warning: { cls: "bg-amber-100 text-amber-800 border-amber-200",       dot: "bg-amber-500",   icon: "!" },
  risk:    { cls: "bg-rose-100 text-rose-700 border-rose-200",          dot: "bg-rose-500",    icon: "⚠" },
  unknown: { cls: "bg-slate-100 text-slate-600 border-slate-200",       dot: "bg-slate-400",   icon: "?" },
};
