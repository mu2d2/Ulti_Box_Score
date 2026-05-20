import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { pool } from "../db/pool.js";

const router = Router();
router.use(requireAuth);

/**
 * GET /api/games
 * Returns all games for the authenticated account.
 */
router.get("/", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const result = await pool.query(
      `SELECT id, name, opponent, is_completed, created_at
       FROM games
       WHERE account_id = $1
       ORDER BY created_at`,
      [accountId]
    );
    return res.json(result.rows.map(rowToGame));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/games
 * Creates a game. The client supplies the id (offline-generated).
 */
router.post("/", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const { id, name, opponent } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: "id and name are required" });
    }

    const result = await pool.query(
      `INSERT INTO games (id, account_id, name, opponent)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, name, opponent, is_completed, created_at`,
      [id, accountId, name, opponent || null]
    );

    const row = result.rows[0];
    return res.status(row ? 201 : 200).json(row ? rowToGame(row) : { id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/games/:id
 * Updates a game's name, opponent, or completion status.
 */
router.put("/:id", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const { name, opponent, isCompleted } = req.body;

    const result = await pool.query(
      `UPDATE games
       SET name         = COALESCE($1, name),
           opponent     = COALESCE($2, opponent),
           is_completed = COALESCE($3, is_completed),
           updated_at   = NOW()
       WHERE id = $4 AND account_id = $5
       RETURNING id, name, opponent, is_completed, created_at`,
      [name || null, opponent ?? null, isCompleted ?? null, req.params.id, accountId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Game not found." });
    }

    return res.json(rowToGame(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/games/:id
 * Deletes a game and all its associated data (cascade).
 */
router.delete("/:id", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;

    const result = await pool.query(
      "DELETE FROM games WHERE id = $1 AND account_id = $2 RETURNING id",
      [req.params.id, accountId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Game not found." });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/games/:id/toggle-complete
 * Flips the is_completed flag.
 */
router.post("/:id/toggle-complete", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;

    const result = await pool.query(
      `UPDATE games
       SET is_completed = NOT is_completed, updated_at = NOW()
       WHERE id = $1 AND account_id = $2
       RETURNING id, name, opponent, is_completed, created_at`,
      [req.params.id, accountId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Game not found." });
    }

    return res.json(rowToGame(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

function rowToGame(row) {
  return {
    id: row.id,
    name: row.name,
    opponent: row.opponent || "",
    isCompleted: row.is_completed,
    createdAt: row.created_at,
  };
}

export default router;
