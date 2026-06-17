-- Heartbeat and lock fields for idempotent session management.
-- locked_by: which service instance currently owns this session's bot
-- locked_at: when the lock was acquired (stale locks auto-expire)
-- heartbeat_at: last time the bot process confirmed it's alive

ALTER TABLE public.bot_sessions
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bot_sessions_locked_by ON public.bot_sessions(locked_by);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_heartbeat ON public.bot_sessions(heartbeat_at);
