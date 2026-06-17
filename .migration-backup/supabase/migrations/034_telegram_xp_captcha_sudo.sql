-- ============================================================================
-- Migration 034: Telegram XP, Captcha Pending, Sudo Users, and Config Extensions
-- Adds tables for XP tracking, captcha verification, sudo user management,
-- and new columns to telegram_bot_configs for editable text and mini apps.
-- ============================================================================

-- Step 1: Add new columns to telegram_bot_configs
ALTER TABLE telegram_bot_configs
  ADD COLUMN IF NOT EXISTS xp_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS start_text TEXT,
  ADD COLUMN IF NOT EXISTS help_text TEXT,
  ADD COLUMN IF NOT EXISTS owner_user_id TEXT,
  ADD COLUMN IF NOT EXISTS miniapp_base_url TEXT;

-- Step 2: Create telegram_xp table for XP / leveling system
CREATE TABLE IF NOT EXISTS telegram_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_xp_session_chat
  ON telegram_xp(session_id, chat_id);

CREATE INDEX IF NOT EXISTS idx_telegram_xp_leaderboard
  ON telegram_xp(session_id, chat_id, xp DESC);

-- Step 3: Create telegram_captcha_pending table
CREATE TABLE IF NOT EXISTS telegram_captcha_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_captcha_pending_lookup
  ON telegram_captcha_pending(session_id, chat_id, user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_captcha_pending_expires
  ON telegram_captcha_pending(expires_at)
  WHERE verified = false;

-- Step 4: Create telegram_sudo_users table
CREATE TABLE IF NOT EXISTS telegram_sudo_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_sudo_users_session
  ON telegram_sudo_users(session_id);

-- Step 5: Enable RLS on new tables
ALTER TABLE telegram_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_captcha_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_sudo_users ENABLE ROW LEVEL SECURITY;

-- Step 6: Service role policies for new tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'telegram_xp',
    'telegram_captcha_pending',
    'telegram_sudo_users'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "service_role_full_%s" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;
