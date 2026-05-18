import { describe, expect, it } from "vitest";
import {
  buildActivationState,
  buildCompletionSnapshot,
  buildStepStatuses,
  filterAllowedSteps,
  getActivationPlaybook,
  getFirstPendingStep,
  normalizeActivationState,
} from "./onboardingUtils";

describe("activation onboarding utilities", () => {
  it("filters steps by role permissions and enabled features", () => {
    const playbook = getActivationPlaybook("funcionario");
    const steps = filterAllowedSteps(playbook, {
      can: (perm) => perm === "crear_observaciones",
      canFeature: (feature) => feature !== "beds" && feature !== "vital-signs",
    });

    expect(steps.map((step) => step.id)).toEqual(["staff_record_observation"]);
  });

  it("uses the admin resident fallback when beds are disabled", () => {
    const playbook = getActivationPlaybook("admin_eleam", (feature) => feature !== "beds");

    expect(playbook.id).toBe("admin_first_resident");
    expect(playbook.steps.map((step) => step.id)).toEqual(["resident_ready"]);
  });

  it("evaluates admin completion rules from operational state", () => {
    const snapshot = buildCompletionSnapshot({
      habitaciones: [{ id: "room-1" }],
      camas: [{ id: "bed-1" }],
      residentes: [{ id: "resident-1", estado: "activo" }],
      asignaciones: [{ id: "assignment-1", fecha_fin: null }],
    });
    const playbook = getActivationPlaybook("admin_eleam");
    const state = buildActivationState("admin_eleam");
    const statuses = buildStepStatuses(playbook.steps, state, snapshot);

    expect(statuses.room_bed_ready.completed).toBe(true);
    expect(statuses.resident_ready.completed).toBe(true);
    expect(statuses.bed_assigned.completed).toBe(true);
    expect(getFirstPendingStep(playbook.steps, statuses)).toBeNull();
  });

  it("keeps dismissed and hidden nudge state when normalizing activation storage", () => {
    const state = normalizeActivationState(
      {
        version: 1,
        role: "familiar",
        dismissed: true,
        hiddenNudges: { family_record_visit: true },
        manualSteps: { family_review_status: true },
      },
      "familiar",
      "mobile",
    );

    expect(state).toMatchObject({
      version: 1,
      role: "familiar",
      device: "mobile",
      dismissed: true,
      hiddenNudges: { family_record_visit: true },
      manualSteps: { family_review_status: true },
    });
  });

  it("resets incompatible onboarding v2-shaped storage into activation v1", () => {
    const migrated = normalizeActivationState(
      {
        role: "admin_eleam",
        seenWelcome: true,
        steps: { crear_residente: true },
        knownAvailableIds: ["crear_residente"],
        completedAt: "2026-01-01T00:00:00.000Z",
      },
      "admin_eleam",
      "desktop",
    );

    expect(migrated).toMatchObject({
      version: 1,
      role: "admin_eleam",
      seenIntro: false,
      completedMissions: {},
      manualSteps: {},
    });
    expect(migrated.steps).toBeUndefined();
  });
});
