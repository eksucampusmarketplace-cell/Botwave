-- 070_tycoon_monetization_ledger.sql
--
-- Immutable Tycoon gem ledger for Stars purchases and gem spend actions.

CREATE TABLE IF NOT EXISTS tycoon_ledger (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id   UUID NOT NULL REFERENCES tycoon_players(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  currency    TEXT NOT NULL CHECK (currency IN ('gems', 'coins', 'energy')),
  reason      TEXT NOT NULL,
  idempotency_key TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tycoon_ledger_idempotency
  ON tycoon_ledger(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tycoon_ledger_player_created
  ON tycoon_ledger(player_id, created_at DESC);

ALTER TABLE tycoon_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_tycoon_ledger" ON tycoon_ledger
  FOR ALL USING (auth.role() = 'service_role');
