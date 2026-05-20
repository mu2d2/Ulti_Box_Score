import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RosterPanel } from "../components/RosterPanel";
import { GamesPanel } from "../components/GamesPanel";
import { OnFieldPanel } from "../components/OnFieldPanel";
import { BoxScoreTable } from "../components/BoxScoreTable";
import { initialState } from "../models/initialState";
import { DEFAULT_LINEUP_GROUPS } from "../models/types";
import { createId } from "../utils/id";
import { buildBoxScore } from "../utils/stats";
import { clearQueue, enqueueAction, readQueue } from "../services/localQueue";
import { loadGameState, saveGameState } from "../services/gameStore";
import {
  clearAuthSession,
  isAuthSessionValid,
  loadAuthSession,
  saveAuthSession,
} from "../services/authStore";
import { SignInPage } from "../features/auth/SignInPage";
import { hashSha256Hex } from "../services/googleAuth";
import { apiClient } from "../services/apiClient";

function getPlayerIdsForLineup(lineupId, players, lineupMembership) {
  if (lineupId === "lineup-all") {
    return players.map((player) => player.id);
  }

  return Object.entries(lineupMembership)
    .filter(([, memberships]) => Array.isArray(memberships) && memberships.includes(lineupId))
    .map(([playerId]) => playerId);
}

function getPlayerIdsForLineups(lineupIds, players, lineupMembership) {
  if (lineupIds.includes("lineup-all")) {
    return players.map((player) => player.id);
  }

  const merged = new Set();
  for (const lineupId of lineupIds) {
    const ids = getPlayerIdsForLineup(lineupId, players, lineupMembership);
    for (const id of ids) {
      merged.add(id);
    }
  }

  return [...merged];
}

function createEmptyGameData() {
  return {
    pointNumber: 1,
    currentOnFieldPlayerIds: [],
    playerPointsPlayed: {},
    statEvents: [],
    pointResults: [],
  };
}

function buildScoreFromPointResults(pointResults) {
  return pointResults.reduce(
    (score, result) => {
      if (result.didWeScore) {
        return { us: score.us + 1, them: score.them };
      }
      return { us: score.us, them: score.them + 1 };
    },
    { us: 0, them: 0 }
  );
}

function buildInitialState(local) {
  if (!local) {
    return {
      ...initialState,
      lineupGroups: DEFAULT_LINEUP_GROUPS,
      games: [
        {
          id: "game-1",
          name: "Game 1",
          opponent: "",
          isCompleted: false,
          createdAt: new Date().toISOString(),
        },
      ],
      activeGameId: "game-1",
      gameDataById: {
        "game-1": createEmptyGameData(),
      },
    };
  }

  const players = Array.isArray(local.players) ? local.players : [];
  const lineupGroups =
    Array.isArray(local.lineupGroups) && local.lineupGroups.length > 0
      ? local.lineupGroups
      : DEFAULT_LINEUP_GROUPS;
  const lineupMembership =
    local.lineupMembership && typeof local.lineupMembership === "object"
      ? local.lineupMembership
      : {};

  const hasMultiGame = Array.isArray(local.games) && local.gameDataById;
  if (hasMultiGame) {
    const games = (local.games.length > 0 ? local.games : initialState.games).map((game) => ({
      ...game,
      isCompleted: Boolean(game.isCompleted),
    }));
    const activeGameId = games.some((g) => g.id === local.activeGameId)
      ? local.activeGameId
      : games[0].id;
    const gameDataById = {};
    for (const game of games) {
      const raw = local.gameDataById?.[game.id] || {};
      gameDataById[game.id] = {
        pointNumber: Number(raw.pointNumber) > 0 ? Number(raw.pointNumber) : 1,
        currentOnFieldPlayerIds: Array.isArray(raw.currentOnFieldPlayerIds)
          ? raw.currentOnFieldPlayerIds
          : [],
        playerPointsPlayed:
          raw.playerPointsPlayed && typeof raw.playerPointsPlayed === "object"
            ? raw.playerPointsPlayed
            : {},
        statEvents: Array.isArray(raw.statEvents) ? raw.statEvents : [],
        pointResults: Array.isArray(raw.pointResults) ? raw.pointResults : [],
      };
    }

    return {
      ...initialState,
      ...local,
      players,
      lineupGroups,
      lineupMembership,
      games,
      activeGameId,
      gameDataById,
    };
  }

  const legacyGameId = local.game?.id || "game-1";
  return {
    ...initialState,
    ...local,
    players,
    lineupGroups,
    lineupMembership,
    games: [
      {
        id: legacyGameId,
        name: local.game?.name || "Game 1",
        opponent: local.game?.opponent || "",
        isCompleted: false,
        createdAt: new Date().toISOString(),
      },
    ],
    activeGameId: legacyGameId,
    gameDataById: {
      [legacyGameId]: {
        pointNumber: Number(local.game?.pointNumber) > 0 ? Number(local.game?.pointNumber) : 1,
        currentOnFieldPlayerIds: Array.isArray(local.currentOnFieldPlayerIds)
          ? local.currentOnFieldPlayerIds
          : [],
        playerPointsPlayed:
          local.playerPointsPlayed && typeof local.playerPointsPlayed === "object"
            ? local.playerPointsPlayed
            : {},
        statEvents: Array.isArray(local.statEvents) ? local.statEvents : [],
        pointResults: [],
      },
    },
  };
}

