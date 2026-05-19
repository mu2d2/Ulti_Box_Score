import React, { useEffect, useRef, useState } from "react";
import { STAT_TYPES } from "../models/types";

export function OnFieldPanel({
  players,
  onFieldPlayerIds,
  onToggleOnField,
  onRecordStat,
  onDecrementStat,
  statTotals,
  onUndo,
  onCommitPoint,
  pointNumber,
}) {
  const [pressedButtons, setPressedButtons] = useState({});
  const timeoutRef = useRef({});

  useEffect(() => {
    return () => {
      for (const timeoutId of Object.values(timeoutRef.current)) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  function triggerButtonFeedback(playerId, statType, mode) {
    const key = `${playerId}:${statType}:${mode}`;

    if (timeoutRef.current[key]) {
      clearTimeout(timeoutRef.current[key]);
    }

    setPressedButtons((prev) => ({ ...prev, [key]: true }));
    timeoutRef.current[key] = setTimeout(() => {
      setPressedButtons((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      delete timeoutRef.current[key];
    }, 220);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Live Entry: Point {pointNumber}</h2>
        <div className="inline-actions">
          <button onClick={onUndo}>Undo Last Event</button>
          <button onClick={onCommitPoint}>End Point / Next</button>
        </div>
      </div>

      <p className="help-text">Select exactly 7 players on-field, then tap a stat button.</p>

      {players.length === 0 ? (
        <p className="help-text">No players in this lineup group. Choose another filter or add players to the group.</p>
      ) : null}

      <div className="on-field-grid">
        {players.map((player) => {
          const isOnField = onFieldPlayerIds.includes(player.id);

          return (
            <article key={player.id} className={`live-card ${isOnField ? "active" : ""}`}>
              <label className="live-card-header">
                <input
                  type="checkbox"
                  checked={isOnField}
                  onChange={() => onToggleOnField(player.id)}
                />
                <span>
                  {player.name} #{player.jerseyNumber || "--"} ({player.matchPlayerType})
                </span>
              </label>

              <div className="stat-button-grid">
                {STAT_TYPES.map((statType) => (
                  <div key={statType} className="stat-adjust-row">
                    {(() => {
                      const totalKey = `${player.id}:${statType}`;
                      const total = statTotals?.[totalKey] || 0;
                      return (
                    <button
                      className={`stat-button ${pressedButtons[`${player.id}:${statType}:inc`] ? "stat-button-pressed" : ""}`}
                      disabled={!isOnField}
                      onClick={() => {
                        triggerButtonFeedback(player.id, statType, "inc");
                        onRecordStat(player.id, statType);
                      }}
                      title={`Add ${statType} for ${player.name}`}
                    >
                      + {statType} ({total})
                    </button>
                      );
                    })()}
                    <button
                      className={`stat-button stat-button-decrement ${pressedButtons[`${player.id}:${statType}:dec`] ? "stat-button-decrement-pressed" : ""}`}
                      disabled={!isOnField}
                      onClick={() => {
                        triggerButtonFeedback(player.id, statType, "dec");
                        onDecrementStat(player.id, statType);
                      }}
                      title={`Subtract ${statType} for ${player.name}`}
                    >
                      -
                    </button>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
