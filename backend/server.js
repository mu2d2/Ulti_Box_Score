import express from "express";
import authRouter from "./routes/auth.js";
import playersRouter from "./routes/players.js";
import lineupGroupsRouter from "./routes/lineupGroups.js";
import gamesRouter from "./routes/games.js";
import pointsRouter from "./routes/points.js";
import statEventsRouter from "./routes/statEvents.js";
import syncRouter from "./routes/sync.js";
import stateRouter from "./routes/state.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { deleteStatEvent } from "./routes/statEvents.js";
import { createRateLimit } from "./middleware/rateLimit.js";

const app = express();
const PORT = Number(process.env.API_PORT || 8787);
const allowedOrigins = new Set(
  String(process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const authRateLimit = createRateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 60),
  label: "auth",
});

const syncRateLimit = createRateLimit({
  windowMs: Number(process.env.SYNC_RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.SYNC_RATE_LIMIT_MAX || 120),
  label: "sync",
});

app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: "Origin not allowed." });
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

// ── Health check (no auth) ────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ── Auth routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRateLimit, authRouter);

// ── Protected data routes ─────────────────────────────────────────────────────
app.use("/api/players", playersRouter);
app.use("/api/lineup-groups", lineupGroupsRouter);
app.use("/api/games", gamesRouter);
app.use("/api/games/:gameId/points", pointsRouter);
app.use("/api/games/:gameId/stat-events", statEventsRouter);
app.delete("/api/stat-events/:id", requireAuth, deleteStatEvent);
app.use("/api/sync", syncRateLimit, syncRouter);
app.use("/api/state", stateRouter);

/**
 * DELETE /api/account/data
 * Wipes all game data, stats, players, and lineup groups for the authenticated account.
 * The account itself (login) is preserved.
 */
app.delete("/api/account/data", requireAuth, async (req, res) => {
  const { pool: dbPool } = await import("./db/pool.js");
  try {
    const { accountId } = req.tokenPayload;
    const client = await dbPool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM stat_events WHERE game_id IN (SELECT id FROM games WHERE account_id = $1)`,
        [accountId]
      );
      await client.query(
        `DELETE FROM player_points WHERE point_id IN (SELECT id FROM points WHERE game_id IN (SELECT id FROM games WHERE account_id = $1))`,
        [accountId]
      );
      await client.query(
        `DELETE FROM points WHERE game_id IN (SELECT id FROM games WHERE account_id = $1)`,
        [accountId]
      );
      await client.query("DELETE FROM games WHERE account_id = $1", [accountId]);
      await client.query("DELETE FROM lineup_group_members WHERE lineup_group_id IN (SELECT id FROM lineup_groups WHERE account_id = $1)", [accountId]);
      await client.query("DELETE FROM lineup_groups WHERE account_id = $1", [accountId]);
      await client.query("DELETE FROM players WHERE account_id = $1", [accountId]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${PORT}`);
});