export default function App() {
  const [authSession, setAuthSession] = useState(() => {
    const session = loadAuthSession();
    return isAuthSessionValid(session) ? session : null;
  });
  const [state, setState] = useState(() => buildInitialState(loadGameState(authSession?.teamScopeKey)));

  const [selectedBoxScoreLineupIds, setSelectedBoxScoreLineupIds] = useState(["lineup-all"]);
  const [selectedLiveEntryLineupIds, setSelectedLiveEntryLineupIds] = useState(["lineup-all"]);
  const [activePage, setActivePage] = useState("games");
  const [syncQueueSize, setSyncQueueSize] = useState(() => readQueue(authSession?.teamScopeKey).length);
  const [isOnline, setIsOnline] = useState(() => window.navigator.onLine);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [draftTeamName, setDraftTeamName] = useState("");

  const activeGame =
    state.games.find((game) => game.id === state.activeGameId) || state.games[0] || null;
  const activeGameId = activeGame?.id || null;
  const activeGameData = activeGameId
    ? state.gameDataById[activeGameId] || createEmptyGameData()
    : createEmptyGameData();

  useEffect(() => {
    if (!authSession?.teamScopeKey) {
      return;
    }

    saveGameState(authSession.teamScopeKey, state);
  }, [authSession?.teamScopeKey, state]);

  useEffect(() => {
    if (!authSession?.teamScopeKey) {
      setState(buildInitialState(null));
      setSyncQueueSize(0);
      return;
    }

    // Seed immediately from localStorage so the UI is never blank,
    // then try to hydrate from the server and replace if successful.
    const pendingCount = readQueue(authSession.teamScopeKey).length;
    setState(buildInitialState(loadGameState(authSession.teamScopeKey)));
    setSyncQueueSize(pendingCount);
    setSelectedLiveEntryLineupIds(["lineup-all"]);
    setSelectedBoxScoreLineupIds(["lineup-all"]);
    setActivePage("box-score");

    if (pendingCount > 0) {
      // Keep local state while unsynced actions exist; server state may be stale.
      return;
    }

    apiClient.getState().then((serverState) => {
      if (!serverState) return;
      const hydrated = buildInitialState(serverState);
      setState(hydrated);
      saveGameState(authSession.teamScopeKey, serverState);
    }).catch(() => {
      // Server unavailable — continue with localStorage data (offline-first).
    });
  }, [authSession?.teamScopeKey]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const syncPendingQueue = useCallback(async () => {
    const scopeKey = authSession?.teamScopeKey;
    if (!scopeKey || !window.navigator.onLine || isSyncingQueue) {
      return false;
    }

    const pending = readQueue(scopeKey);
    if (pending.length === 0) {
      setSyncQueueSize(0);
      return true;
    }

    setIsSyncingQueue(true);
    try {
      await apiClient.sync(pending);
      clearQueue(scopeKey);
      setSyncQueueSize(0);
      return true;
    } catch {
      return false;
    } finally {
      setIsSyncingQueue(false);
    }
  }, [authSession?.teamScopeKey, isSyncingQueue]);

  useEffect(() => {
    const scopeKey = authSession?.teamScopeKey;
    if (!scopeKey || syncQueueSize === 0 || !isOnline) {
      return;
    }

    let cancelled = false;

    const trySync = async () => {
      if (cancelled || !window.navigator.onLine) {
        return;
      }

      await syncPendingQueue();
      if (cancelled) {
        return;
      }
    };

    void trySync();
    const intervalId = window.setInterval(() => {
      void trySync();
    }, 5000);

    window.addEventListener("online", trySync);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("online", trySync);
    };
  }, [authSession?.teamScopeKey, isOnline, syncPendingQueue, syncQueueSize]);

  async function handleSyncNow() {
    if (!window.navigator.onLine) {
      return;
    }

    await syncPendingQueue();
  }

  async function handleGoogleCredential(credential) {
    const nonce = window.sessionStorage.getItem("ulti-box-score-auth-nonce");
    const verification = await apiClient.verifyGoogleIdToken({ credential, nonce });
    const normalizedEmail = String(verification.teamEmail || "").trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("Verification response is missing a team email.");
    }

    const teamScopeKey = await hashSha256Hex(normalizedEmail);
    const nextSession = {
      teamName: String(verification.teamName || "").trim(),
      teamEmail: normalizedEmail,
      teamScopeKey,
      authToken: String(verification.authToken || ""),
      expiresAt: String(verification.expiresAt || ""),
      signedInAt: new Date().toISOString(),
    };

    window.sessionStorage.removeItem("ulti-box-score-auth-nonce");
    saveAuthSession(nextSession);
    setAuthSession(nextSession);
  }

  function handleSignOut() {
    if (window.google?.accounts?.id && authSession?.teamEmail) {
      window.google.accounts.id.revoke(authSession.teamEmail, () => {});
      window.google.accounts.id.disableAutoSelect();
    }

    clearAuthSession();
    setAuthSession(null);
  }

  function startEditingTeamName() {
    setDraftTeamName(authSession?.teamName || "");
    setIsEditingTeamName(true);
  }

  function cancelEditingTeamName() {
    setIsEditingTeamName(false);
    setDraftTeamName("");
  }

  function saveTeamName(event) {
    event.preventDefault();
    const trimmed = draftTeamName.trim();
    if (!trimmed || !authSession) {
      cancelEditingTeamName();
      return;
    }
    const updated = { ...authSession, teamName: trimmed };
    saveAuthSession(updated);
    setAuthSession(updated);
    setIsEditingTeamName(false);
    setDraftTeamName("");
    enqueueAction(authSession?.teamScopeKey, { type: "TEAM_NAME_UPDATED", payload: { teamName: trimmed } });
    setSyncQueueSize(readQueue(authSession?.teamScopeKey).length);
  }

  function updateStateWithQueue(nextState, action) {
    setState(nextState);
    enqueueAction(authSession?.teamScopeKey, action);
    setSyncQueueSize(readQueue(authSession?.teamScopeKey).length);
  }

  function addPlayer(player) {
    const next = {
      ...state,
      players: [...state.players, player],
      lineupMembership: {
        ...state.lineupMembership,
        [player.id]: ["lineup-all"],
      },
    };

    updateStateWithQueue(next, { type: "PLAYER_ADDED", payload: player });
  }

  function updatePlayer(playerId, updates) {
    const next = {
      ...state,
      players: state.players.map((player) =>
        player.id === playerId ? { ...player, ...updates } : player
      ),
    };

    updateStateWithQueue(next, {
      type: "PLAYER_UPDATED",
      payload: { playerId, updates },
    });
  }

  function createLineupGroup(name, playerIds) {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const exists = state.lineupGroups.some(
      (group) => group.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      return;
    }

    const lineupId = createId("lineup");
    const nextMembership = { ...state.lineupMembership };

    for (const player of state.players) {
      const current = Array.isArray(nextMembership[player.id]) ? nextMembership[player.id] : ["lineup-all"];
      if (playerIds.includes(player.id) && !current.includes(lineupId)) {
        nextMembership[player.id] = [...current, lineupId];
      } else {
        nextMembership[player.id] = current;
      }
    }

    const newGroup = { id: lineupId, name: trimmed };
    const next = {
      ...state,
      lineupGroups: [...state.lineupGroups, newGroup],
      lineupMembership: nextMembership,
    };

    updateStateWithQueue(next, {
      type: "LINEUP_GROUP_CREATED",
      payload: { lineupGroup: newGroup, playerIds },
    });
  }

  function createGame(name, opponent) {
    const gameId = createId("game");
    const nextName = name.trim() || `Game ${state.games.length + 1}`;
    const newGame = {
      id: gameId,
      name: nextName,
      opponent: opponent.trim(),
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };

    const next = {
      ...state,
      games: [...state.games, newGame],
      activeGameId: gameId,
      gameDataById: {
        ...state.gameDataById,
        [gameId]: createEmptyGameData(),
      },
    };

    setSelectedLiveEntryLineupIds(["lineup-all"]);
    setSelectedBoxScoreLineupIds(["lineup-all"]);
    updateStateWithQueue(next, { type: "GAME_CREATED", payload: newGame });
  }

  function updateGame(gameId, updates) {
    const nextName = (updates.name || "").trim();
    const next = {
      ...state,
      games: state.games.map((game) =>
        game.id === gameId
          ? {
              ...game,
              name: nextName || game.name,
              opponent: (updates.opponent || "").trim(),
            }
          : game
      ),
    };

    updateStateWithQueue(next, {
      type: "GAME_UPDATED",
      payload: { gameId, updates },
    });
  }

  function toggleGameComplete(gameId) {
    const next = {
      ...state,
      games: state.games.map((game) =>
        game.id === gameId ? { ...game, isCompleted: !game.isCompleted } : game
      ),
    };

    updateStateWithQueue(next, {
      type: "GAME_COMPLETION_TOGGLED",
      payload: { gameId },
    });
  }

  function deleteGame(gameId) {
    if (state.games.length === 1) {
      const replacement = {
        id: "game-1",
        name: "Game 1",
        opponent: "",
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };
      const next = {
        ...state,
        games: [replacement],
        activeGameId: replacement.id,
        gameDataById: {
          [replacement.id]: createEmptyGameData(),
        },
      };
      updateStateWithQueue(next, {
        type: "GAME_DELETED_AND_RESET",
        payload: { deletedGameId: gameId },
      });
      return;
    }

    const remainingGames = state.games.filter((game) => game.id !== gameId);
    const nextActiveGameId =
      state.activeGameId === gameId ? remainingGames[0].id : state.activeGameId;
    const nextGameDataById = { ...state.gameDataById };
    delete nextGameDataById[gameId];

    const next = {
      ...state,
      games: remainingGames,
      activeGameId: nextActiveGameId,
      gameDataById: nextGameDataById,
    };

    updateStateWithQueue(next, {
      type: "GAME_DELETED",
      payload: { gameId },
    });
  }

  function selectGame(gameId) {
    if (!state.games.some((game) => game.id === gameId)) {
      return;
    }

    setSelectedLiveEntryLineupIds(["lineup-all"]);
    setSelectedBoxScoreLineupIds(["lineup-all"]);
    setState((prev) => ({ ...prev, activeGameId: gameId }));
  }

  function updateLineupGroup(lineupId, name, playerIds) {
    if (lineupId === "lineup-all") {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const exists = state.lineupGroups.some(
      (group) => group.id !== lineupId && group.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      return;
    }

    const nextMembership = { ...state.lineupMembership };
    for (const player of state.players) {
      const current = Array.isArray(nextMembership[player.id])
        ? nextMembership[player.id]
        : ["lineup-all"];

      const withoutTarget = current.filter((id) => id !== lineupId);
      nextMembership[player.id] = playerIds.includes(player.id)
        ? [...withoutTarget, lineupId]
        : withoutTarget;
    }

    const next = {
      ...state,
      lineupGroups: state.lineupGroups.map((group) =>
        group.id === lineupId ? { ...group, name: trimmed } : group
      ),
      lineupMembership: nextMembership,
    };

    updateStateWithQueue(next, {
      type: "LINEUP_GROUP_UPDATED",
      payload: { lineupId, name: trimmed, playerIds },
    });
  }

  function toggleLiveEntryLineupFilter(lineupId) {
    setSelectedLiveEntryLineupIds((current) => {
      let nextSelection;
      if (lineupId === "lineup-all") {
        nextSelection = ["lineup-all"];
      } else {
        const withoutAll = current.filter((id) => id !== "lineup-all");
        const isSelected = withoutAll.includes(lineupId);
        const next = isSelected ? withoutAll.filter((id) => id !== lineupId) : [...withoutAll, lineupId];

        nextSelection = next.length === 0 ? ["lineup-all"] : next;
      }

      const filteredPlayerIds = getPlayerIdsForLineups(
        nextSelection,
        state.players,
        state.lineupMembership
      );

      if (activeGameId) {
        setState((prev) => {
          const currentData = prev.gameDataById[activeGameId] || createEmptyGameData();
          return {
            ...prev,
            gameDataById: {
              ...prev.gameDataById,
              [activeGameId]: {
                ...currentData,
                currentOnFieldPlayerIds: filteredPlayerIds.slice(0, 7),
              },
            },
          };
        });
      }

      return nextSelection;
    });
  }

  function toggleBoxScoreLineupFilter(lineupId) {
    setSelectedBoxScoreLineupIds((current) => {
      if (lineupId === "lineup-all") {
        return ["lineup-all"];
      }

      const withoutAll = current.filter((id) => id !== "lineup-all");
      const isSelected = withoutAll.includes(lineupId);
      const next = isSelected ? withoutAll.filter((id) => id !== lineupId) : [...withoutAll, lineupId];

      return next.length === 0 ? ["lineup-all"] : next;
    });
  }

  function toggleOnField(playerId) {
    if (!activeGameId) {
      return;
    }

    const currentOnField = activeGameData.currentOnFieldPlayerIds;
    const alreadyOnField = currentOnField.includes(playerId);
    let nextIds = alreadyOnField
      ? currentOnField.filter((id) => id !== playerId)
      : [...currentOnField, playerId];

    if (nextIds.length > 7) {
      nextIds = nextIds.slice(nextIds.length - 7);
    }

    setState((prev) => {
      const currentData = prev.gameDataById[activeGameId] || createEmptyGameData();
      return {
        ...prev,
        gameDataById: {
          ...prev.gameDataById,
          [activeGameId]: {
            ...currentData,
            currentOnFieldPlayerIds: nextIds,
          },
        },
      };
    });
  }

  function recordStat(playerId, statType) {
    if (!activeGameId || !activeGameData.currentOnFieldPlayerIds.includes(playerId)) {
      return;
    }

    const event = {
      id: createId("evt"),
      pointNumber: activeGameData.pointNumber,
      playerId,
      statType,
      createdAt: new Date().toISOString(),
    };

    const next = {
      ...state,
      gameDataById: {
        ...state.gameDataById,
        [activeGameId]: {
          ...activeGameData,
          statEvents: [...activeGameData.statEvents, event],
        },
      },
    };

    updateStateWithQueue(next, {
      type: "STAT_EVENT_CREATED",
      payload: { ...event, gameId: activeGameId },
    });
  }

  function decrementStat(playerId, statType) {
    if (!activeGameId || !activeGameData.currentOnFieldPlayerIds.includes(playerId)) {
      return;
    }

    let targetIndex = -1;
    for (let i = activeGameData.statEvents.length - 1; i >= 0; i -= 1) {
      const event = activeGameData.statEvents[i];
      if (
        event.playerId === playerId &&
        event.statType === statType &&
        event.pointNumber === activeGameData.pointNumber
      ) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1) {
      return;
    }

    const removedEvent = activeGameData.statEvents[targetIndex];
    const next = {
      ...state,
      gameDataById: {
        ...state.gameDataById,
        [activeGameId]: {
          ...activeGameData,
          statEvents: activeGameData.statEvents.filter((_, idx) => idx !== targetIndex),
        },
      },
    };

    updateStateWithQueue(next, {
      type: "STAT_EVENT_DECREMENTED",
      payload: { eventId: removedEvent.id, playerId, statType },
    });
  }

  function undoLastEvent() {
    if (!activeGameId) {
      return;
    }

    const last = activeGameData.statEvents[activeGameData.statEvents.length - 1];
    if (!last) {
      return;
    }

    const next = {
      ...state,
      gameDataById: {
        ...state.gameDataById,
        [activeGameId]: {
          ...activeGameData,
          statEvents: activeGameData.statEvents.slice(0, -1),
        },
      },
    };

    updateStateWithQueue(next, {
      type: "STAT_EVENT_UNDONE",
      payload: { eventId: last.id },
    });
  }

  function commitPointAndAdvance(didWeScore) {
    if (!activeGameId || activeGameData.currentOnFieldPlayerIds.length === 0) {
      return;
    }

    const nextCounts = { ...activeGameData.playerPointsPlayed };
    for (const playerId of activeGameData.currentOnFieldPlayerIds) {
      nextCounts[playerId] = (nextCounts[playerId] || 0) + 1;
    }

    const pointId = createId("pt");
    const pointCreatedAt = new Date().toISOString();

    const next = {
      ...state,
      gameDataById: {
        ...state.gameDataById,
        [activeGameId]: {
          ...activeGameData,
          playerPointsPlayed: nextCounts,
          pointResults: [
            ...activeGameData.pointResults,
            {
              id: pointId,
              pointNumber: activeGameData.pointNumber,
              didWeScore,
              createdAt: pointCreatedAt,
            },
          ],
          pointNumber: activeGameData.pointNumber + 1,
          currentOnFieldPlayerIds: [],
        },
      },
    };

    updateStateWithQueue(next, {
      type: "POINT_COMMITTED",
      payload: {
        gameId: activeGameId,
        pointId,
        pointNumber: activeGameData.pointNumber,
        didWeScore,
        playerIds: activeGameData.currentOnFieldPlayerIds,
        createdAt: pointCreatedAt,
      },
    });
  }

  function clearHistory() {
    const confirmed = window.confirm(
      "Clear all game history (stats, points played, and current point selections)?"
    );
    if (!confirmed) {
      return;
    }

    const next = {
      ...state,
      gameDataById: {
        ...state.gameDataById,
        [activeGameId]: createEmptyGameData(),
      },
    };

    clearQueue(authSession?.teamScopeKey);
    setSyncQueueSize(0);
    setState(next);
  }

  function clearRoster() {
    const confirmed = window.confirm(
      "Clear roster and lineup setup? This will also clear game history tied to players."
    );
    if (!confirmed) {
      return;
    }

    const next = {
      ...state,
      players: [],
      lineupGroups: DEFAULT_LINEUP_GROUPS,
      lineupMembership: {},
      gameDataById: Object.fromEntries(
        state.games.map((game) => [game.id, createEmptyGameData()])
      ),
    };

    clearQueue(authSession?.teamScopeKey);
    setSyncQueueSize(0);
    setSelectedLiveEntryLineupIds(["lineup-all"]);
    setSelectedBoxScoreLineupIds(["lineup-all"]);
    setState(next);
  }

  if (!authSession?.teamScopeKey) {
    return <SignInPage onGoogleCredential={handleGoogleCredential} />;
  }

  const activeLineupName = selectedBoxScoreLineupIds
    .map((id) => state.lineupGroups.find((lineup) => lineup.id === id)?.name)
    .filter(Boolean)
    .join(" + ");

  const activeGameLabel = activeGame
    ? `${activeGame.name}${activeGame.opponent ? ` vs ${activeGame.opponent}` : ""}${
        activeGame.isCompleted ? " [Completed]" : ""
      }`
    : "No game selected";

  const activeGameScore = useMemo(
    () => buildScoreFromPointResults(activeGameData.pointResults || []),
    [activeGameData.pointResults]
  );

  const pointResultLog = useMemo(() => {
    const score = { us: 0, them: 0 };
    return (activeGameData.pointResults || []).map((result) => {
      if (result.didWeScore) {
        score.us += 1;
      } else {
        score.them += 1;
      }

      return {
        ...result,
        usScore: score.us,
        themScore: score.them,
      };
    });
  }, [activeGameData.pointResults]);

  const gameScoresById = useMemo(() => {
    const scores = {};
    for (const game of state.games) {
      const pointResults = state.gameDataById[game.id]?.pointResults || [];
      scores[game.id] = buildScoreFromPointResults(pointResults);
    }
    return scores;
  }, [state.games, state.gameDataById]);

  const visiblePlayerIds = useMemo(
    () => getPlayerIdsForLineups(selectedBoxScoreLineupIds, state.players, state.lineupMembership),
    [selectedBoxScoreLineupIds, state.players, state.lineupMembership]
  );

  const liveEntryVisiblePlayerIds = useMemo(
    () => getPlayerIdsForLineups(selectedLiveEntryLineupIds, state.players, state.lineupMembership),
    [selectedLiveEntryLineupIds, state.players, state.lineupMembership]
  );

  const liveEntryPlayers = useMemo(
    () => state.players.filter((player) => liveEntryVisiblePlayerIds.includes(player.id)),
    [state.players, liveEntryVisiblePlayerIds]
  );

  useEffect(() => {
    if (!activeGameId) {
      return;
    }

    const allowed = new Set(liveEntryVisiblePlayerIds);
    const currentOnField = activeGameData.currentOnFieldPlayerIds;
    const nextOnField = currentOnField.filter((id) => allowed.has(id));
    if (nextOnField.length !== currentOnField.length) {
      setState((prev) => {
        const currentData = prev.gameDataById[activeGameId] || createEmptyGameData();
        return {
          ...prev,
          gameDataById: {
            ...prev.gameDataById,
            [activeGameId]: {
              ...currentData,
              currentOnFieldPlayerIds: nextOnField,
            },
          },
        };
      });
    }
  }, [activeGameId, activeGameData.currentOnFieldPlayerIds, liveEntryVisiblePlayerIds]);

  const rows = useMemo(
    () =>
      buildBoxScore(
        state.players,
        activeGameData.statEvents,
        activeGameData.playerPointsPlayed,
        visiblePlayerIds
      ),
    [state.players, activeGameData.statEvents, activeGameData.playerPointsPlayed, visiblePlayerIds]
  );

  const liveEntryStatTotals = useMemo(() => {
    const totals = {};
    for (const event of activeGameData.statEvents) {
      const key = `${event.playerId}:${event.statType}`;
      totals[key] = (totals[key] || 0) + 1;
    }
    return totals;
  }, [activeGameData.statEvents]);

  return (
    <main className="layout">
      <header className="app-header">
        <div>
          <h1>Ultimate Frisbee Box Score Prototype</h1>
          {isEditingTeamName ? (
            <form className="team-name-edit-form" onSubmit={saveTeamName}>
              <input
                autoFocus
                value={draftTeamName}
                onChange={(e) => setDraftTeamName(e.target.value)}
                placeholder="Team name"
              />
              <button type="submit">Save</button>
              <button type="button" onClick={cancelEditingTeamName}>Cancel</button>
            </form>
          ) : (
            <p>
              Team: {authSession.teamName || authSession.teamEmail}
              <button type="button" className="inline-edit-trigger" onClick={startEditingTeamName}>Edit</button>
            </p>
          )}
          <p>
            Active Game: {activeGameLabel} | Score {activeGameScore.us}-{activeGameScore.them}
          </p>
        </div>
        <div className="header-actions">
          <div className="sync-pill">
            Pending Sync: {syncQueueSize} {isOnline ? "" : "(Offline)"}
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              void handleSyncNow();
            }}
            disabled={!isOnline || syncQueueSize === 0 || isSyncingQueue}
            title={!isOnline ? "Internet connection required" : "Flush queued actions now"}
          >
            {isSyncingQueue ? "Syncing..." : "Sync Now"}
          </button>
          <button type="button" className="secondary-button" onClick={handleSignOut}>
            Sign Out
          </button>
          <button type="button" className="danger-button" onClick={clearHistory}>
            Clear History
          </button>
        </div>
      </header>

      <section className="panel lineup-tabs">
        <h2>Pages</h2>
        <div className="page-nav">
          <button
            className={activePage === "games" ? "active-page" : ""}
            onClick={() => setActivePage("games")}
          >
            Games
          </button>
          <button
            className={activePage === "roster" ? "active-page" : ""}
            onClick={() => setActivePage("roster")}
          >
            Roster Entry and List
          </button>
          <button
            className={activePage === "live-entry" ? "active-page" : ""}
            onClick={() => setActivePage("live-entry")}
          >
            Live Entry
          </button>
          <button
            className={activePage === "box-score" ? "active-page" : ""}
            onClick={() => setActivePage("box-score")}
          >
            Box Score
          </button>
        </div>
      </section>

      {activePage === "games" ? (
        <GamesPanel
          games={state.games}
          activeGameId={state.activeGameId}
          gameScoresById={gameScoresById}
          onCreateGame={createGame}
          onSelectGame={selectGame}
          onUpdateGame={updateGame}
          onDeleteGame={deleteGame}
          onToggleGameComplete={toggleGameComplete}
        />
      ) : null}

      {activePage === "roster" ? (
        <RosterPanel
          players={state.players}
          lineupGroups={state.lineupGroups}
          lineupMembership={state.lineupMembership}
          onAddPlayer={addPlayer}
          onUpdatePlayer={updatePlayer}
          onCreateLineupGroup={createLineupGroup}
          onUpdateLineupGroup={updateLineupGroup}
          onClearRoster={clearRoster}
        />
      ) : null}

      {activePage === "live-entry" ? (
        <>
          <section className="panel lineup-tabs">
            <h2>Live Entry Filter</h2>
            <div className="tab-row">
              {state.lineupGroups.map((lineup) => (
                <button
                  key={lineup.id}
                  className={selectedLiveEntryLineupIds.includes(lineup.id) ? "active-tab" : ""}
                  onClick={() => toggleLiveEntryLineupFilter(lineup.id)}
                >
                  {lineup.name}
                </button>
              ))}
            </div>
            <p className="help-text">Select one or more lineup groups to filter live entry options.</p>
          </section>

          <OnFieldPanel
            players={liveEntryPlayers}
            onFieldPlayerIds={activeGameData.currentOnFieldPlayerIds}
            onToggleOnField={toggleOnField}
            onRecordStat={recordStat}
            onDecrementStat={decrementStat}
            statTotals={liveEntryStatTotals}
            onUndo={undoLastEvent}
            onCommitPoint={commitPointAndAdvance}
            pointNumber={activeGameData.pointNumber}
            pointResults={pointResultLog}
          />

          <section className="panel">
            <p className="help-text">
              Live entry options are filtered by lineup groups. Select multiple tabs to combine groups.
            </p>
          </section>

        </>
      ) : null}

      {activePage === "box-score" ? (
        <>
          <section className="panel lineup-tabs">
            <h2>Lineup Tabs</h2>
            <div className="tab-row">
              {state.lineupGroups.map((lineup) => (
                <button
                  key={lineup.id}
                  className={selectedBoxScoreLineupIds.includes(lineup.id) ? "active-tab" : ""}
                  onClick={() => toggleBoxScoreLineupFilter(lineup.id)}
                >
                  {lineup.name}
                </button>
              ))}
            </div>
            <p className="help-text">Select one or more lineup groups to combine box score views.</p>
          </section>

          <BoxScoreTable rows={rows} activeLineupName={activeLineupName} />
        </>
      ) : null}
    </main>
  );
}
