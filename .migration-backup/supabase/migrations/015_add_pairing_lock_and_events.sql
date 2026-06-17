-- Migration 015: Add pairing lock column and pairing_events audit table
-- Addresses Issues #3, #9, #12 from the pairing audit report.

-- Issue #3: Store pairing lock in DB per worker so cross-worker coordination
-- prevents concurrent pairing attempts from the same server IP.
ALTER TABLE bot_sessions
  ADD COLUMN IF NOT EXISTS pairing_lock_acquired_at TIMESTAMPTZ;

-- Issue #12: Queue position feedback — add a queue_position column
-- so the dashboard can show users their position in the pairing queue.
ALTER TABLE bot_sessions
  ADD COLUMN IF NOT EXISTS queue_position INT DEFAULT NULL;

-- Issue #9: Pairing events audit trail for post-mortem debugging.
CREATE TABLE IF NOT EXISTS pairing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bot_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  worker_url TEXT,
  status_code INT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying by session and time
CREATE INDEX IF NOT EXISTS idx_pairing_events_session_id ON pairing_events(session_id);
CREATE INDEX IF NOT EXISTS idx_pairing_events_created_at ON pairing_events(created_at);

-- RLS: allow service role full access (same pattern as other tables)
ALTER TABLE pairing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage pairing_events"
  ON pairing_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
