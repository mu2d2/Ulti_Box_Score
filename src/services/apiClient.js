const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

/** Retrieve the stored auth token without importing authStore (avoids circular deps). */
function getAuthToken() {
  try {
    const raw = window.localStorage.getItem("ulti-box-score-auth-session");
    return raw ? JSON.parse(raw)?.authToken || "" : "";
  } catch {
    return "";
  }
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text || "Request failed"}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const apiClient = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  verifyGoogleIdToken(payload) {
    return request("/auth/google/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateTeamName(teamName) {
    return request("/auth/account", {
      method: "PUT",
      body: JSON.stringify({ teamName }),
    });
  },

  // ── Full state hydration ──────────────────────────────────────────────────
  /** Loads the full game state for the authenticated account from the DB. */
  getState() {
    return request("/state");
  },

  // ── Players ───────────────────────────────────────────────────────────────
  getPlayers() {
    return request("/players");
  },

  createPlayer(payload) {
    return request("/players", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updatePlayer(playerId, updates) {
    return request(`/players/${playerId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  // ── Lineup Groups ─────────────────────────────────────────────────────────
  getLineupGroups() {
    return request("/lineup-groups");
  },

  createLineupGroup(payload) {
    return request("/lineup-groups", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateLineupGroup(lineupGroupId, payload) {
    return request(`/lineup-groups/${lineupGroupId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // ── Games ─────────────────────────────────────────────────────────────────
  getGames() {
    return request("/games");
  },

  createGame(payload) {
    return request("/games", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateGame(gameId, updates) {
    return request(`/games/${gameId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  deleteGame(gameId) {
    return request(`/games/${gameId}`, { method: "DELETE" });
  },

  toggleGameComplete(gameId) {
    return request(`/games/${gameId}/toggle-complete`, { method: "POST" });
  },

  // ── Points ────────────────────────────────────────────────────────────────
  commitPoint(gameId, payload) {
    return request(`/games/${gameId}/points`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ── Stat Events ───────────────────────────────────────────────────────────
  getStatEvents(gameId) {
    return request(`/games/${gameId}/stat-events`);
  },

  createStatEvent(gameId, payload) {
    return request(`/games/${gameId}/stat-events`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteStatEvent(eventId) {
    return request(`/stat-events/${eventId}`, { method: "DELETE" });
  },

  // ── Offline sync ──────────────────────────────────────────────────────────
  /**
   * Pushes a batch of queued actions to the server for persistence.
   * @param {Array<{type: string, payload: object, queuedAt: string}>} actions
   */
  sync(actions) {
    return request("/sync", {
      method: "POST",
      body: JSON.stringify({ actions }),
    });
  },

  // ── Account management ────────────────────────────────────────────────────
  /**
   * Deletes all account data (players, games, stats, lineups) from the server.
   * The login/account row itself is preserved.
   */
  clearAccountData() {
    return request("/account/data", { method: "DELETE" });
  },
};
