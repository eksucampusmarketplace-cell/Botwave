-- Migration 073: per-session command throttling toggle (free/open mode).
-- Deployed web builds reference bot_sessions.command_throttling_enabled;
-- without this column GET /api/bot/sessions fails with SQLSTATE 42703.

ALTER TABLE public.bot_sessions
  ADD COLUMN IF NOT EXISTS command_throttling_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.bot_sessions.command_throttling_enabled IS
  'When true, per-user command rate limits apply. When false, open/free mode for the session.';
