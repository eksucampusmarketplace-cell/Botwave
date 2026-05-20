-- Add custom proxy support to bot_sessions.
-- Users can bring their own proxy (BYOP) instead of using the shared pool.

ALTER TABLE public.bot_sessions
  ADD COLUMN IF NOT EXISTS proxy_type TEXT DEFAULT 'shared'
    CHECK (proxy_type IN ('shared', 'custom')),
  ADD COLUMN IF NOT EXISTS proxy_host TEXT,
  ADD COLUMN IF NOT EXISTS proxy_port TEXT,
  ADD COLUMN IF NOT EXISTS proxy_username TEXT,
  ADD COLUMN IF NOT EXISTS proxy_password TEXT;

COMMENT ON COLUMN public.bot_sessions.proxy_type IS 'shared = use BotWave pool, custom = user-provided proxy';
