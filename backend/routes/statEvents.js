import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { pool } from "../db/pool.js";

const router = Router({ mergeParams: true });
router.use(requireAuth);

/**
 * GET /api/games/:gameId/stat-events
 * Returns all stat events for a game.
 */
router.get("/", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const { gameId } = req.params;

    const gameCheck = await pool.query(
      "SELECT id FROM games WHERE id = $1 AND account_id = $2",
      [gameId, accountId]
    );
    if (!gameCheck.rows[0]) {
      return res.status(404).json({ error: "Game not found." });
    }

    const result = await pool.query(
      `SELECT id, game_id, point_number, player_id, stat_type, created_at
       FROM stat_events
       WHERE game_id = $1
       ORDER BY created_at`,
      [gameId]
    );

    return res.json(result.rows.map(rowToEvent));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/games/:gameId/stat-events
 * Records a single stat event.
 *
 * Body: { id, pointNumber, playerId, statType, createdAt? }
 */
router.post("/", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const { gameId } = req.params;
    const { id, pointNumber, playerId, statType, createdAt } = req.body;

    if (!id || pointNumber == null || !playerId || !statType) {
      return res.status(400).json({ error: "id, pointNumber, playerId, and statType are required" });
    }

    const gameCheck = await pool.query(
      "SELECT id FROM games WHERE id = $1 AND account_id = $2",
      [gameId, accountId]
    );
    if (!gameCheck.rows[0]) {
      return res.status(404).json({ error: "Game not found." });
    }

    const result = await pool.query(
      `INSERT INTO stat_events (id, game_id, point_number, player_id, stat_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, game_id, point_number, player_id, stat_type, created_at`,
      [id, gameId, pointNumber, playerId, statType, createdAt || new Date().toISOString()]
    );

    const row = result.rows[0];
    return res.status(201).json(row ? rowToEvent(row) : { id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/stat-events/:id
 * Removes a single stat event (undo).
 */
export async function deleteStatEvent(req, res) {
  try {
    const { accountId } = req.tokenPayload;

    const result = await pool.query(
      `DELETE FROM stat_events
       WHERE id = $1
         AND game_id IN (SELECT id FROM games WHERE account_id = $2)
       RETURNING id`,
      [req.params.id, accountId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Stat event not found." });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function rowToEvent(row) {
  return {
    id: row.id,
    gameId: row.game_id,
    pointNumber: row.point_number,
    playerId: row.player_id,
    statType: row.stat_type,
    createdAt: row.created_at,
  };
}

export default router;
