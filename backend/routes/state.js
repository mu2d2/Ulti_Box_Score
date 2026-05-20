import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { pool } from "../db/pool.js";

const router = Router();
router.use(requireAuth);

/**
 * GET /api/state
 * Returns the full game state for the authenticated account, shaped so it
 * can be passed directly into buildInitialState() on the frontend.
 *
 * This is called once after sign-in to hydrate the app from the server
 * rather than from localStorage alone.
 */
router.get("/", async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;

    // Run all reads in parallel for speed.
    const [playersResult, groupsResult, membersResult, gamesResult, pointsResult, ppResult, eventsResult] =
      await Promise.all([
        pool.query(
          `SELECT id, name, jersey_number, position, role, age, match_player_type, created_at
           FROM players
           WHERE account_id = $1 AND is_deleted = FALSE
           ORDER BY created_at`,
          [accountId]
        ),
        pool.query(
          `SELECT id, name FROM lineup_groups WHERE account_id = $1 ORDER BY created_at`,
          [accountId]
        ),
        pool.query(
          `SELECT lgm.lineup_group_id, lgm.player_id
           FROM lineup_group_members lgm
           JOIN lineup_groups lg ON lg.id = lgm.lineup_group_id
           WHERE lg.account_id = $1`,
          [accountId]
        ),
        pool.query(
          `SELECT id, name, opponent, is_completed, created_at
           FROM games WHERE account_id = $1 ORDER BY created_at`,
          [accountId]
        ),
        pool.query(
          `SELECT p.id, p.game_id, p.point_number, p.did_we_score, p.created_at
           FROM points p
           JOIN games g ON g.id = p.game_id
           WHERE g.account_id = $1
           ORDER BY p.game_id, p.point_number`,
          [accountId]
        ),
        pool.query(
          `SELECT pp.point_id, pp.player_id
           FROM player_points pp
           JOIN points p  ON p.id  = pp.point_id
           JOIN games  g  ON g.id  = p.game_id
           WHERE g.account_id = $1`,
          [accountId]
        ),
        pool.query(
          `SELECT se.id, se.game_id, se.point_number, se.player_id, se.stat_type, se.created_at
           FROM stat_events se
           JOIN games g ON g.id = se.game_id
           WHERE g.account_id = $1
           ORDER BY se.game_id, se.created_at`,
          [accountId]
        ),
      ]);

    // ── lineupMembership: { playerId: ["lineup-all", ...groupIds] } ──────────
    const lineupMembership = {};
    for (const p of playersResult.rows) {
      lineupMembership[p.id] = ["lineup-all"];
    }
    for (const m of membersResult.rows) {
      if (!lineupMembership[m.player_id]) {
        lineupMembership[m.player_id] = ["lineup-all"];
      }
      if (!lineupMembership[m.player_id].includes(m.lineup_group_id)) {
        lineupMembership[m.player_id].push(m.lineup_group_id);
      }
    }

    // ── gameDataById ─────────────────────────────────────────────────────────
    const pointsByGame = {};
    for (const pt of pointsResult.rows) {
      if (!pointsByGame[pt.game_id]) pointsByGame[pt.game_id] = [];
      pointsByGame[pt.game_id].push(pt);
    }

    const playersByPoint = {};
    for (const pp of ppResult.rows) {
      if (!playersByPoint[pp.point_id]) playersByPoint[pp.point_id] = [];
      playersByPoint[pp.point_id].push(pp.player_id);
    }

    const eventsByGame = {};
    for (const ev of eventsResult.rows) {
      if (!eventsByGame[ev.game_id]) eventsByGame[ev.game_id] = [];
      eventsByGame[ev.game_id].push(ev);
    }

    const gameDataById = {};
    for (const game of gamesResult.rows) {
      const pts = pointsByGame[game.id] || [];
      const evs = eventsByGame[game.id] || [];

      const playerPointsPlayed = {};
      for (const pt of pts) {
        for (const playerId of playersByPoint[pt.id] || []) {
          playerPointsPlayed[playerId] = (playerPointsPlayed[playerId] || 0) + 1;
        }
      }

      const maxPointNumber = pts.reduce((mx, p) => Math.max(mx, p.point_number), 0);

      gameDataById[game.id] = {
        pointNumber: maxPointNumber + 1,
        currentOnFieldPlayerIds: [],
        playerPointsPlayed,
        statEvents: evs.map((e) => ({
          id: e.id,
          pointNumber: e.point_number,
          playerId: e.player_id,
          statType: e.stat_type,
          createdAt: e.created_at,
        })),
        pointResults: pts.map((p) => ({
          id: p.id,
          pointNumber: p.point_number,
          didWeScore: p.did_we_score,
          createdAt: p.created_at,
        })),
      };
    }

    // ── Lineup groups — always include the virtual "lineup-all" ──────────────
    const hasLineupAll = groupsResult.rows.some((g) => g.id === "lineup-all");
    const lineupGroups = [
      ...(hasLineupAll ? [] : [{ id: "lineup-all", name: "All" }]),
      ...groupsResult.rows.map((g) => ({ id: g.id, name: g.name })),
    ];

    // ── Games list ────────────────────────────────────────────────────────────
    const games = gamesResult.rows.map((g) => ({
      id: g.id,
      name: g.name,
      opponent: g.opponent || "",
      isCompleted: g.is_completed,
      createdAt: g.created_at,
    }));

    const activeGameId = games.length > 0 ? games[games.length - 1].id : null;

    return res.json({
      players: playersResult.rows.map((p) => ({
        id: p.id,
        name: p.name,
        jerseyNumber: p.jersey_number || "",
        position: p.position || "",
        role: p.role || "Offense",
        age: p.age ?? null,
        matchPlayerType: p.match_player_type || "MMP",
      })),
      lineupGroups,
      lineupMembership,
      games,
      activeGameId,
      gameDataById,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
