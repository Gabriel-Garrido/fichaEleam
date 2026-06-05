const STORAGE_PREFIX = "fichaeleam_welcome_v1_";

function safeStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function welcomeStorageKey(userId) {
  if (!userId) return null;
  return `${STORAGE_PREFIX}${userId}`;
}

export function hasSeenWelcome(userId) {
  const key = welcomeStorageKey(userId);
  const store = safeStorage();
  if (!key || !store) return false;
  try {
    return store.getItem(key) === "seen";
  } catch {
    return false;
  }
}

export function markWelcomeSeen(userId) {
  const key = welcomeStorageKey(userId);
  const store = safeStorage();
  if (!key || !store) return;
  try {
    store.setItem(key, "seen");
  } catch {
    // ignore quota / disabled storage
  }
}

export function resetWelcome(userId) {
  const key = welcomeStorageKey(userId);
  const store = safeStorage();
  if (!key || !store) return;
  try {
    store.removeItem(key);
  } catch {
    // ignore
  }
}
