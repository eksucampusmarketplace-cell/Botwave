-- Add welcome_sent column to userbot_config for one-time welcome message tracking
-- Migration 040

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'userbot_config' AND column_name = 'welcome_sent') THEN
    ALTER TABLE userbot_config ADD COLUMN welcome_sent BOOLEAN DEFAULT false;
  END IF;
END $$;
