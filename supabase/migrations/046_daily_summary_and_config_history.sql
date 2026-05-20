-- ============================================================================
-- Migration 046: Daily Summary + Config History + Missing Columns
-- 
-- 1. Adds daily_summary columns to telegram_bot_configs and telegram_group_configs
-- 2. Creates telegram_config_history table for config versioning & rollback
-- 3. Adds any missing columns from DEFAULT_CONFIG that weren't in previous migrations
-- ============================================================================

-- ─── Daily Summary columns on telegram_bot_configs ───────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS daily_summary_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS daily_summary_hour INTEGER DEFAULT 23;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS daily_summary_channel_id TEXT;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS last_summary_sent_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Daily Summary columns on telegram_group_configs ─────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_group_configs ADD COLUMN IF NOT EXISTS daily_summary_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_group_configs ADD COLUMN IF NOT EXISTS daily_summary_hour INTEGER DEFAULT 23;
  ALTER TABLE telegram_group_configs ADD COLUMN IF NOT EXISTS daily_summary_channel_id TEXT;
  ALTER TABLE telegram_group_configs ADD COLUMN IF NOT EXISTS last_summary_sent_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Index for daily summary cron ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bot_configs_daily_summary
  ON telegram_bot_configs (daily_summary_enabled, daily_summary_hour)
  WHERE daily_summary_enabled = true;

CREATE INDEX IF NOT EXISTS idx_group_configs_daily_summary
  ON telegram_group_configs (daily_summary_enabled, daily_summary_hour)
  WHERE daily_summary_enabled = true;

-- ─── Config History table for versioning & rollback ──────────────────────────
CREATE TABLE IF NOT EXISTS telegram_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id BIGINT,                    -- NULL for bot-level, populated for group-level
  config_type TEXT NOT NULL DEFAULT 'bot',  -- 'bot' | 'group' | 'userbot'
  config_snapshot JSONB NOT NULL,    -- full config at time of save
  changed_by TEXT,                   -- user ID or 'system'
  change_summary TEXT,               -- human-readable description of what changed
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_config_history_session
  ON telegram_config_history (session_id, config_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_config_history_group
  ON telegram_config_history (session_id, chat_id, created_at DESC)
  WHERE chat_id IS NOT NULL;

-- Keep only last 10 snapshots per session+type+chat combo (via trigger)
CREATE OR REPLACE FUNCTION cleanup_old_config_history() RETURNS trigger AS $$
BEGIN
  DELETE FROM telegram_config_history
  WHERE id IN (
    SELECT id FROM telegram_config_history
    WHERE session_id = NEW.session_id
      AND config_type = NEW.config_type
      AND (chat_id IS NOT DISTINCT FROM NEW.chat_id)
    ORDER BY created_at DESC
    OFFSET 10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_config_history ON telegram_config_history;
CREATE TRIGGER trg_cleanup_config_history
  AFTER INSERT ON telegram_config_history
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_config_history();

-- RLS for config_history
ALTER TABLE telegram_config_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS config_history_service_all ON telegram_config_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── XP Leaderboard: add reset tracking column ──────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_xp ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Ensure night_mode_groups exists (BIGINT[] type) ─────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS night_mode_groups BIGINT[] DEFAULT '{}';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
