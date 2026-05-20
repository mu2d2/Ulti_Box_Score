import React, { useState } from "react";
import { createId } from "../utils/id";
import { MATCH_PLAYER_TYPES, POSITIONS, ROLES } from "../models/types";

export function RosterPanel({
  players,
  lineupGroups,
  lineupMembership,
  onAddPlayer,
  onUpdatePlayer,
  onCreateLineupGroup,
  onUpdateLineupGroup,
  onClearRoster,
  onRemovePlayer,
  onClearLineups,
}) {
  const [form, setForm] = useState({
    name: "",
    jerseyNumber: "",
    position: "",
    role: "Offense",
    age: "",
    matchPlayerType: "MMP",
  });
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    jerseyNumber: "",
    position: "",
    role: "Offense",
    age: "",
    matchPlayerType: "MMP",
  });
  const [lineupName, setLineupName] = useState("");
  const [selectedLineupPlayers, setSelectedLineupPlayers] = useState([]);
  const [editingLineupId, setEditingLineupId] = useState(null);
  const [lineupEditName, setLineupEditName] = useState("");
  const [lineupEditPlayers, setLineupEditPlayers] = useState([]);
  const [expandedLineupGroups, setExpandedLineupGroups] = useState({});

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
      role: form.role,
      age: form.age ? Number(form.age) : null,
      matchPlayerType: form.matchPlayerType,
    });

    setForm((prev) => ({
      ...prev,
      name: "",
      jerseyNumber: "",
      position: "",
      role: "Offense",
      age: "",
    }));
  }

  function startEditing(player) {
    setEditingPlayerId(player.id);
    setEditForm({
      name: player.name || "",
      jerseyNumber: player.jerseyNumber || "",
      position: player.position || "",
      role: player.role || "Offense",
      age: player.age ?? "",
      matchPlayerType: player.matchPlayerType || "MMP",
    });
  }

  function cancelEditing() {
    setEditingPlayerId(null);
  }

  function savePlayerEdits(playerId) {
    if (!editForm.name.trim()) {
      return;
    }

    onUpdatePlayer(playerId, {
      name: editForm.name.trim(),
      jerseyNumber: editForm.jerseyNumber.trim(),
      position: editForm.position,
      role: editForm.role,
      age: editForm.age === "" ? null : Number(editForm.age),
      matchPlayerType: editForm.matchPlayerType,
    });

    setEditingPlayerId(null);
  }

  function toggleLineupPlayer(playerId) {
    setSelectedLineupPlayers((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }
      return [...current, playerId];
    });
  }

  function createLineup(event) {
    event.preventDefault();
    if (!lineupName.trim()) {
      return;
    }

    onCreateLineupGroup(lineupName, selectedLineupPlayers);
    setLineupName("");
    setSelectedLineupPlayers([]);
  }

  function getLineupMembers(lineupId) {
    return players
      .filter((player) => {
        const memberships = lineupMembership[player.id] || [];
        return memberships.includes(lineupId);
      })
      .map((player) => player.id);
  }

  function startLineupEditing(group) {
    if (group.id === "lineup-all") {
      return;
    }

    setEditingLineupId(group.id);
    setLineupEditName(group.name);
    setLineupEditPlayers(getLineupMembers(group.id));
  }

  function cancelLineupEditing() {
    setEditingLineupId(null);
    setLineupEditName("");
    setLineupEditPlayers([]);
  }

  function toggleLineupEditPlayer(playerId) {
    setLineupEditPlayers((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }
      return [...current, playerId];
    });
  }

  function saveLineupEdits(lineupId) {
    if (!lineupEditName.trim()) {
      return;
    }

    onUpdateLineupGroup(lineupId, lineupEditName, lineupEditPlayers);
    cancelLineupEditing();
  }

  const orderedLineupGroups = [...lineupGroups].sort((a, b) => {
    if (a.id === "lineup-all") {
      return 1;
    }
    if (b.id === "lineup-all") {
      return -1;
    }
    return a.name.localeCompare(b.name);
  });

  function toggleLineupMembersExpanded(lineupId) {
    setExpandedLineupGroups((prev) => ({
      ...prev,
      [lineupId]: !prev[lineupId],
    }));
  }

  return (
    <section className="panel">
      <div className="panel-title-row">
        <div>
          <h2>Roster Entry</h2>
          <p className="help-text roster-required-note">
            Required fields: name, position, offense/defense role, and matching-player type.
          </p>
        </div>
        <button type="button" className="danger-button" onClick={onClearRoster}>
          Clear Roster
        </button>
      </div>
      <form className="roster-form" onSubmit={handleSubmit}>
        <label className="required-field">
          <span>Name <span className="required-star">*</span></span>
          <input
            placeholder="Player name"
            value={form.name}
            required
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </label>
        <input
          className="roster-aux-field"
          placeholder="Jersey #"
          value={form.jerseyNumber}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, jerseyNumber: event.target.value }))
          }
        />
        <label className="required-field">
          <span>Position <span className="required-star">*</span></span>
          <select
            value={form.position}
            required
            onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
          >
            <option value="">Select Position</option>
            {POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </label>
        <label className="required-field">
          <span>Offense / Defense <span className="required-star">*</span></span>
          <select
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <input
          className="roster-aux-field"
          placeholder="Age"
          type="number"
          min="0"
          value={form.age}
          onChange={(event) => setForm((prev) => ({ ...prev, age: event.target.value }))}
        />
        <label className="required-field">
          <span>Player Type <span className="required-star">*</span></span>
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
        </label>
        <button type="submit" className="roster-submit-button">
          Add Player
        </button>
      </form>

      <div className="player-list">
        {players.length === 0 ? <p>No players yet.</p> : null}
        {players.map((player) => (
          <div key={player.id} className="player-chip">
            {editingPlayerId === player.id ? (
              <>
                <input
                  className="inline-edit-input"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
                <input
                  className="inline-edit-input"
                  value={editForm.jerseyNumber}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, jerseyNumber: event.target.value }))
                  }
                  placeholder="Jersey #"
                />
                <select
                  className="inline-edit-input"
                  value={editForm.position}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, position: event.target.value }))
                  }
                >
                  <option value="">Select Position</option>
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
                <select
                  className="inline-edit-input"
                  value={editForm.role}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, role: event.target.value }))
                  }
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <input
                  className="inline-edit-input"
                  type="number"
                  min="0"
                  value={editForm.age}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, age: event.target.value }))
                  }
                  placeholder="Age"
                />
                <select
                  className="inline-edit-input"
                  value={editForm.matchPlayerType}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, matchPlayerType: event.target.value }))
                  }
                >
                  {MATCH_PLAYER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <div className="inline-edit-actions">
                  <button type="button" onClick={() => savePlayerEdits(player.id)}>
                    Save
                  </button>
                  <button type="button" onClick={cancelEditing}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <strong>{player.name}</strong>
                <span>#{player.jerseyNumber || "--"}</span>
                <span>{player.position || "Unassigned"}</span>
                <span>{player.role}</span>
                <span>{player.matchPlayerType}</span>
                <div className="player-chip-actions">
                  <button type="button" onClick={() => startEditing(player)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => {
                      if (window.confirm(`Remove ${player.name} from the roster?`)) {
                        onRemovePlayer(player.id);
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <section className="lineup-builder">
        <div className="panel-title-row">
          <h3>Create Lineup Group</h3>
          <button type="button" className="danger-button" onClick={onClearLineups}>
            Clear Lineups
          </button>
        </div>
        <form className="lineup-form" onSubmit={createLineup}>
          <input
            placeholder="Lineup name (Alpha, Beta, etc.)"
            value={lineupName}
            onChange={(event) => setLineupName(event.target.value)}
          />
          <button type="submit">Create Lineup Tab</button>
        </form>
        <p className="help-text">You can create a lineup tab before selecting any players.</p>

        <div className="lineup-player-picks">
          {players.map((player) => {
            const checked = selectedLineupPlayers.includes(player.id);
            return (
              <label key={player.id} className="lineup-player-option">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleLineupPlayer(player.id)}
                />
                <span>
                  {player.name} #{player.jerseyNumber || "--"}
                </span>
              </label>
            );
          })}
        </div>

        <div className="lineup-existing-list">
          <strong>Current Tabs:</strong>
          <div className="lineup-group-list">
            {orderedLineupGroups.map((group) => {
              const members = getLineupMembers(group.id);
              const isEditing = editingLineupId === group.id;
              const memberLabels = players
                .filter((player) => members.includes(player.id))
                .map((player) => `${player.name} #${player.jerseyNumber || "--"}`);
              const isExpanded = Boolean(expandedLineupGroups[group.id]);
              const visibleMemberLabels = isExpanded ? memberLabels : memberLabels.slice(0, 3);

              return (
                <article key={group.id} className="lineup-group-card">
                  {isEditing ? (
                    <>
                      <input
                        className="inline-edit-input"
                        value={lineupEditName}
                        onChange={(event) => setLineupEditName(event.target.value)}
                      />
                      <div className="lineup-player-picks">
                        {players.map((player) => (
                          <label key={`${group.id}-${player.id}`} className="lineup-player-option">
                            <input
                              type="checkbox"
                              checked={lineupEditPlayers.includes(player.id)}
                              onChange={() => toggleLineupEditPlayer(player.id)}
                            />
                            <span>
                              {player.name} #{player.jerseyNumber || "--"}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="inline-edit-actions">
                        <button type="button" onClick={() => saveLineupEdits(group.id)}>
                          Save Group
                        </button>
                        <button type="button" onClick={cancelLineupEditing}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="lineup-group-header">
                        <strong>{group.name}</strong>
                        <span>{members.length} players</span>
                      </div>
                      <div className="lineup-group-members">
                        <span className="lineup-group-members-label">Members:</span>
                        <span>
                          {members.length === 0 ? "No players assigned" : visibleMemberLabels.join(", ")}
                        </span>
                        {memberLabels.length > 3 ? (
                          <button
                            type="button"
                            className="lineup-group-toggle-button"
                            onClick={() => toggleLineupMembersExpanded(group.id)}
                          >
                            {isExpanded ? "Show less" : `Show all (${memberLabels.length})`}
                          </button>
                        ) : null}
                      </div>
                      {group.id !== "lineup-all" ? (
                        <button
                          type="button"
                          className="lineup-group-edit-button"
                          onClick={() => startLineupEditing(group)}
                        >
                          Edit Group
                        </button>
                      ) : (
                        <span>Core group</span>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </section>
  );
}
