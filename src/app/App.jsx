import { useEffect, useMemo, useState } from "react";
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
    .filter(([, memberships]) => memberships.includes(lineupId))
    .map(([playerId]) => playerId);
}

export default function App() {
  const [state, setState] = useState(() => {
    const local = loadGameState();
    if (local) {
      return local;
    }

    return {
      ...initialState,
      lineupGroups: DEFAULT_LINEUP_GROUPS,
    };
  });

  const [activeLineupId, setActiveLineupId] = useState("lineup-all");
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

  const rows = useMemo(
    () => buildBoxScore(state.players, state.statEvents, state.playerPointsPlayed, visiblePlayerIds),
    [state.players, state.statEvents, state.playerPointsPlayed, visiblePlayerIds]
  );

  return (
    <main className="layout">
      <header className="app-header">
        <h1>Ultimate Frisbee Box Score Prototype</h1>
        <div className="sync-pill">Pending Sync: {syncQueueSize}</div>
      </header>

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

      <OnFieldPanel
        players={state.players}
        onFieldPlayerIds={state.currentOnFieldPlayerIds}
        onToggleOnField={toggleOnField}
        onRecordStat={recordStat}
        onUndo={undoLastEvent}
        onCommitPoint={commitPointAndAdvance}
        pointNumber={state.game.pointNumber}
      />

      <BoxScoreTable rows={rows} activeLineupName={activeLineupName} />

      <RosterPanel players={state.players} onAddPlayer={addPlayer} />
    </main>
  );
}
