export const DEMO_INACTIVITY_DAYS = 10;
export const DEMO_REACTIVATION_DAYS = 14;
export const RECOVERY_EMAIL_COOLDOWN_HOURS = 24;

export function daysSince(value: string | null | undefined, now = Date.now()): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((now - timestamp) / 86400000));
}

export function canSendDemoRecovery(lastSignInAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastSignInAt) return true;
  return now - new Date(lastSignInAt).getTime() > DEMO_INACTIVITY_DAYS * 86400000;
}

export function isDemoAccessActive(
  eleam: { pago_activo?: boolean | null; subscription_status?: string | null; fecha_vencimiento_suscripcion?: string | null },
  now = Date.now(),
): boolean {
  const expiresAt = eleam.fecha_vencimiento_suscripcion
    ? new Date(eleam.fecha_vencimiento_suscripcion).getTime()
    : Number.NaN;
  return eleam.pago_activo === true
    && eleam.subscription_status === "activo"
    && Number.isFinite(expiresAt)
    && expiresAt > now;
}

export function recoveryEmailIsCoolingDown(lastSentAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastSentAt) return false;
  const timestamp = new Date(lastSentAt).getTime();
  return Number.isFinite(timestamp)
    && now - timestamp < RECOVERY_EMAIL_COOLDOWN_HOURS * 3600000;
}
