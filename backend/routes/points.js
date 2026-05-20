import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { pool } from "../db/pool.js";

const router = Router({ mergeParams: true });
router.use(requireAuth);

/**
 * POST /api/games/:gameId/points
 * Commits a completed point. Stores the point outcome and which players
 * were on the field (player_points rows give "Points Played" counts).
 *
 * Body: { id, pointNumber, didWeScore, playerIds: string[], createdAt? }
 */
router.post("/", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const { gameId } = req.params;
    const { id, pointNumber, didWeScore, playerIds = [], createdAt } = req.body;

    if (!id || pointNumber == null || didWeScore == null) {
      return res.status(400).json({ error: "id, pointNumber, and didWeScore are required" });
    }

    // Verify the game belongs to this account.
    const gameCheck = await pool.query(
      "SELECT id FROM games WHERE id = $1 AND account_id = $2",
      [gameId, accountId]
    );
    if (!gameCheck.rows[0]) {
      return res.status(404).json({ error: "Game not found." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO points (id, game_id, point_number, did_we_score, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [id, gameId, pointNumber, didWeScore, createdAt || new Date().toISOString()]
      );

      if (playerIds.length > 0) {
        const values = playerIds.map((_, i) => `($1, $${i + 2})`).join(", ");
        await client.query(
          `INSERT INTO player_points (point_id, player_id) VALUES ${values}
           ON CONFLICT DO NOTHING`,
          [id, ...playerIds]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return res.status(201).json({ id, gameId, pointNumber, didWeScore });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
