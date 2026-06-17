-- BotWave Migration 007: Add pairing_code to bot_sessions
-- Bypasses QR scanning for improved reliability

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bot_sessions'
      AND column_name = 'pairing_code'
  ) THEN
    ALTER TABLE public.bot_sessions
      ADD COLUMN pairing_code TEXT;
  END IF;
END
$$;
