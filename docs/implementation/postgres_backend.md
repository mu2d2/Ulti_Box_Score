# Postgres Backend Implementation

## Overview

The backend is an Express.js API server (Node.js, ESM) backed by PostgreSQL.  
All data is persisted per authenticated account. The frontend operates **offline-first**:
stat entry always works locally (via `localStorage` and an in-memory action queue), and
changes are flushed to Postgres via `POST /api/sync` when connectivity is available.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ (ESM, `--env-file` for env loading) |
| HTTP framework | Express 4 |
| Database driver | `pg` (node-postgres) |
| Auth | Google Identity Services (OIDC) + HMAC-HS256 session tokens |
| Database | PostgreSQL 14+ |

---

## Auth Flow

```
Browser                        Express API                  PostgreSQL
  │                                │                             │
  │── Google ID token ────────────►│                             │
  │                          verifyGoogleIdToken()               │
  │                                │── UPSERT accounts ─────────►│
  │                                │◄── account row ─────────────│
  │◄── { authToken, teamName } ────│                             │
  │                                │                             │
  │  (subsequent requests)         │                             │
  │── Bearer <authToken> ─────────►│                             │
  │                         verifySessionToken()                 │
  │                        req.tokenPayload.accountId            │
```

The `authToken` is a minimal HS256 JWT signed with `APP_SESSION_SECRET`. It contains:
```json
{ "sub": "<google_sub>", "email": "...", "accountId": "<pg uuid>", "exp": 1234567890 }
```

**Note:** Existing sessions issued before the Postgres backend was added do not contain
`accountId`. Users will need to sign out and sign back in once to receive an updated token.

---

## Database Schema

See [backend/db/migrations/001_initial.sql](../../backend/db/migrations/001_initial.sql) for the full DDL.

### Tables

| Table | Purpose |
|---|---|
| `accounts` | One row per authenticated team. Created/updated on every sign-in. |
| `players` | Roster entries. Client-generated IDs for offline-first compatibility. |
| `lineup_groups` | Named subsets of the roster (e.g. "O-Line"). `lineup-all` is stored but has no members. |
| `lineup_group_members` | Many-to-many join between lineup groups and players. |
| `games` | Individual game records. Client-generated IDs. |
| `points` | One row per committed point (`POINT_COMMITTED` action). |
| `player_points` | Which players were on-field for each point — drives "Points Played" counts. |
| `stat_events` | One row per stat occurrence (Goal, Assist, etc.). Delete a row to undo. |

### Design decisions

- **Client-generated IDs** — all entity IDs are generated on the frontend (e.g. `player-abc123`)
  so that records created offline can be synced without ID conflicts.
- **`ON CONFLICT DO NOTHING`** — all INSERT statements are idempotent. Replaying the same
  action queue twice is safe.
- **Points Played is never stored** — it is derived at query time by counting `player_points` rows.
- **Soft deletes for players** — `is_deleted = TRUE` hides players from queries without breaking
  foreign key references in historical stat events.

---

## API Endpoints

All endpoints except `GET /api/health` and `POST /api/auth/google/verify` require a
`Authorization: Bearer <authToken>` header.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/google/verify` | Verify Google ID token, upsert account, return session token |
| `PUT` | `/api/auth/account` | Update the team name for the authenticated account |

### State (hydration)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/state` | Return full game state shaped for `buildInitialState()` on the frontend |

### Players

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/players` | List all active players |
| `POST` | `/api/players` | Create a player (client supplies `id`) |
| `PUT` | `/api/players/:id` | Update player fields |

### Lineup Groups

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/lineup-groups` | List all groups with member player IDs |
| `POST` | `/api/lineup-groups` | Create a lineup group |
| `PUT` | `/api/lineup-groups/:id` | Rename and replace members |

### Games

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/games` | List all games |
| `POST` | `/api/games` | Create a game |
| `PUT` | `/api/games/:id` | Update name / opponent / completion status |
| `DELETE` | `/api/games/:id` | Delete game + all cascade data |
| `POST` | `/api/games/:id/toggle-complete` | Flip `is_completed` |

### Points and Stat Events

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/games/:gameId/points` | Commit a point (with `playerIds` for tracking Points Played) |
| `GET` | `/api/games/:gameId/stat-events` | List stat events for a game |
| `POST` | `/api/games/:gameId/stat-events` | Record a stat event |
| `DELETE` | `/api/stat-events/:id` | Remove a stat event (undo) |

### Offline Sync

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sync` | Replay a batch of queued actions from the local queue |

---

## Offline Sync

The frontend queues all state-mutating actions in `localStorage` via `enqueueAction()`.
Each action has a `type` and a `payload` — the same types processed by `POST /api/sync`.

### Supported action types

| Type | DB operation |
|---|---|
| `PLAYER_ADDED` | INSERT into `players` |
| `PLAYER_UPDATED` | UPDATE `players` |
| `LINEUP_GROUP_CREATED` | INSERT into `lineup_groups` + `lineup_group_members` |
| `LINEUP_GROUP_UPDATED` | UPDATE `lineup_groups` name, replace `lineup_group_members` |
| `GAME_CREATED` | INSERT into `games` |
| `GAME_UPDATED` | UPDATE `games` (name, opponent) |
| `GAME_DELETED` | DELETE from `games` (cascades to all sub-tables) |
| `GAME_DELETED_AND_RESET` | DELETE old game row |
| `GAME_COMPLETION_TOGGLED` | Toggle `games.is_completed` |
| `STAT_EVENT_CREATED` | INSERT into `stat_events` |
| `STAT_EVENT_DECREMENTED` | DELETE from `stat_events` by `eventId` |
| `STAT_EVENT_UNDONE` | DELETE from `stat_events` by `eventId` |
| `POINT_COMMITTED` | INSERT into `points` + `player_points` |
| `TEAM_NAME_UPDATED` | UPDATE `accounts.team_name` |

All inserts use `ON CONFLICT DO NOTHING` so the entire queue can be replayed safely.

### Triggering a sync

Call `apiClient.sync(actions)` with the contents of the local queue, then call
`clearQueue(scopeKey)` on success. The `"Pending Sync"` counter in the header reflects
the current queue depth.

---

## Running migrations

```bash
npm run db:migrate
```

This executes `backend/db/migrate.js`, which reads and applies every `.sql` file in
`backend/db/migrations/` in order. The SQL uses `CREATE TABLE IF NOT EXISTS` so it is safe
to re-run.

To add a new migration, create `002_<description>.sql` and add its path to the `MIGRATIONS`
array in `migrate.js`.

---

## Local development

1. Create the local database:
   ```bash
   createdb ulti_box_score
   ```
2. Copy `.env.example` → `.env.local` and fill in values.
3. Run migrations:
   ```bash
   npm run db:migrate
   ```
4. Start the API (terminal 1):
   ```bash
   npm run dev:api
   ```
5. Start the frontend (terminal 2):
   ```bash
   npm run dev
   ```

---

## Hosting considerations

For a hosted Postgres instance (Railway, Render, Supabase, Neon):
- Set `DATABASE_URL` to the connection string provided by the platform.
- Set `DATABASE_SSL=true` if the provider requires SSL (most do).
- The `pg` pool in `backend/db/pool.js` reads both vars at startup.
