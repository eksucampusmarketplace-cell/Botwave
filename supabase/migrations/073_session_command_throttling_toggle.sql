-- 073_session_command_throttling_toggle.sql
--
-- Adds per-session command throttling toggle shared by WhatsApp and Telegram pipelines.
-- Product direction: default OFF (free/open) unless explicitly enabled per session.

DO $$
BEGIN
  IF to_regclass('public.bot_sessions') IS NULL THEN
    RAISE NOTICE 'bot_sessions table not found; skipping command throttling migration';
    RETURN;
  END IF;

  ALTER TABLE public.bot_sessions
    ADD COLUMN IF NOT EXISTS command_throttling_enabled BOOLEAN;

  UPDATE public.bot_sessions
  SET command_throttling_enabled = false
  WHERE command_throttling_enabled IS NULL;

  ALTER TABLE public.bot_sessions
    ALTER COLUMN command_throttling_enabled SET DEFAULT false;

  ALTER TABLE public.bot_sessions
    ALTER COLUMN command_throttling_enabled SET NOT NULL;

  COMMENT ON COLUMN public.bot_sessions.command_throttling_enabled IS
    'Per-session command throttling guard toggle. false = free/open command usage (default), true = enforce command throttling guard.';
END $$;