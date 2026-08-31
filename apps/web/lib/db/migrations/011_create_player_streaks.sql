-- Migration: create player_streaks table.
--
-- Tracks consecutive daily hunt-completion streaks for each player wallet.
-- Replaces the transient, client-side localStorage streak in lib/dailyChallenge.ts
-- with a durable, server-side store shared across devices and sessions.
--
-- A player earns one streak "tick" per calendar day (UTC) on which they complete
-- at least one hunt.  Completing multiple hunts on the same day counts as a
-- single tick.  Missing a calendar day resets the current streak to zero; the
-- next completion starts a fresh streak.

CREATE TABLE IF NOT EXISTS player_streaks (
  player_address    TEXT        PRIMARY KEY,
  current_streak    INTEGER     NOT NULL DEFAULT 0,
  longest_streak    INTEGER     NOT NULL DEFAULT 0,
  last_completed_date DATE      NOT NULL DEFAULT CURRENT_DATE,
  streak_broken     BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_streaks_current
  ON player_streaks (current_streak DESC);
