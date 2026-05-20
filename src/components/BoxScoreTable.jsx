import React from "react";
export function BoxScoreTable({ rows, activeLineupName, pointResults = [] }) {
  return (
    <>
    <section className="panel">
      <h2 className="key-view-title">Box Score ({activeLineupName})</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>#</th>
              <th>PP</th>
              <th>G</th>
              <th>A</th>
              <th>T</th>
              <th>B</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId}>
                <td>
                  {row.name} <small>({row.matchPlayerType})</small>
                </td>
                <td>{row.jerseyNumber || "--"}</td>
                <td>{row.pointsPlayed}</td>
                <td>{row.Goal}</td>
                <td>{row.Assist}</td>
                <td>{row.Turnover}</td>
                <td>{row.Block}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
    <section className="panel game-log">
      <h3>Game Log</h3>
      {pointResults.length === 0 ? (
        <p className="help-text">No completed points yet. Points appear here as the game progresses.</p>
      ) : (
        <ul className="game-log-list">
          {[...pointResults].reverse().map((result) => (
            <li key={result.id} className="game-log-item">
              <span className={`point-outcome ${result.didWeScore ? "outcome-us" : "outcome-them"}`}>
                {result.didWeScore ? "Our Goal" : "Their Goal"}
              </span>
              <span>Point {result.pointNumber}</span>
              <span className="point-score-visual">
                {result.usScore} – {result.themScore}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  </>
  );
}
