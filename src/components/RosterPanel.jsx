import React, { useState } from "react";
import { createId } from "../utils/id";
import { MATCH_PLAYER_TYPES } from "../models/types";

export function RosterPanel({ players, onAddPlayer }) {
  const [form, setForm] = useState({
    name: "",
    jerseyNumber: "",
    position: "",
    age: "",
    matchPlayerType: "MMP",
  });

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    onAddPlayer({
      id: createId("player"),
      name: form.name.trim(),
      jerseyNumber: form.jerseyNumber.trim(),
      position: form.position.trim(),
      age: form.age ? Number(form.age) : null,
      matchPlayerType: form.matchPlayerType,
    });

    setForm((prev) => ({
      ...prev,
      name: "",
      jerseyNumber: "",
      position: "",
      age: "",
    }));
  }

  return (
    <section className="panel">
      <h2>Roster Entry</h2>
      <form className="roster-form" onSubmit={handleSubmit}>
        <input
          placeholder="Player name"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <input
          placeholder="Jersey #"
          value={form.jerseyNumber}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, jerseyNumber: event.target.value }))
          }
        />
        <input
          placeholder="Position"
          value={form.position}
          onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
        />
        <input
          placeholder="Age"
          type="number"
          min="0"
          value={form.age}
          onChange={(event) => setForm((prev) => ({ ...prev, age: event.target.value }))}
        />
        <select
          value={form.matchPlayerType}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, matchPlayerType: event.target.value }))
          }
        >
          {MATCH_PLAYER_TYPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button type="submit">Add Player</button>
      </form>

      <div className="player-list">
        {players.length === 0 ? <p>No players yet.</p> : null}
        {players.map((player) => (
          <div key={player.id} className="player-chip">
            <strong>{player.name}</strong>
            <span>#{player.jerseyNumber || "--"}</span>
            <span>{player.position || "Unassigned"}</span>
            <span>{player.matchPlayerType}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
