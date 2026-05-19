import React, { useState } from "react";

export function GamesPanel({
  games,
  activeGameId,
  gameScoresById,
  onCreateGame,
  onSelectGame,
  onUpdateGame,
  onDeleteGame,
  onToggleGameComplete,
}) {
  const [form, setForm] = useState({ name: "", opponent: "" });
  const [editingGameId, setEditingGameId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", opponent: "" });

  function handleCreate(event) {
    event.preventDefault();
    onCreateGame(form.name, form.opponent);
    setForm({ name: "", opponent: "" });
  }

  function startEdit(game) {
    setEditingGameId(game.id);
    setEditForm({ name: game.name, opponent: game.opponent || "" });
  }

  function cancelEdit() {
    setEditingGameId(null);
    setEditForm({ name: "", opponent: "" });
  }

  function saveEdit(gameId) {
    onUpdateGame(gameId, editForm);
    cancelEdit();
  }

  function deleteGame(gameId) {
    const confirmed = window.confirm("Delete this game? This cannot be undone.");
    if (!confirmed) {
      return;
    }
    onDeleteGame(gameId);
  }

  return (
    <section className="panel">
      <h2>Games</h2>
      <form className="games-form" onSubmit={handleCreate}>
        <input
          placeholder="Game name (optional)"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <input
          placeholder="Opponent (optional)"
          value={form.opponent}
          onChange={(event) => setForm((prev) => ({ ...prev, opponent: event.target.value }))}
        />
        <button type="submit">Create Game</button>
      </form>

      <div className="games-list">
        {games.map((game) => (
          <article key={game.id} className="game-card">
            {editingGameId === game.id ? (
              <div className="games-edit-form">
                <input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Game name"
                />
                <input
                  value={editForm.opponent}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, opponent: event.target.value }))
                  }
                  placeholder="Opponent"
                />
                <div className="games-card-actions">
                  <button type="button" onClick={() => saveEdit(game.id)}>
                    Save
                  </button>
                  <button type="button" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <strong>{game.name}</strong>
                  <p>{game.opponent ? `vs ${game.opponent}` : "No opponent set"}</p>
                  <p className="games-score-line">
                    Score: {(gameScoresById?.[game.id]?.us ?? 0)}-{(gameScoresById?.[game.id]?.them ?? 0)}
                  </p>
                  <p>{game.isCompleted ? "Status: Completed" : "Status: In Progress"}</p>
                </div>
                <div className="games-card-actions">
                  <button
                    type="button"
                    className={game.id === activeGameId ? "active-game-button" : ""}
                    onClick={() => onSelectGame(game.id)}
                  >
                    {game.id === activeGameId ? "Active" : "Open"}
                  </button>
                  <button type="button" onClick={() => startEdit(game)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className={game.isCompleted ? "status-button-reopen" : "status-button-complete"}
                    onClick={() => onToggleGameComplete(game.id)}
                  >
                    {game.isCompleted ? "Reopen" : "Complete"}
                  </button>
                  <button type="button" className="danger-button" onClick={() => deleteGame(game.id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
