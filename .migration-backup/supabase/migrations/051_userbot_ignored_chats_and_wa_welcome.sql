-- Userbot ignored chats: allows users to disable userbot commands in specific chats
CREATE TABLE IF NOT EXISTS userbot_ignored_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_userbot_ignored_chats_session
  ON userbot_ignored_chats(session_id);

-- WhatsApp welcome dedup flag on bot_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bot_sessions' AND column_name = 'welcome_sent_whatsapp'
  ) THEN
    ALTER TABLE bot_sessions ADD COLUMN welcome_sent_whatsapp BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
