const STORAGE_PREFIX = "fichaeleam_coach_v1_";

function safeStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function coachStorageKey(featureId, userId) {
  if (!featureId || !userId) return null;
  return `${STORAGE_PREFIX}${featureId}_${userId}`;
}

export function hasSeenCoach(featureId, userId) {
  const key = coachStorageKey(featureId, userId);
  const store = safeStorage();
  if (!key || !store) return false;
  try {
    return store.getItem(key) === "seen";
  } catch {
    return false;
  }
}

export function markCoachSeen(featureId, userId) {
  const key = coachStorageKey(featureId, userId);
  const store = safeStorage();
  if (!key || !store) return;
  try {
    store.setItem(key, "seen");
  } catch {
    // ignore quota / disabled storage
  }
}

export function resetCoachSeen(featureId, userId) {
  const key = coachStorageKey(featureId, userId);
  const store = safeStorage();
  if (!key || !store) return;
  try {
    store.removeItem(key);
  } catch {
    // ignore
  }
}

export function resetAllCoaches(userId) {
  const store = safeStorage();
  if (!store || !userId) return 0;
  const suffix = `_${userId}`;
  const keysToRemove = [];
  try {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key && key.startsWith(STORAGE_PREFIX) && key.endsWith(suffix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => store.removeItem(key));
  } catch {
    // ignore
  }
  return keysToRemove.length;
}
