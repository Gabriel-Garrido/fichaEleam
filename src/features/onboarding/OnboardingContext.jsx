import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ONBOARDING_STORAGE_PREFIX, ROLE_CONFIG } from './onboardingConfig';

const OnboardingContext = createContext(null);

// ─── Storage helpers ───────────────────────────────────────────────────────────

function storageKey(userId) {
  return `${ONBOARDING_STORAGE_PREFIX}${userId}`;
}

function buildFreshState(role) {
  const config = ROLE_CONFIG[role];
  if (!config) return null;
  const steps = {};
  config.steps.forEach((s) => { steps[s.id] = false; });
  return {
    role,
    seenWelcome: false,
    steps,
    // Tracks which step IDs were visible at the last session.
    // Used to detect newly-granted permissions between sessions.
    knownAvailableIds: [],
    dismissed: false,
    completedAt: null,
  };
}

function loadState(userId, role) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return buildFreshState(role);

    const saved = JSON.parse(raw);
    // Role changed → full reset
    if (saved.role !== role) return buildFreshState(role);

    // Forward-compat: add any step IDs added to config after the user's last session
    ROLE_CONFIG[role]?.steps.forEach((s) => {
      if (!(s.id in saved.steps)) saved.steps[s.id] = false;
    });

    // Forward-compat: field added in storage v2
    if (!Array.isArray(saved.knownAvailableIds)) saved.knownAvailableIds = [];

    return saved;
  } catch {
    return buildFreshState(role);
  }
}

function persist(userId, state) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Local storage can be unavailable in private browsing or embedded contexts.
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OnboardingProvider({ children }) {
  const { user, rol, can, canFeature, profileLoading } = useAuth();
  const location = useLocation();

  const [state, setState] = useState(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const timers = useRef({});

  // ── 1. Bootstrap: load state when user + role are known ───────────────────
  useEffect(() => {
    if (!user?.id || !rol || !ROLE_CONFIG[rol]) {
      setState(null);
      return;
    }
    setState(loadState(user.id, rol));
  }, [user?.id, rol]);

  // ── 2. Persist every state change ────────────────────────────────────────
  useEffect(() => {
    if (state && user?.id) persist(user.id, state);
  }, [state, user?.id]);

  // ── 3. Compute which steps are available given current permissions ────────
  //
  // We wait until profileLoading is false so `can()` reflects the real
  // permission set (permisos=null triggers a fail-open default in can(), which
  // would briefly show all steps and then hide them — better to wait).
  const allSteps = useMemo(
    () => ROLE_CONFIG[rol]?.steps ?? [],
    [rol],
  );

  const availableSteps = useMemo(() => {
    if (profileLoading || !state) return [];
    return allSteps.filter((step) => {
      if (step.requiredPermission && !can(step.requiredPermission)) return false;
      if (step.requiredFeature && !canFeature(step.requiredFeature)) return false;
      return true;
    });
  }, [allSteps, profileLoading, state, can, canFeature]);

  // ── 4. Detect newly-granted permissions between sessions ─────────────────
  //
  // If a step was not previously visible (not in knownAvailableIds) but is now
  // available AND still pending, we reactivate the onboarding so the user
  // knows there's something new to discover.
  useEffect(() => {
    if (profileLoading || !availableSteps.length) return;

    const currentIds = availableSteps.map((s) => s.id);

    setState((prev) => {
      if (!prev) return prev;

      const known = new Set(prev.knownAvailableIds);
      const newlyVisible = currentIds.filter((id) => !known.has(id));

      // Nothing new → just ensure knownAvailableIds is current
      if (newlyVisible.length === 0) {
        // Still sync if knownAvailableIds differs (e.g. a permission was removed)
        const sameIds =
          currentIds.length === prev.knownAvailableIds.length &&
          currentIds.every((id) => known.has(id));
        return sameIds ? prev : { ...prev, knownAvailableIds: currentIds };
      }

      const hasNewPending = newlyVisible.some((id) => prev.steps[id] === false);

      return {
        ...prev,
        knownAvailableIds: currentIds,
        // Reactivate guide when there are uncompleted newly-visible steps
        dismissed: hasNewPending ? false : prev.dismissed,
        // Reset completion stamp so the finished state reflects new reality
        completedAt: hasNewPending ? null : prev.completedAt,
      };
    });
  }, [availableSteps, profileLoading]);

  // ── 5. Auto-complete: mark a step done after the user lingers on its route ─
  useEffect(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};

    if (!state || state.dismissed || !availableSteps.length) return;

    availableSteps.forEach((step) => {
      if (state.steps[step.id]) return;
      const onRoute = step.matchRoutes?.some((r) => location.pathname.startsWith(r));
      if (!onRoute) return;

      timers.current[step.id] = setTimeout(() => {
        setState((prev) => {
          if (!prev || prev.steps[step.id]) return prev;
          return { ...prev, steps: { ...prev.steps, [step.id]: true } };
        });
      }, step.autoCompleteAfter ?? 6000);
    });

    return () => {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
    // availableSteps reference is stable (useMemo) so this won't thrash.
  }, [location.pathname, state?.dismissed, availableSteps]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 6. Stamp completedAt when all available steps are done ───────────────
  const doneCount = state
    ? availableSteps.filter((s) => state.steps[s.id]).length
    : 0;
  const totalCount = availableSteps.length;
  const isComplete = totalCount > 0 && doneCount === totalCount;

  useEffect(() => {
    if (!isComplete) return;
    setState((prev) => {
      if (!prev || prev.completedAt) return prev;
      return { ...prev, completedAt: new Date().toISOString() };
    });
  }, [isComplete]);

  // ── Public API ────────────────────────────────────────────────────────────

  const markWelcomeSeen = useCallback(() => {
    setState((prev) => (prev ? { ...prev, seenWelcome: true } : prev));
  }, []);

  const markStepDone = useCallback((stepId) => {
    setState((prev) => {
      if (!prev || prev.steps[stepId]) return prev;
      return { ...prev, steps: { ...prev.steps, [stepId]: true } };
    });
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => (prev ? { ...prev, dismissed: true } : prev));
    setChecklistOpen(false);
  }, []);

  const reset = useCallback(() => {
    if (!rol) return;
    setState(buildFreshState(rol));
  }, [rol]);

  // ── Derived UI flags ──────────────────────────────────────────────────────

  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 100;

  // Only show welcome modal once permissions are loaded and there are steps to show
  const showWelcome = !!(
    state &&
    !state.seenWelcome &&
    !state.dismissed &&
    availableSteps.length > 0
  );

  // Checklist button and banner are visible when not dismissed and there are steps
  const isActive = !!(state && !state.dismissed && availableSteps.length > 0);

  // First pending step whose route matches the current page
  const currentRouteStep = availableSteps.find(
    (s) =>
      !state?.steps[s.id] &&
      s.matchRoutes?.some((r) => location.pathname.startsWith(r)),
  ) ?? null;

  // Index of currentRouteStep within availableSteps (for "Paso X de Y" display)
  const currentRouteStepIndex = currentRouteStep
    ? availableSteps.indexOf(currentRouteStep)
    : -1;

  const config = rol ? ROLE_CONFIG[rol] : null;

  const value = {
    state,
    config,
    // Only expose available (permission-filtered) steps to UI components
    steps: availableSteps,
    doneCount,
    totalCount,
    progress,
    isComplete,
    showWelcome,
    isActive,
    currentRouteStep,
    currentRouteStepIndex,
    checklistOpen,
    setChecklistOpen,
    markWelcomeSeen,
    markStepDone,
    dismiss,
    reset,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => useContext(OnboardingContext);
