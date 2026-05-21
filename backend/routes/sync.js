import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { pool } from "../db/pool.js";

const router = Router();
router.use(requireAuth);

/**
 * POST /api/sync
 * Replays a batch of offline-queued actions against the database.
 * All actions for an account are processed inside a single transaction;
 * unknown action types are silently skipped so old clients stay compatible.
 *
 * Body: { actions: Array<{ type, payload, queuedAt }> }
 * Response: { applied: number, skipped: number }
 */
router.post("/", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const actions = Array.isArray(req.body?.actions) ? req.body.actions : [];

    if (actions.length === 0) {
      return res.json({ applied: 0, skipped: 0 });
    }

    const client = await pool.connect();
    let applied = 0;
    let skipped = 0;

    try {
      await client.query("BEGIN");

      for (const action of actions) {
        const { type, payload } = action;

        try {
          await client.query("SAVEPOINT action_sp");

          switch (type) {
          case "PLAYER_ADDED": {
            const p = payload;
            await client.query(
              `INSERT INTO players
                 (id, account_id, name, jersey_number, position, role, age, match_player_type)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO NOTHING`,
              [
                p.id, accountId, p.name,
                p.jerseyNumber || null, p.position || null,
                p.role || "Offense", p.age ?? null,
                p.matchPlayerType || "MMP",
              ]
            );
            applied++;
            break;
          }

          case "PLAYER_UPDATED": {
            const { playerId, updates: u } = payload;
            await client.query(
              `UPDATE players
               SET name = $1, jersey_number = $2, position = $3, role = $4,
                   age = $5, match_player_type = $6, updated_at = NOW()
               WHERE id = $7 AND account_id = $8`,
              [
                u.name, u.jerseyNumber || null, u.position || null,
                u.role || "Offense", u.age ?? null,
                u.matchPlayerType || "MMP",
                playerId, accountId,
              ]
            );
            applied++;
            break;
          }

          case "LINEUP_GROUP_CREATED": {
            const { lineupGroup, playerIds = [] } = payload;
            await client.query(
              `INSERT INTO lineup_groups (id, account_id, name)
               VALUES ($1, $2, $3)
               ON CONFLICT (id) DO NOTHING`,
              [lineupGroup.id, accountId, lineupGroup.name]
            );
            if (playerIds.length > 0) {
              const values = playerIds.map((_, i) => `($1, $${i + 2})`).join(", ");
              await client.query(
                `INSERT INTO lineup_group_members (lineup_group_id, player_id) VALUES ${values}
                 ON CONFLICT DO NOTHING`,
                [lineupGroup.id, ...playerIds]
              );
            }
            applied++;
            break;
          }

          case "LINEUP_GROUP_UPDATED": {
            const { lineupId, name, playerIds = [] } = payload;
            await client.query(
              `UPDATE lineup_groups SET name = $1, updated_at = NOW()
               WHERE id = $2 AND account_id = $3`,
              [name, lineupId, accountId]
            );
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
            applied++;
            break;
          }

          case "GAME_CREATED": {
            const g = payload;
            await client.query(
              `INSERT INTO games (id, account_id, name, opponent, created_at)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (id) DO NOTHING`,
              [g.id, accountId, g.name, g.opponent || null, g.createdAt || new Date().toISOString()]
            );
            applied++;
            break;
          }

          case "GAME_UPDATED": {
            const { gameId, updates: u } = payload;
            await client.query(
              `UPDATE games SET name = $1, opponent = $2, updated_at = NOW()
               WHERE id = $3 AND account_id = $4`,
              [u.name || null, u.opponent ?? null, gameId, accountId]
            );
            applied++;
            break;
          }

          case "GAME_DELETED": {
            await client.query(
              "DELETE FROM games WHERE id = $1 AND account_id = $2",
              [payload.gameId, accountId]
            );
            applied++;
            break;
          }

          case "GAME_DELETED_AND_RESET": {
            // Delete the old game then create the replacement (game-1 reset).
            await client.query(
              "DELETE FROM games WHERE id = $1 AND account_id = $2",
              [payload.deletedGameId, accountId]
            );
            applied++;
            break;
          }

          case "GAME_COMPLETION_TOGGLED": {
            await client.query(
              `UPDATE games SET is_completed = NOT is_completed, updated_at = NOW()
               WHERE id = $1 AND account_id = $2`,
              [payload.gameId, accountId]
            );
            applied++;
            break;
          }

          case "STAT_EVENT_CREATED": {
            const e = payload;
            if (!e?.gameId || !e?.playerId || !e?.pointNumber || !e?.statType) {
              skipped++;
              break;
            }
            await client.query(
              `INSERT INTO stat_events (id, game_id, point_number, player_id, stat_type, created_at)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (id) DO NOTHING`,
              [e.id, e.gameId, e.pointNumber, e.playerId, e.statType, e.createdAt || new Date().toISOString()]
            );
            applied++;
            break;
          }

          case "STAT_EVENT_DECREMENTED":
          case "STAT_EVENT_UNDONE": {
            await client.query(
              `DELETE FROM stat_events
               WHERE id = $1
                 AND game_id IN (SELECT id FROM games WHERE account_id = $2)`,
              [payload.eventId, accountId]
            );
            applied++;
            break;
          }

          case "POINT_COMMITTED": {
            const { gameId, pointNumber, didWeScore, playerIds = [], pointId, createdAt } = payload;
            if (!gameId || !pointNumber) {
              skipped++;
              break;
            }
            // pointId may be absent in older queue entries — use a deterministic fallback.
            const resolvedPointId = pointId || `pt-${gameId}-${pointNumber}`;

            await client.query(
              `INSERT INTO points (id, game_id, point_number, did_we_score, created_at)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (game_id, point_number) DO NOTHING`,
              [resolvedPointId, gameId, pointNumber, didWeScore, createdAt || new Date().toISOString()]
            );
            if (playerIds.length > 0) {
              const values = playerIds.map((_, i) => `($1, $${i + 2})`).join(", ");
              await client.query(
                `INSERT INTO player_points (point_id, player_id) VALUES ${values}
                 ON CONFLICT DO NOTHING`,
                [resolvedPointId, ...playerIds]
              );
            }
            applied++;
            break;
          }

          case "PLAYER_DELETED": {
            await client.query(
              `UPDATE players SET is_deleted = TRUE, updated_at = NOW()
               WHERE id = $1 AND account_id = $2`,
              [payload.playerId, accountId]
            );
            applied++;
            break;
          }

          case "LINEUPS_CLEARED": {
            // Remove all non-built-in lineup groups and their memberships.
            await client.query(
              `DELETE FROM lineup_group_members
               WHERE lineup_group_id IN (
                 SELECT id FROM lineup_groups
                 WHERE account_id = $1 AND id NOT IN ('lineup-all', 'lineup-o', 'lineup-d')
               )`,
              [accountId]
            );
            await client.query(
              `DELETE FROM lineup_groups
               WHERE account_id = $1 AND id NOT IN ('lineup-all', 'lineup-o', 'lineup-d')`,
              [accountId]
            );
            applied++;
            break;
          }

          case "ROSTER_CLEARED": {
            await client.query(
              `DELETE FROM stat_events
               WHERE game_id IN (SELECT id FROM games WHERE account_id = $1)`,
              [accountId]
            );
            await client.query(
              `DELETE FROM player_points
               WHERE point_id IN (
                 SELECT id FROM points WHERE game_id IN (SELECT id FROM games WHERE account_id = $1)
               )`,
              [accountId]
            );
            await client.query(
              `DELETE FROM points WHERE game_id IN (SELECT id FROM games WHERE account_id = $1)`,
              [accountId]
            );
            await client.query(`DELETE FROM games WHERE account_id = $1`, [accountId]);
            await client.query(
              `DELETE FROM lineup_group_members
               WHERE lineup_group_id IN (SELECT id FROM lineup_groups WHERE account_id = $1)`,
              [accountId]
            );
            await client.query(`DELETE FROM lineup_groups WHERE account_id = $1`, [accountId]);
            await client.query(`DELETE FROM players WHERE account_id = $1`, [accountId]);
            applied++;
            break;
          }

          case "TEAM_NAME_UPDATED": {
            await client.query(
              "UPDATE accounts SET team_name = $1, updated_at = NOW() WHERE id = $2",
              [payload.teamName, accountId]
            );
            applied++;
            break;
          }

          default:
            skipped++;
          }

          await client.query("RELEASE SAVEPOINT action_sp");
        } catch {
          await client.query("ROLLBACK TO SAVEPOINT action_sp");
          skipped++;
        }
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return res.json({ applied, skipped });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
