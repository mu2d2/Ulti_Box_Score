import React, { useEffect, useMemo, useState } from "react";
import { RosterPanel } from "../components/RosterPanel";
import { OnFieldPanel } from "../components/OnFieldPanel";
import { BoxScoreTable } from "../components/BoxScoreTable";
import { initialState } from "../models/initialState";
import { DEFAULT_LINEUP_GROUPS } from "../models/types";
import { createId } from "../utils/id";
import { buildBoxScore } from "../utils/stats";
import { enqueueAction, readQueue } from "../services/localQueue";
import { loadGameState, saveGameState } from "../services/gameStore";

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

export default function App() {
  const [state, setState] = useState(() => {
    const local = loadGameState();
    if (!local) {
      return {
        ...initialState,
        lineupGroups: DEFAULT_LINEUP_GROUPS,
      };
    }

    return {
      ...initialState,
      ...local,
      players: Array.isArray(local.players) ? local.players : [],
      lineupGroups:
        Array.isArray(local.lineupGroups) && local.lineupGroups.length > 0
          ? local.lineupGroups
          : DEFAULT_LINEUP_GROUPS,
      lineupMembership:
        local.lineupMembership && typeof local.lineupMembership === "object"
          ? local.lineupMembership
          : {},
      currentOnFieldPlayerIds: Array.isArray(local.currentOnFieldPlayerIds)
        ? local.currentOnFieldPlayerIds
        : [],
      playerPointsPlayed:
        local.playerPointsPlayed && typeof local.playerPointsPlayed === "object"
          ? local.playerPointsPlayed
          : {},
      statEvents: Array.isArray(local.statEvents) ? local.statEvents : [],
    };
  });

  const [activeLineupId, setActiveLineupId] = useState("lineup-all");
  const [selectedLiveEntryLineupIds, setSelectedLiveEntryLineupIds] = useState(["lineup-all"]);
  const [activePage, setActivePage] = useState("box-score");
  const [syncQueueSize, setSyncQueueSize] = useState(() => readQueue().length);

  useEffect(() => {
    saveGameState(state);
  }, [state]);

  function updateStateWithQueue(nextState, action) {
    setState(nextState);
    enqueueAction(action);
    setSyncQueueSize(readQueue().length);
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

      setState((prev) => ({
        ...prev,
        currentOnFieldPlayerIds: filteredPlayerIds.slice(0, 7),
      }));

      return nextSelection;
    });
  }

  function toggleOnField(playerId) {
    const alreadyOnField = state.currentOnFieldPlayerIds.includes(playerId);
    let nextIds = alreadyOnField
      ? state.currentOnFieldPlayerIds.filter((id) => id !== playerId)
      : [...state.currentOnFieldPlayerIds, playerId];

    if (nextIds.length > 7) {
      nextIds = nextIds.slice(nextIds.length - 7);
    }

    const next = {
      ...state,
      currentOnFieldPlayerIds: nextIds,
    };

    setState(next);
  }

  function recordStat(playerId, statType) {
    if (!state.currentOnFieldPlayerIds.includes(playerId)) {
      return;
    }

    const event = {
      id: createId("evt"),
      pointNumber: state.game.pointNumber,
      playerId,
      statType,
      createdAt: new Date().toISOString(),
    };

    const next = {
      ...state,
      statEvents: [...state.statEvents, event],
    };

    updateStateWithQueue(next, { type: "STAT_EVENT_CREATED", payload: event });
  }

  function decrementStat(playerId, statType) {
    if (!state.currentOnFieldPlayerIds.includes(playerId)) {
      return;
    }

    let targetIndex = -1;
    for (let i = state.statEvents.length - 1; i >= 0; i -= 1) {
      const event = state.statEvents[i];
      if (event.playerId === playerId && event.statType === statType) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1) {
      return;
    }

    const removedEvent = state.statEvents[targetIndex];
    const next = {
      ...state,
      statEvents: state.statEvents.filter((_, idx) => idx !== targetIndex),
    };

    updateStateWithQueue(next, {
      type: "STAT_EVENT_DECREMENTED",
      payload: { eventId: removedEvent.id, playerId, statType },
    });
  }

  function undoLastEvent() {
    const last = state.statEvents[state.statEvents.length - 1];
    if (!last) {
      return;
    }

    const next = {
      ...state,
      statEvents: state.statEvents.slice(0, -1),
    };

    updateStateWithQueue(next, {
      type: "STAT_EVENT_UNDONE",
      payload: { eventId: last.id },
    });
  }

  function commitPointAndAdvance() {
    if (state.currentOnFieldPlayerIds.length === 0) {
      return;
    }

    const nextCounts = { ...state.playerPointsPlayed };
    for (const playerId of state.currentOnFieldPlayerIds) {
      nextCounts[playerId] = (nextCounts[playerId] || 0) + 1;
    }

    const next = {
      ...state,
      playerPointsPlayed: nextCounts,
      game: {
        ...state.game,
        pointNumber: state.game.pointNumber + 1,
      },
      currentOnFieldPlayerIds: [],
    };

    updateStateWithQueue(next, {
      type: "POINT_COMMITTED",
      payload: { pointNumber: state.game.pointNumber },
    });
  }

  const activeLineupName =
    state.lineupGroups.find((lineup) => lineup.id === activeLineupId)?.name || "All";

  const visiblePlayerIds = useMemo(
    () => getPlayerIdsForLineup(activeLineupId, state.players, state.lineupMembership),
    [activeLineupId, state.players, state.lineupMembership]
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
    const allowed = new Set(liveEntryVisiblePlayerIds);
    const nextOnField = state.currentOnFieldPlayerIds.filter((id) => allowed.has(id));
    if (nextOnField.length !== state.currentOnFieldPlayerIds.length) {
      setState((prev) => ({ ...prev, currentOnFieldPlayerIds: nextOnField }));
    }
  }, [liveEntryVisiblePlayerIds, state.currentOnFieldPlayerIds]);

  const rows = useMemo(
    () => buildBoxScore(state.players, state.statEvents, state.playerPointsPlayed, visiblePlayerIds),
    [state.players, state.statEvents, state.playerPointsPlayed, visiblePlayerIds]
  );

  const liveEntryStatTotals = useMemo(() => {
    const totals = {};
    for (const event of state.statEvents) {
      const key = `${event.playerId}:${event.statType}`;
      totals[key] = (totals[key] || 0) + 1;
    }
    return totals;
  }, [state.statEvents]);

  return (
    <main className="layout">
      <header className="app-header">
        <div>
          <h1>Ultimate Frisbee Box Score Prototype</h1>
          <p>Hello World test: app shell loaded.</p>
        </div>
        <div className="sync-pill">Pending Sync: {syncQueueSize}</div>
      </header>

      <section className="panel lineup-tabs">
        <h2>Pages</h2>
        <div className="page-nav">
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

      {activePage === "roster" ? (
        <RosterPanel
          players={state.players}
          lineupGroups={state.lineupGroups}
          lineupMembership={state.lineupMembership}
          onAddPlayer={addPlayer}
          onUpdatePlayer={updatePlayer}
          onCreateLineupGroup={createLineupGroup}
          onUpdateLineupGroup={updateLineupGroup}
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
            onFieldPlayerIds={state.currentOnFieldPlayerIds}
            onToggleOnField={toggleOnField}
            onRecordStat={recordStat}
            onDecrementStat={decrementStat}
            statTotals={liveEntryStatTotals}
            onUndo={undoLastEvent}
            onCommitPoint={commitPointAndAdvance}
            pointNumber={state.game.pointNumber}
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
                  className={lineup.id === activeLineupId ? "active-tab" : ""}
                  onClick={() => setActiveLineupId(lineup.id)}
                >
                  {lineup.name}
                </button>
              ))}
            </div>
          </section>

          <BoxScoreTable rows={rows} activeLineupName={activeLineupName} />
        </>
      ) : null}
    </main>
  );
}
