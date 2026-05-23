-- 068_tycoon_mvp_core.sql
--
-- Small hardening indexes for the first playable Tycoon MVP slice.

CREATE INDEX IF NOT EXISTS idx_tycoon_events_player_kind_created
  ON tycoon_events(player_id, kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tycoon_raids_created_at
  ON tycoon_raids(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tycoon_players_last_tick_at
  ON tycoon_players(last_tick_at);
