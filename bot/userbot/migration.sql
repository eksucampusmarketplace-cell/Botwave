-- BotWave Telegram Userbot — Database Migration
-- Creates tables for userbot configuration, notes, filters, PM permit, and global bans.
-- Safe to run multiple times (IF NOT EXISTS).

-- Userbot per-session configuration
CREATE TABLE IF NOT EXISTS userbot_config (
  session_id TEXT PRIMARY KEY REFERENCES bot_sessions(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL DEFAULT '.',
  anti_pm BOOLEAN NOT NULL DEFAULT false,
  anti_pm_block BOOLEAN NOT NULL DEFAULT false,
  anti_pm_report BOOLEAN NOT NULL DEFAULT false,
  pm_permit_enabled BOOLEAN NOT NULL DEFAULT false,
  pm_permit_limit INTEGER NOT NULL DEFAULT 3,
  pm_permit_message TEXT NOT NULL DEFAULT 'This is an automated message. My owner will get back to you soon. Please wait.',
  afk_enabled BOOLEAN NOT NULL DEFAULT false,
  afk_reason TEXT NOT NULL DEFAULT '',
  afk_since TIMESTAMPTZ,
  alive_message TEXT NOT NULL DEFAULT '🤖 BotWave Userbot is alive!',
  log_chat_id TEXT,
  sudo_users TEXT[] NOT NULL DEFAULT '{}',
  disabled_modules TEXT[] NOT NULL DEFAULT '{}',
  auto_read_enabled BOOLEAN NOT NULL DEFAULT true,
  presence_simulation BOOLEAN NOT NULL DEFAULT true,
  timezone_offset INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Userbot notes (per-session)
CREATE TABLE IF NOT EXISTS userbot_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  media_type TEXT,
  media_file_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, name)
);

-- Userbot chat filters (per-session, per-chat)
CREATE TABLE IF NOT EXISTS userbot_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, chat_id, keyword)
);

-- Userbot PM permit tracking
CREATE TABLE IF NOT EXISTS userbot_pm_permit (
  session_id TEXT NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  warn_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(session_id, user_id)
);

-- Userbot global bans
CREATE TABLE IF NOT EXISTS userbot_gbans (
  session_id TEXT NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(session_id, user_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_userbot_notes_session ON userbot_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_userbot_filters_session_chat ON userbot_filters(session_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_userbot_pm_permit_session ON userbot_pm_permit(session_id);
CREATE INDEX IF NOT EXISTS idx_userbot_gbans_session ON userbot_gbans(session_id);

-- Enable RLS (Row Level Security) on all userbot tables
ALTER TABLE userbot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE userbot_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE userbot_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE userbot_pm_permit ENABLE ROW LEVEL SECURITY;
ALTER TABLE userbot_gbans ENABLE ROW LEVEL SECURITY;

-- Service role policies (for the bot backend)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'userbot_config_service_all') THEN
    CREATE POLICY userbot_config_service_all ON userbot_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'userbot_notes_service_all') THEN
    CREATE POLICY userbot_notes_service_all ON userbot_notes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'userbot_filters_service_all') THEN
    CREATE POLICY userbot_filters_service_all ON userbot_filters FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'userbot_pm_permit_service_all') THEN
    CREATE POLICY userbot_pm_permit_service_all ON userbot_pm_permit FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'userbot_gbans_service_all') THEN
    CREATE POLICY userbot_gbans_service_all ON userbot_gbans FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
