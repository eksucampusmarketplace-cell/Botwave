-- Migration: 036_fix_telegram_schema_mismatches
-- Fixes schema mismatches between migration 035 and application code (db.ts)

-- 1. Blacklist settings: rename telegram_blacklist_mode → telegram_blacklist_settings, column action → mode
--    db.ts queries telegram_blacklist_settings with column "mode"
ALTER TABLE IF EXISTS telegram_blacklist_mode RENAME TO telegram_blacklist_settings;
ALTER TABLE IF EXISTS telegram_blacklist_settings RENAME COLUMN action TO mode;

-- 2. Reports: rename reporter_id → reporter_user_id, change id to SERIAL
--    db.ts inserts reporter_user_id and types id as number
ALTER TABLE IF EXISTS telegram_reports RENAME COLUMN reporter_id TO reporter_user_id;
-- Drop UUID id column and replace with SERIAL for user-facing numeric IDs
ALTER TABLE IF EXISTS telegram_reports DROP CONSTRAINT IF EXISTS telegram_reports_pkey;
ALTER TABLE IF EXISTS telegram_reports DROP COLUMN IF EXISTS id;
ALTER TABLE IF EXISTS telegram_reports ADD COLUMN id SERIAL PRIMARY KEY;

-- 3. Locks: change from boolean-columns-per-type to row-per-lock-type model
--    db.ts queries with lock_type (string) and is_locked (boolean) per row
DROP TABLE IF EXISTS telegram_locks;
CREATE TABLE telegram_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  lock_type TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id, lock_type)
);

CREATE INDEX IF NOT EXISTS idx_telegram_locks_session_chat
  ON telegram_locks(session_id, chat_id);

-- 4. Scheduled messages: change id to SERIAL for user-facing numeric IDs
--    db.ts types id as number and code does parseInt on IDs
ALTER TABLE IF EXISTS telegram_scheduled_messages DROP CONSTRAINT IF EXISTS telegram_scheduled_messages_pkey;
ALTER TABLE IF EXISTS telegram_scheduled_messages DROP COLUMN IF EXISTS id;
ALTER TABLE IF EXISTS telegram_scheduled_messages ADD COLUMN id SERIAL PRIMARY KEY;

-- 5. Add night_mode_groups column to telegram_bot_configs
--    checkNightMode reads config.night_mode_groups as array of chat IDs
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS night_mode_groups BIGINT[] DEFAULT '{}';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
