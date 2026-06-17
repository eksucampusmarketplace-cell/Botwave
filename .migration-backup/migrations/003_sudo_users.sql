-- Migration: Create telegram_sudo_users table
-- This table tracks sudo users (elevated admins) per bot session

CREATE TABLE IF NOT EXISTS telegram_sudo_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_sudo_users_session
  ON telegram_sudo_users(session_id);
