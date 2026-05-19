const API_BASE_URL = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
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
  getPlayers() {
    return request("/players/");
  },

  createPlayer(payload) {
    return request("/players/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  createStatEvent(payload) {
    return request("/stat-events/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  undoLastStatEvent(gameId) {
    return request(`/games/${gameId}/undo-last-event/`, {
      method: "POST",
    });
  },
};
