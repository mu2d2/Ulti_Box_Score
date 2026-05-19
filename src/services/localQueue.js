const QUEUE_KEY = "ulti-box-score-sync-queue";

export function readQueue() {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

export function enqueueAction(action) {
  const queue = readQueue();
  queue.push({ ...action, queuedAt: new Date().toISOString() });
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue() {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
}
