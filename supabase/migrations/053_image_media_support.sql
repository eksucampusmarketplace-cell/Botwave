-- Migration 053: Add image/media support to filters and scheduled messages

-- Add image_url column to telegram_filters for auto-reply image attachments
ALTER TABLE telegram_filters
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add media_url column to telegram_scheduled_posts for scheduled message media
ALTER TABLE telegram_scheduled_posts
  ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Add welcome_image_url and goodbye_image_url to group configs
ALTER TABLE telegram_group_configs
  ADD COLUMN IF NOT EXISTS welcome_image_url TEXT,
  ADD COLUMN IF NOT EXISTS goodbye_image_url TEXT;

-- Add welcome_image_url and goodbye_image_url to bot configs
ALTER TABLE telegram_bot_configs
  ADD COLUMN IF NOT EXISTS welcome_image_url TEXT,
  ADD COLUMN IF NOT EXISTS goodbye_image_url TEXT;

-- CAPTCHA verification tracking table
CREATE TABLE IF NOT EXISTS telegram_captcha_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  mode TEXT DEFAULT 'button',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id, user_id)
);

ALTER TABLE telegram_captcha_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'telegram_captcha_verifications' AND policyname = 'captcha_verifications_session_policy'
  ) THEN
    CREATE POLICY captcha_verifications_session_policy ON telegram_captcha_verifications
      FOR ALL USING (
        session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid())
      );
  END IF;
END $$;
