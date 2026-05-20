import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { pool } from "../db/pool.js";

const router = Router();
router.use(requireAuth);

/**
 * GET /api/players
 * Returns all non-deleted players for the authenticated account.
 */
router.get("/", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const result = await pool.query(
      `SELECT id, name, jersey_number, position, role, age, match_player_type, created_at
       FROM players
       WHERE account_id = $1 AND is_deleted = FALSE
       ORDER BY created_at`,
      [accountId]
    );

    return res.json(result.rows.map(rowToPlayer));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/players
 * Creates a player. The client supplies the id (offline-generated).
 */
router.post("/", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const p = req.body;

    if (!p.id || !p.name) {
      return res.status(400).json({ error: "id and name are required" });
    }

    const result = await pool.query(
      `INSERT INTO players
         (id, account_id, name, jersey_number, position, role, age, match_player_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, name, jersey_number, position, role, age, match_player_type, created_at`,
      [
        p.id,
        accountId,
        p.name,
        p.jerseyNumber || null,
        p.position || null,
        p.role || "Offense",
        p.age ?? null,
        p.matchPlayerType || "MMP",
      ]
    );

    const row = result.rows[0];
    return res.status(row ? 201 : 200).json(row ? rowToPlayer(row) : { id: p.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/players/:id
 * Updates a player's editable fields.
 */
router.put("/:id", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const p = req.body;

    const result = await pool.query(
      `UPDATE players
       SET name = $1, jersey_number = $2, position = $3, role = $4,
           age = $5, match_player_type = $6, updated_at = NOW()
       WHERE id = $7 AND account_id = $8 AND is_deleted = FALSE
       RETURNING id, name, jersey_number, position, role, age, match_player_type, created_at`,
      [
        p.name,
        p.jerseyNumber || null,
        p.position || null,
        p.role || "Offense",
        p.age ?? null,
        p.matchPlayerType || "MMP",
        req.params.id,
        accountId,
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Player not found." });
    }

    return res.json(rowToPlayer(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

function rowToPlayer(row) {
  return {
    id: row.id,
    name: row.name,
    jerseyNumber: row.jersey_number || "",
    position: row.position || "",
    role: row.role || "Offense",
    age: row.age ?? null,
    matchPlayerType: row.match_player_type || "MMP",
    createdAt: row.created_at,
  };
}

export default router;
