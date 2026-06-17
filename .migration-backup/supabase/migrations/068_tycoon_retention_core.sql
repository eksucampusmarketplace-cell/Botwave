-- 068_tycoon_retention_core.sql
--
-- Cosa Nostra Tycoon — retention features foundation.
--
-- Adds tables needed by the core retention loop:
--   tycoon_claims       — daily login streak tracking (§28.2)
--   tycoon_quest_progress — quest completion tracking
--   increment_tycoon_quest_progress() — RPC used by lib/tycoon/quests.ts
--
-- Companion to migration 067.

-- ─── 1. claims (daily login + future claim types) ─────────────────────────

CREATE TABLE IF NOT EXISTS tycoon_claims (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id    UUID NOT NULL REFERENCES tycoon_players(id) ON DELETE CASCADE,
  claim_type   TEXT NOT NULL DEFAULT 'daily_login',
  streak       INTEGER NOT NULL DEFAULT 1,
  reward       JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tycoon_claims_player_type
  ON tycoon_claims(player_id, claim_type, claimed_at DESC);

-- Generated column for fast daily unique check.
ALTER TABLE tycoon_claims ADD COLUMN IF NOT EXISTS claimed_date
  DATE GENERATED ALWAYS AS ((claimed_at AT TIME ZONE 'UTC')::date) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tycoon_claims_player_date
  ON tycoon_claims(player_id, claim_type, claimed_date);

ALTER TABLE tycoon_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_tycoon_claims" ON tycoon_claims
  FOR ALL USING (auth.role() = 'service_role');

-- ─── 2. quest_progress ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tycoon_quest_progress (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id    UUID NOT NULL REFERENCES tycoon_players(id) ON DELETE CASCADE,
  quest_key    TEXT NOT NULL,
  progress     INTEGER NOT NULL DEFAULT 0,
  target       INTEGER NOT NULL,
  completed    BOOLEAN NOT NULL DEFAULT false,
  claimed      BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  claimed_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, quest_key)
);

CREATE INDEX IF NOT EXISTS idx_tycoon_quest_progress_player
  ON tycoon_quest_progress(player_id);

ALTER TABLE tycoon_quest_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_tycoon_quest_progress" ON tycoon_quest_progress
  FOR ALL USING (auth.role() = 'service_role');

-- ─── 3. increment_tycoon_quest_progress RPC ───────────────────────────────

CREATE OR REPLACE FUNCTION increment_tycoon_quest_progress(
  p_player_id UUID,
  p_quest_key TEXT,
  p_amount    INTEGER,
  p_target    INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO tycoon_quest_progress (player_id, quest_key, progress, target)
  VALUES (p_player_id, p_quest_key, LEAST(p_amount, p_target), p_target)
  ON CONFLICT (player_id, quest_key) DO UPDATE SET
    progress  = LEAST(tycoon_quest_progress.progress + p_amount, p_target),
    completed = (tycoon_quest_progress.progress + p_amount >= p_target),
    completed_at = CASE
      WHEN tycoon_quest_progress.progress + p_amount >= p_target
       AND tycoon_quest_progress.completed = false
      THEN now()
      ELSE tycoon_quest_progress.completed_at
    END,
    updated_at = now();
END;
$$;