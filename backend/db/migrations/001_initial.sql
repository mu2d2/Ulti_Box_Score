-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Accounts ──────────────────────────────────────────────────────────────────
-- One row per authenticated team. Created/updated on every Google sign-in.
CREATE TABLE IF NOT EXISTS accounts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        UNIQUE NOT NULL,
  google_sub   TEXT        UNIQUE NOT NULL,
  team_name    TEXT        NOT NULL DEFAULT '',
  picture      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Players ───────────────────────────────────────────────────────────────────
-- Client generates IDs (e.g. "player-abc123") so offline creation works.
CREATE TABLE IF NOT EXISTS players (
  id                TEXT        PRIMARY KEY,
  account_id        UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  jersey_number     TEXT,
  position          TEXT,
  role              TEXT,
  age               INTEGER,
  match_player_type TEXT        NOT NULL DEFAULT 'MMP',
  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_account_id ON players(account_id);

-- ─── Lineup Groups ─────────────────────────────────────────────────────────────
-- Named subsets of the roster (e.g. "O-Line", "D-Line"). "lineup-all" is virtual
-- and stored only so client IDs round-trip cleanly.
CREATE TABLE IF NOT EXISTS lineup_groups (
  id         TEXT        PRIMARY KEY,
  account_id UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lineup_groups_account_id ON lineup_groups(account_id);

-- ─── Lineup Group Members ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lineup_group_members (
  lineup_group_id TEXT NOT NULL REFERENCES lineup_groups(id) ON DELETE CASCADE,
  player_id       TEXT NOT NULL REFERENCES players(id)       ON DELETE CASCADE,
  PRIMARY KEY (lineup_group_id, player_id)
);

-- ─── Games ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
  id           TEXT        PRIMARY KEY,
  account_id   UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  opponent     TEXT,
  is_completed BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_account_id ON games(account_id);

-- ─── Points ────────────────────────────────────────────────────────────────────
-- One row per committed point (i.e. after "Point Won" / "Point Lost" is pressed).
CREATE TABLE IF NOT EXISTS points (
  id           TEXT        PRIMARY KEY,
  game_id      TEXT        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  point_number INTEGER     NOT NULL,
  did_we_score BOOLEAN     NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, point_number)
);

CREATE INDEX IF NOT EXISTS idx_points_game_id ON points(game_id);

-- ─── Player Points ─────────────────────────────────────────────────────────────
-- Which players were on the field for each point.
-- Counting these rows gives "Points Played" — never stored as a separate column.
CREATE TABLE IF NOT EXISTS player_points (
  point_id  TEXT NOT NULL REFERENCES points(id)   ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id)  ON DELETE CASCADE,
  PRIMARY KEY (point_id, player_id)
);

-- ─── Stat Events ───────────────────────────────────────────────────────────────
-- One row per individual stat occurrence. Delete a row to undo it.
CREATE TABLE IF NOT EXISTS stat_events (
  id           TEXT        PRIMARY KEY,
  game_id      TEXT        NOT NULL REFERENCES games(id)   ON DELETE CASCADE,
  point_number INTEGER     NOT NULL,
  player_id    TEXT        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  stat_type    TEXT        NOT NULL CHECK (stat_type IN ('Goal', 'Assist', 'Turnover', 'Block')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stat_events_game_id    ON stat_events(game_id);
CREATE INDEX IF NOT EXISTS idx_stat_events_player_id  ON stat_events(player_id);
