-- Add worker_url column for multi-worker IP rotation
-- NULL means the session is handled by the main service
-- A URL means requests should be forwarded to that worker
ALTER TABLE bot_sessions ADD COLUMN IF NOT EXISTS worker_url TEXT;

-- Add last_ping column for worker health tracking
ALTER TABLE bot_sessions ADD COLUMN IF NOT EXISTS last_ping TIMESTAMPTZ;

-- Index for fast worker-based session lookups
CREATE INDEX IF NOT EXISTS idx_bot_sessions_worker ON bot_sessions(worker_url);
