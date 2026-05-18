export { OnboardingProvider, useOnboarding } from './OnboardingContext';
export { default as ActivationIntro } from './ActivationIntro';
export { default as ActivationPanel } from './ActivationPanel';
export { default as ActivationNudge } from './ActivationNudge';
export { default as ActivationComplete } from './ActivationComplete';

// Backward-compatible names while the shell and any deep imports migrate.
export { default as OnboardingWelcomeModal } from './ActivationIntro';
export { default as OnboardingChecklist } from './ActivationPanel';
export { default as OnboardingBanner } from './ActivationNudge';

export {
  ACTIVATION_PLAYBOOKS,
  ACTIVATION_STORAGE_PREFIX,
  ADMIN_FALLBACK_PLAYBOOK,
  ROLE_CONFIG,
  COLOR_CLASSES,
  ONBOARDING_STORAGE_PREFIX,
} from './onboardingConfig';
