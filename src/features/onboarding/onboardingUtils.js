import {
  ACTIVATION_PLAYBOOKS,
  ADMIN_FALLBACK_PLAYBOOK,
} from "./onboardingConfig";

export function getDevice() {
  return typeof window !== "undefined" && window.innerWidth < 768
    ? "mobile"
    : "desktop";
}

export function buildActivationState(role, device = "desktop") {
  return {
    version: 1,
    role,
    device,
    seenIntro: false,
    dismissed: false,
    completedMissions: {},
    hiddenNudges: {},
    manualSteps: {},
  };
}

export function normalizeActivationState(saved, role, device = "desktop") {
  if (!saved || saved.role !== role) return buildActivationState(role, device);
  if (saved.version !== 1) return buildActivationState(role, device);

  return {
    ...buildActivationState(role, device),
    ...saved,
    version: 1,
    role,
    device: saved.device || device,
    completedMissions: saved.completedMissions && typeof saved.completedMissions === "object"
      ? saved.completedMissions
      : {},
    hiddenNudges: saved.hiddenNudges && typeof saved.hiddenNudges === "object"
      ? saved.hiddenNudges
      : {},
    manualSteps: saved.manualSteps && typeof saved.manualSteps === "object"
      ? saved.manualSteps
      : {},
  };
}

export function getActivationPlaybook(role, canFeature = () => true) {
  if (role === "admin_eleam" && !canFeature("beds")) {
    return ADMIN_FALLBACK_PLAYBOOK;
  }

  return ACTIVATION_PLAYBOOKS[role] ?? null;
}

export function isStepAllowed(step, access = {}) {
  const can = access.can ?? (() => true);
  const canFeature = access.canFeature ?? (() => true);

  if (step.requiredPermission && !can(step.requiredPermission)) return false;
  if (step.requiredFeature && !canFeature(step.requiredFeature)) return false;
  return true;
}

export function filterAllowedSteps(playbook, access = {}) {
  if (!playbook) return [];
  return playbook.steps.filter((step) => isStepAllowed(step, access));
}

export function buildCompletionSnapshot({
  habitaciones = [],
  camas = [],
  residentes = [],
  asignaciones = [],
} = {}) {
  return {
    hasBedInventory: habitaciones.length > 0 && camas.length > 0,
    hasActiveResident: residentes.some((residente) => residente?.estado === "activo"),
    hasActiveBedAssignment: asignaciones.some((asignacion) => !asignacion?.fecha_fin),
  };
}

export function evaluateCompletionRule(rule, snapshot = {}) {
  if (!rule) return false;
  return snapshot[rule] === true;
}

export function getStepStatus(step, state, snapshot) {
  const completedByRule = evaluateCompletionRule(step.completionRule, snapshot);
  const completedManually = state?.manualSteps?.[step.id] === true;

  return {
    completed: completedByRule || completedManually,
    completedByRule,
    completedManually,
  };
}

export function buildStepStatuses(steps, state, snapshot) {
  return steps.reduce((acc, step) => {
    acc[step.id] = getStepStatus(step, state, snapshot);
    return acc;
  }, {});
}

export function getFirstPendingStep(steps, statuses) {
  return steps.find((step) => !statuses[step.id]?.completed) ?? null;
}

export function getCurrentRouteStep(steps, statuses, pathname) {
  const candidates = steps.filter((step) => {
    if (statuses[step.id]?.completed) return false;
    return step.matchRoutes?.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
  });

  return candidates.sort((a, b) => {
    const aLength = Math.max(...(a.matchRoutes ?? []).map((route) => route.length));
    const bLength = Math.max(...(b.matchRoutes ?? []).map((route) => route.length));
    return bLength - aLength;
  })[0] ?? null;
}
