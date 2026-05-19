const STORAGE_KEY_PREFIX = "ulti-box-score-state";

function toScopeSuffix(teamEmail) {
  const normalized = (teamEmail || "").trim().toLowerCase();
  return normalized || "anonymous";
}

function toStorageKey(teamEmail) {
  return `${STORAGE_KEY_PREFIX}:${toScopeSuffix(teamEmail)}`;
}

export function loadGameState(scopeKey) {
  try {
    const raw = window.localStorage.getItem(toStorageKey(scopeKey));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export function saveGameState(scopeKey, state) {
  try {
    window.localStorage.setItem(toStorageKey(scopeKey), JSON.stringify(state));
  } catch (error) {
    // Ignore storage errors in starter scaffold.
  }
}
