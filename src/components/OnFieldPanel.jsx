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
          <button type="button" onClick={onUndo}>Undo Last Event</button>
          <button
            type="button"
            onClick={() => onCommitPoint(true)}
            disabled={onFieldPlayerIds.length !== 7}
            title={onFieldPlayerIds.length !== 7 ? `Select exactly 7 players (${onFieldPlayerIds.length}/7 selected)` : "Commit point as our goal"}
          >
            Point Won (Goal)
          </button>
          <button
            type="button"
            onClick={() => onCommitPoint(false)}
            disabled={onFieldPlayerIds.length !== 7}
            title={onFieldPlayerIds.length !== 7 ? `Select exactly 7 players (${onFieldPlayerIds.length}/7 selected)` : "Commit point as opponent goal"}
          >
            Point Lost
          </button>
        </div>
      </div>

      <div className="on-field-status">
        <span className={`on-field-count ${onFieldPlayerIds.length === 7 ? "on-field-count-ready" : "on-field-count-pending"}`}>
          {onFieldPlayerIds.length}/7 players selected
          {onFieldPlayerIds.length === 7 ? " — ready to end point!" : ""}
        </span>
        <p className="help-text">
          Ultimate Frisbee is played 7-on-7, so the app requires exactly 7 players before you can
          end a point. Select the full line on the field first, then record stats and finish the
          point so points played and box score totals stay accurate.
        </p>
      </div>

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
