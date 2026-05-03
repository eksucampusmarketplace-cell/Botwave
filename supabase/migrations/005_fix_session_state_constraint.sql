-- Fix: Add 'disconnected' to bot_sessions state CHECK constraint
-- The bot code sets state to 'disconnected' when max reconnect attempts are reached,
-- but the original CHECK constraint did not include it, causing silent DB errors.

ALTER TABLE public.bot_sessions DROP CONSTRAINT IF EXISTS bot_sessions_state_check;
ALTER TABLE public.bot_sessions ADD CONSTRAINT bot_sessions_state_check
  CHECK (state IN ('active', 'inactive', 'qr_pending', 'needs_reauth', 'disconnected'));
