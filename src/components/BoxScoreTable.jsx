export function BoxScoreTable({ rows, activeLineupName }) {
  return (
    <section className="panel">
      <h2>Box Score ({activeLineupName})</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>#</th>
              <th>MP</th>
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
  );
}
