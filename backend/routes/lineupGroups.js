import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { pool } from "../db/pool.js";

const router = Router();
router.use(requireAuth);

/**
 * GET /api/lineup-groups
 * Returns all lineup groups with their member player IDs.
 */
router.get("/", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;

    const groups = await pool.query(
      `SELECT id, name FROM lineup_groups WHERE account_id = $1 ORDER BY created_at`,
      [accountId]
    );
    const members = await pool.query(
      `SELECT lgm.lineup_group_id, lgm.player_id
       FROM lineup_group_members lgm
       JOIN lineup_groups lg ON lg.id = lgm.lineup_group_id
       WHERE lg.account_id = $1`,
      [accountId]
    );

    const membersByGroup = {};
    for (const m of members.rows) {
      if (!membersByGroup[m.lineup_group_id]) {
        membersByGroup[m.lineup_group_id] = [];
      }
      membersByGroup[m.lineup_group_id].push(m.player_id);
    }

    return res.json(
      groups.rows.map((g) => ({
        id: g.id,
        name: g.name,
        playerIds: membersByGroup[g.id] || [],
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/lineup-groups
 * Creates a lineup group and assigns initial members.
 */
router.post("/", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const { id, name, playerIds = [] } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: "id and name are required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO lineup_groups (id, account_id, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [id, accountId, name]
      );

      if (playerIds.length > 0) {
        const values = playerIds.map((_, i) => `($1, $${i + 2})`).join(", ");
        await client.query(
          `INSERT INTO lineup_group_members (lineup_group_id, player_id) VALUES ${values}
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

    return res.status(201).json({ id, name, playerIds });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/lineup-groups/:id
 * Renames a lineup group and replaces its member list.
 */
router.put("/:id", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const { name, playerIds = [] } = req.body;
    const lineupId = req.params.id;

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const updated = await client.query(
        `UPDATE lineup_groups
         SET name = $1, updated_at = NOW()
         WHERE id = $2 AND account_id = $3
         RETURNING id`,
        [name, lineupId, accountId]
      );

      if (!updated.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Lineup group not found." });
      }

      await client.query(
        "DELETE FROM lineup_group_members WHERE lineup_group_id = $1",
        [lineupId]
      );

      if (playerIds.length > 0) {
        const values = playerIds.map((_, i) => `($1, $${i + 2})`).join(", ");
        await client.query(
          `INSERT INTO lineup_group_members (lineup_group_id, player_id) VALUES ${values}
           ON CONFLICT DO NOTHING`,
          [lineupId, ...playerIds]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return res.json({ id: lineupId, name, playerIds });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
