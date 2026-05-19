const AUTH_SESSION_KEY = "ulti-box-score-auth-session";
const AUTH_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export function loadAuthSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function saveAuthSession(session) {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export function isAuthSessionValid(session) {
  if (!session || !session.teamEmail || !session.signedInAt) {
    return false;
  }

  const signedInAt = Date.parse(session.signedInAt);
  if (Number.isNaN(signedInAt)) {
    return false;
  }

  return Date.now() - signedInAt <= AUTH_SESSION_TTL_MS;
}
