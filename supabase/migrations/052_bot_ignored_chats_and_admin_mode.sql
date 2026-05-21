-- Bot ignored chats: allows bot owners to disable bot responses in specific chats
CREATE TABLE IF NOT EXISTS bot_ignored_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  chat_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_bot_ignored_chats_session
  ON bot_ignored_chats(session_id);

-- Admin-only mode flag on telegram_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_config' AND column_name = 'admin_only_mode'
  ) THEN
    ALTER TABLE telegram_config ADD COLUMN admin_only_mode BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- BotFather reminder sent flag on bot_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bot_sessions' AND column_name = 'botfather_reminder_sent'
  ) THEN
    ALTER TABLE bot_sessions ADD COLUMN botfather_reminder_sent BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
