const QUEUE_KEY_PREFIX = "ulti-box-score-sync-queue";

function toScopeSuffix(teamEmail) {
  const normalized = (teamEmail || "").trim().toLowerCase();
  return normalized || "anonymous";
}

function toQueueKey(teamEmail) {
  return `${QUEUE_KEY_PREFIX}:${toScopeSuffix(teamEmail)}`;
}

export function readQueue(scopeKey) {
  try {
    const raw = window.localStorage.getItem(toQueueKey(scopeKey));
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

export function enqueueAction(scopeKey, action) {
  const queue = readQueue(scopeKey);
  queue.push({ ...action, queuedAt: new Date().toISOString() });
  window.localStorage.setItem(toQueueKey(scopeKey), JSON.stringify(queue));
}

export function clearQueue(scopeKey) {
  window.localStorage.setItem(toQueueKey(scopeKey), JSON.stringify([]));
}
