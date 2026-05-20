-- Migration: Add platform column, pairing_failed support, and feedback table
-- Enables platform isolation so WhatsApp and Telegram containers
-- don't steal each other's session locks.

ALTER TABLE bot_sessions
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'whatsapp';

ALTER TABLE bot_sessions
  ADD COLUMN IF NOT EXISTS pairing_retries INTEGER NOT NULL DEFAULT 0;

-- Index for filtering sessions by platform
CREATE INDEX IF NOT EXISTS idx_bot_sessions_platform
  ON bot_sessions(platform);

COMMENT ON COLUMN bot_sessions.platform IS
  'Session platform: whatsapp, telegram_bot, telegram_userbot';

COMMENT ON COLUMN bot_sessions.pairing_retries IS
  'Number of consecutive pairing failures. After 3, session moves to pairing_failed state.';

-- Feedback table for /feedback command
CREATE TABLE IF NOT EXISTS telegram_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  chat_id TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_feedback_session
  ON telegram_feedback(session_id);

-- Email bounce tracking table
CREATE TABLE IF NOT EXISTS email_bounces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient TEXT NOT NULL,
  bounce_type TEXT NOT NULL DEFAULT 'hard',
  reason TEXT,
  source TEXT, -- 'postal' or 'resend'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_bounces_recipient
  ON email_bounces(recipient);

-- Email unsubscribe tracking table
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
