-- 069_tycoon_retention_core.sql
--
-- Daily login rewards and simple one-time quest progress for Tycoon MVP.

CREATE TABLE IF NOT EXISTS tycoon_claims (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id   UUID NOT NULL REFERENCES tycoon_players(id) ON DELETE CASCADE,
  claim_type  TEXT NOT NULL,
  streak      INTEGER NOT NULL DEFAULT 1,
  reward      JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tycoon_claims_daily_once
  ON tycoon_claims(player_id, claim_type, ((claimed_at AT TIME ZONE 'UTC')::date));

CREATE INDEX IF NOT EXISTS idx_tycoon_claims_player_type_created
  ON tycoon_claims(player_id, claim_type, claimed_at DESC);

CREATE TABLE IF NOT EXISTS tycoon_quest_progress (
  player_id    UUID NOT NULL REFERENCES tycoon_players(id) ON DELETE CASCADE,
  quest_key    TEXT NOT NULL,
  progress     INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  claimed_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, quest_key)
);

CREATE OR REPLACE FUNCTION increment_tycoon_quest_progress(
  p_player_id UUID,
  p_quest_key TEXT,
  p_amount INTEGER,
  p_target INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO tycoon_quest_progress (
    player_id,
    quest_key,
    progress,
    completed_at,
    updated_at
  )
  VALUES (
    p_player_id,
    p_quest_key,
    GREATEST(0, p_amount),
    CASE WHEN GREATEST(0, p_amount) >= p_target THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (player_id, quest_key)
  DO UPDATE SET
    progress = LEAST(p_target, tycoon_quest_progress.progress + GREATEST(0, p_amount)),
    completed_at = CASE
      WHEN tycoon_quest_progress.completed_at IS NOT NULL THEN tycoon_quest_progress.completed_at
      WHEN tycoon_quest_progress.progress + GREATEST(0, p_amount) >= p_target THEN now()
      ELSE NULL
    END,
    updated_at = now();
END;
$$;

ALTER TABLE tycoon_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE tycoon_quest_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_tycoon_claims" ON tycoon_claims
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_tycoon_quest_progress" ON tycoon_quest_progress
  FOR ALL USING (auth.role() = 'service_role');
