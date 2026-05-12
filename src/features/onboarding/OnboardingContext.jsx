import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ONBOARDING_STORAGE_PREFIX, ROLE_CONFIG } from './onboardingConfig';

const OnboardingContext = createContext(null);

function storageKey(userId) {
  return `${ONBOARDING_STORAGE_PREFIX}${userId}`;
}

function buildInitialState(role) {
  const config = ROLE_CONFIG[role];
  if (!config) return null;
  const steps = {};
  config.steps.forEach((s) => { steps[s.id] = false; });
  return { role, seenWelcome: false, steps, dismissed: false, completedAt: null };
}

function loadFromStorage(userId, role) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return buildInitialState(role);
    const parsed = JSON.parse(raw);
    // If role changed since last session, reset entirely
    if (parsed.role !== role) return buildInitialState(role);
    // Ensure new steps added in future config updates are included
    const config = ROLE_CONFIG[role];
    if (config) {
      config.steps.forEach((s) => {
        if (!(s.id in parsed.steps)) parsed.steps[s.id] = false;
      });
    }
    return parsed;
  } catch {
    return buildInitialState(role);
  }
}

function saveToStorage(userId, state) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {}
}

export function OnboardingProvider({ children }) {
  const { user, rol } = useAuth();
  const location = useLocation();
  const [state, setState] = useState(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const timers = useRef({});

  // Load (or init) onboarding state when user/role is ready
  useEffect(() => {
    if (!user?.id || !rol || !ROLE_CONFIG[rol]) {
      setState(null);
      return;
    }
    setState(loadFromStorage(user.id, rol));
  }, [user?.id, rol]);

  // Persist to localStorage on every state change
  useEffect(() => {
    if (state && user?.id) saveToStorage(user.id, state);
  }, [state, user?.id]);

  // Auto-complete steps after the user lingers on a matching route
  useEffect(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};

    if (!state || state.dismissed || !rol) return;

    const config = ROLE_CONFIG[rol];
    if (!config) return;

    config.steps.forEach((step) => {
      if (state.steps[step.id]) return;
      const matches = step.matchRoutes?.some((r) => location.pathname.startsWith(r));
      if (!matches) return;

      timers.current[step.id] = setTimeout(() => {
        setState((prev) => {
          if (!prev || prev.steps[step.id]) return prev;
          const newSteps = { ...prev.steps, [step.id]: true };
          const allDone = Object.values(newSteps).every(Boolean);
          return {
            ...prev,
            steps: newSteps,
            completedAt: allDone && !prev.completedAt ? new Date().toISOString() : prev.completedAt,
          };
        });
      }, step.autoCompleteAfter ?? 6000);
    });

    return () => {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, [location.pathname, state?.dismissed, rol]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback((updater) => {
    setState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const markWelcomeSeen = useCallback(() => {
    update((prev) => (prev ? { ...prev, seenWelcome: true } : prev));
  }, [update]);

  const markStepDone = useCallback((stepId) => {
    update((prev) => {
      if (!prev || prev.steps[stepId]) return prev;
      const newSteps = { ...prev.steps, [stepId]: true };
      const allDone = Object.values(newSteps).every(Boolean);
      return {
        ...prev,
        steps: newSteps,
        completedAt: allDone && !prev.completedAt ? new Date().toISOString() : prev.completedAt,
      };
    });
  }, [update]);

  const dismiss = useCallback(() => {
    update((prev) => (prev ? { ...prev, dismissed: true } : prev));
    setChecklistOpen(false);
  }, [update]);

  const reset = useCallback(() => {
    if (!rol) return;
    setState(buildInitialState(rol));
  }, [rol]);

  const config = rol ? ROLE_CONFIG[rol] : null;
  const steps = config?.steps ?? [];
  const doneCount = state ? steps.filter((s) => state.steps[s.id]).length : 0;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 100;
  const isComplete = totalCount > 0 && doneCount === totalCount;

  // Show welcome modal: first render in AppShell, not dismissed, not already complete
  const showWelcome = !!(state && !state.seenWelcome && !state.dismissed);

  // Show onboarding UI (checklist button + banner) when active and not fully done
  const isActive = !!(state && !state.dismissed);

  // Step matching the current route (for the contextual banner)
  const currentRouteStep = steps.find(
    (s) => !state?.steps[s.id] && s.matchRoutes?.some((r) => location.pathname.startsWith(r))
  ) ?? null;

  const value = {
    state,
    config,
    steps,
    doneCount,
    totalCount,
    progress,
    isComplete,
    showWelcome,
    isActive,
    currentRouteStep,
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
