import React from "react";
import { STAT_TYPES } from "../models/types";

export function OnFieldPanel({
  players,
  onFieldPlayerIds,
  onToggleOnField,
  onRecordStat,
  onUndo,
  onCommitPoint,
  pointNumber,
}) {
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
                  <button
                    key={statType}
                    className="stat-button"
                    disabled={!isOnField}
                    onClick={() => onRecordStat(player.id, statType)}
                    title={`Add ${statType} for ${player.name}`}
                  >
                    + {statType}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
