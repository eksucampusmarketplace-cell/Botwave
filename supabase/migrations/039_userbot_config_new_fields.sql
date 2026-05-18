-- Add new fields to userbot_config for alive image, PM permit image, and PM permit inline mode
-- These columns may not exist if the table was auto-created by upsert

-- Ensure the table exists first
CREATE TABLE IF NOT EXISTS userbot_config (
  session_id UUID PRIMARY KEY REFERENCES bot_sessions(id) ON DELETE CASCADE,
  prefix TEXT DEFAULT '.',
  anti_pm BOOLEAN DEFAULT false,
  anti_pm_block BOOLEAN DEFAULT false,
  anti_pm_report BOOLEAN DEFAULT false,
  pm_permit_enabled BOOLEAN DEFAULT false,
  pm_permit_limit INTEGER DEFAULT 3,
  pm_permit_message TEXT DEFAULT 'This is an automated message. My owner will get back to you soon. Please wait.',
  pm_permit_image TEXT DEFAULT '',
  pm_permit_inline BOOLEAN DEFAULT false,
  afk_enabled BOOLEAN DEFAULT false,
  afk_reason TEXT DEFAULT '',
  afk_since TIMESTAMPTZ,
  alive_message TEXT DEFAULT '🤖 BotWave Userbot is alive!',
  alive_image TEXT DEFAULT '',
  log_chat_id TEXT,
  sudo_users TEXT[] DEFAULT '{}',
  disabled_modules TEXT[] DEFAULT '{}',
  auto_read_enabled BOOLEAN DEFAULT true,
  presence_simulation BOOLEAN DEFAULT true,
  timezone_offset INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns if they don't exist (for existing installations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'userbot_config' AND column_name = 'alive_image') THEN
    ALTER TABLE userbot_config ADD COLUMN alive_image TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'userbot_config' AND column_name = 'pm_permit_image') THEN
    ALTER TABLE userbot_config ADD COLUMN pm_permit_image TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'userbot_config' AND column_name = 'pm_permit_inline') THEN
    ALTER TABLE userbot_config ADD COLUMN pm_permit_inline BOOLEAN DEFAULT false;
  END IF;
END $$;

-- RLS
ALTER TABLE userbot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "service_role_full_userbot_config"
  ON userbot_config FOR ALL TO service_role USING (true) WITH CHECK (true);
