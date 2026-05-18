export function hasPendingDemoAccess(eleam, now = new Date()) {
  if (!eleam || eleam.plan !== "demo" || eleam.subscription_status !== "pendiente") return false;
  if (!eleam.fecha_vencimiento_suscripcion) return false;
  const expiresAt = new Date(eleam.fecha_vencimiento_suscripcion);
  return !Number.isNaN(expiresAt.valueOf()) && expiresAt > now;
}

export function canStartSubscription(eleam) {
  if (!eleam) return true;
  if (eleam.subscription_status === "pendiente" && eleam.mp_preapproval_id) return false;
  if (eleam.plan === "demo") return true;
  return !["activo", "en_gracia"].includes(eleam.subscription_status);
}

export function subscriptionButtonLabel({ isDemo, isPendingPlan, user, isAdminEleam }) {
  if (isPendingPlan) return "Pago en curso";
  if (user && !isAdminEleam) return "Solo admin ELEAM";
  if (isDemo) return "Activar plan";
  if (user) return "Suscribirme";
  return "Solicitar demo";
}
