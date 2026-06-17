-- ============================================================================
-- Migration 033: Telegram Multi-Platform Support
-- Adds platform column to bot_sessions and creates Telegram config tables
-- ============================================================================

-- Step 1: Add platform column to bot_sessions
-- Default to 'whatsapp' for all existing sessions
ALTER TABLE bot_sessions
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'whatsapp';

-- Add CHECK constraint for valid platforms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bot_sessions_platform_check'
  ) THEN
    ALTER TABLE bot_sessions
      ADD CONSTRAINT bot_sessions_platform_check
      CHECK (platform IN ('whatsapp', 'telegram_bot', 'telegram_userbot'));
  END IF;
END $$;

-- Step 2: Add Telegram-specific columns to bot_sessions
ALTER TABLE bot_sessions
  ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
  ADD COLUMN IF NOT EXISTS telegram_bot_username TEXT,
  ADD COLUMN IF NOT EXISTS telegram_api_id INTEGER,
  ADD COLUMN IF NOT EXISTS telegram_api_hash TEXT,
  ADD COLUMN IF NOT EXISTS telegram_session_string TEXT;

-- Step 3: Create telegram_bot_configs table
CREATE TABLE IF NOT EXISTS telegram_bot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  webhook_url TEXT,
  webhook_secret TEXT,
  welcome_message TEXT,
  goodbye_message TEXT,
  rules_text TEXT,
  antiflood_enabled BOOLEAN DEFAULT false,
  antiflood_max_per_min INTEGER DEFAULT 10,
  antispam_enabled BOOLEAN DEFAULT false,
  antilink_enabled BOOLEAN DEFAULT false,
  antilink_whitelist TEXT[] DEFAULT '{}',
  captcha_enabled BOOLEAN DEFAULT false,
  captcha_type TEXT DEFAULT 'button',
  warn_limit INTEGER DEFAULT 3,
  warn_action TEXT DEFAULT 'mute',
  night_mode_enabled BOOLEAN DEFAULT false,
  night_mode_start TIME,
  night_mode_end TIME,
  locked_types TEXT[] DEFAULT '{}',
  log_channel_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id)
);

-- Step 4: Create telegram_userbot_configs table
CREATE TABLE IF NOT EXISTS telegram_userbot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  auto_forward_rules JSONB DEFAULT '[]',
  channel_monitors JSONB DEFAULT '[]',
  warming_enabled BOOLEAN DEFAULT false,
  warming_config JSONB DEFAULT '{}',
  rate_limit_msg_interval_ms INTEGER DEFAULT 2000,
  rate_limit_join_interval_ms INTEGER DEFAULT 300000,
  rate_limit_forward_interval_ms INTEGER DEFAULT 3000,
  rate_limit_react_interval_ms INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id)
);

-- Step 5: Create telegram_warnings table for the warn system
CREATE TABLE IF NOT EXISTS telegram_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  warned_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_warnings_session_chat_user
  ON telegram_warnings(session_id, chat_id, user_id);

-- Step 6: Create telegram_filters table for custom keyword filters
CREATE TABLE IF NOT EXISTS telegram_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  response TEXT NOT NULL,
  is_regex BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id, keyword)
);

-- Step 7: Create telegram_notes table for saved notes
CREATE TABLE IF NOT EXISTS telegram_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  note_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id, note_name)
);

-- Step 8: Create telegram_scheduled_posts table
CREATE TABLE IF NOT EXISTS telegram_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  target_chat_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_scheduled_posts_due
  ON telegram_scheduled_posts(scheduled_at)
  WHERE sent = false;

-- Step 9: Create telegram_moderation_log table
CREATE TABLE IF NOT EXISTS telegram_moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT,
  moderator_user_id TEXT,
  reason TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_modlog_session_chat
  ON telegram_moderation_log(session_id, chat_id, created_at DESC);

-- Step 10: RLS policies for new tables (service role bypass)
ALTER TABLE telegram_bot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_userbot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_moderation_log ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access for the bot backend)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'telegram_bot_configs',
    'telegram_userbot_configs',
    'telegram_warnings',
    'telegram_filters',
    'telegram_notes',
    'telegram_scheduled_posts',
    'telegram_moderation_log'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "service_role_full_%s" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Step 11: Add index on platform column for efficient filtering
CREATE INDEX IF NOT EXISTS idx_bot_sessions_platform
  ON bot_sessions(platform);
