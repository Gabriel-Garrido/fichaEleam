import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ACTIVATION_STORAGE_PREFIX } from "./onboardingConfig";
import { fetchActivationCompletionSnapshot } from "./onboardingService";
import {
  buildActivationState,
  buildCompletionSnapshot,
  buildStepStatuses,
  filterAllowedSteps,
  getActivationPlaybook,
  getCurrentRouteStep,
  getDevice,
  getFirstPendingStep,
  normalizeActivationState,
} from "./onboardingUtils";

const OnboardingContext = createContext(null);
const ACTIVATION_REFRESH_INTERVAL_MS = 60_000;
const ACTIVATION_FOCUS_REFRESH_MIN_MS = 30_000;

function storageKey(userId, device) {
  return `${ACTIVATION_STORAGE_PREFIX}${userId}_${device}`;
}

function loadState(userId, role, device) {
  try {
    const raw = localStorage.getItem(storageKey(userId, device));
    return normalizeActivationState(raw ? JSON.parse(raw) : null, role, device);
  } catch {
    return buildActivationState(role, device);
  }
}

function persistState(userId, device, state) {
  try {
    localStorage.setItem(storageKey(userId, device), JSON.stringify(state));
  } catch {
    // Local storage can be unavailable in private browsing or embedded contexts.
  }
}

export function OnboardingProvider({ children }) {
  const { user, rol, can, canFeature, profileLoading } = useAuth();
  const location = useLocation();
  const [device] = useState(() => getDevice());
  const [state, setState] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(() => buildCompletionSnapshot());
  const [activationError, setActivationError] = useState(null);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    if (!user?.id || !rol || !getActivationPlaybook(rol, canFeature)) {
      setState(null);
      return;
    }

    setState(loadState(user.id, rol, device));
  }, [user?.id, rol, device, canFeature]);

  useEffect(() => {
    if (state && user?.id) persistState(user.id, device, state);
  }, [state, user?.id, device]);

  const playbook = useMemo(
    () => (rol ? getActivationPlaybook(rol, canFeature) : null),
    [rol, canFeature],
  );

  const steps = useMemo(() => {
    if (profileLoading || !state || !playbook) return [];
    return filterAllowedSteps(playbook, { can, canFeature });
  }, [profileLoading, state, playbook, can, canFeature]);

  const refresh = useCallback(async ({ force = false } = {}) => {
    if (!steps.some((step) => step.completionRule)) return;
    const now = Date.now();
    if (!force && now - lastRefreshAtRef.current < ACTIVATION_FOCUS_REFRESH_MIN_MS) return;
    lastRefreshAtRef.current = now;

    try {
      const nextSnapshot = await fetchActivationCompletionSnapshot();
      setSnapshot(nextSnapshot);
      setActivationError(null);
    } catch (error) {
      console.warn("No se pudo actualizar el avance de activación:", error);
      setActivationError(error);
    }
  }, [steps]);

  useEffect(() => {
    if (!state || !steps.some((step) => step.completionRule)) return undefined;

    refresh({ force: true });
    const intervalId = window.setInterval(() => refresh(), ACTIVATION_REFRESH_INTERVAL_MS);
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [state, steps, refresh, location.pathname]);

  const statuses = useMemo(
    () => buildStepStatuses(steps, state, snapshot),
    [steps, state, snapshot],
  );

  const doneCount = steps.filter((step) => statuses[step.id]?.completed).length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 100;
  const isComplete = totalCount > 0 && doneCount === totalCount;
  const firstPendingStep = useMemo(
    () => getFirstPendingStep(steps, statuses),
    [steps, statuses],
  );
  const currentRouteStep = useMemo(
    () => getCurrentRouteStep(steps, statuses, location.pathname),
    [steps, statuses, location.pathname],
  );

  useEffect(() => {
    if (!isComplete || !playbook?.id) return;
    setState((prev) => {
      if (!prev || prev.completedMissions?.[playbook.id]) return prev;
      return {
        ...prev,
        completedMissions: {
          ...prev.completedMissions,
          [playbook.id]: new Date().toISOString(),
        },
      };
    });
  }, [isComplete, playbook?.id]);

  const markIntroSeen = useCallback(() => {
    setState((prev) => (prev ? { ...prev, seenIntro: true, dismissed: false } : prev));
  }, []);

  const markStepDone = useCallback((stepId) => {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.manualSteps?.[stepId]) return prev;
      return {
        ...prev,
        manualSteps: {
          ...prev.manualSteps,
          [stepId]: true,
        },
      };
    });
  }, []);

  const hideNudge = useCallback((stepId) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        hiddenNudges: {
          ...prev.hiddenNudges,
          [stepId]: true,
        },
      };
    });
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => (prev ? { ...prev, dismissed: true, seenIntro: true } : prev));
    setPanelOpen(false);
  }, []);

  const reset = useCallback(() => {
    if (!rol) return;
    setState(buildActivationState(rol, device));
    setPanelOpen(false);
    setSnapshot(buildCompletionSnapshot());
  }, [rol, device]);

  const showIntro = !!(
    state &&
    playbook &&
    !state.seenIntro &&
    !state.dismissed &&
    steps.length > 0
  );

  const isActive = !!(
    state &&
    playbook &&
    !state.dismissed &&
    steps.length > 0
  );

  const currentRouteStepIndex = currentRouteStep
    ? steps.findIndex((step) => step.id === currentRouteStep.id)
    : -1;

  const value = {
    state,
    config: playbook,
    playbook,
    device,
    isMobile: device === "mobile",
    steps,
    statuses,
    snapshot,
    doneCount,
    totalCount,
    progress,
    isComplete,
    showIntro,
    showWelcome: showIntro,
    isActive,
    firstPendingStep,
    currentRouteStep,
    currentRouteStepIndex,
    panelOpen,
    checklistOpen: panelOpen,
    setPanelOpen,
    setChecklistOpen: setPanelOpen,
    markIntroSeen,
    markWelcomeSeen: markIntroSeen,
    markStepDone,
    hideNudge,
    dismiss,
    reset,
    refresh,
    activationError,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => useContext(OnboardingContext);
