-- Migration: 035_telegram_missing_features
-- Adds tables for blacklist, reports, locks, and scheduled messages

-- Blacklist words per session/chat
CREATE TABLE IF NOT EXISTS telegram_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  word TEXT NOT NULL,
  action TEXT DEFAULT 'delete',
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id, word)
);

CREATE INDEX IF NOT EXISTS idx_telegram_blacklist_session_chat
  ON telegram_blacklist(session_id, chat_id);

-- Blacklist mode per chat (stored separately so it persists even if words are cleared)
CREATE TABLE IF NOT EXISTS telegram_blacklist_mode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  action TEXT DEFAULT 'delete',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id)
);

-- User reports
CREATE TABLE IF NOT EXISTS telegram_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  reporter_id BIGINT NOT NULL,
  reported_user_id BIGINT NOT NULL,
  message_id BIGINT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  resolved_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_telegram_reports_session_chat_status
  ON telegram_reports(session_id, chat_id, status);

-- Media type locks per chat
CREATE TABLE IF NOT EXISTS telegram_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  photo BOOLEAN DEFAULT false,
  video BOOLEAN DEFAULT false,
  sticker BOOLEAN DEFAULT false,
  gif BOOLEAN DEFAULT false,
  voice BOOLEAN DEFAULT false,
  audio BOOLEAN DEFAULT false,
  document BOOLEAN DEFAULT false,
  link BOOLEAN DEFAULT false,
  forward BOOLEAN DEFAULT false,
  poll BOOLEAN DEFAULT false,
  contact BOOLEAN DEFAULT false,
  video_note BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id)
);

-- Scheduled messages
CREATE TABLE IF NOT EXISTS telegram_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  schedule_type TEXT NOT NULL DEFAULT 'once',
  time_of_day TIME,
  next_send_at TIMESTAMPTZ NOT NULL,
  max_sends INTEGER DEFAULT 1,
  send_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_scheduled_active
  ON telegram_scheduled_messages(is_active, next_send_at)
  WHERE is_active = true;

-- Add new config columns to telegram_bot_configs for editable text
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS start_text TEXT;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS start_group_dm_text TEXT;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS help_text TEXT;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS miniapp_base_url TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
