-- BotWave Migration 017: Bot Health Events
-- Tracks connection events, errors, and reconnects for the health dashboard

CREATE TABLE IF NOT EXISTS public.bot_health_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('connected', 'disconnected', 'reconnecting', 'error', 'message_sent', 'message_failed', 'webhook_retry', 'webhook_dead_letter')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook retry queue for failed webhook deliveries
CREATE TABLE IF NOT EXISTS public.webhook_retry_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'dead_letter', 'completed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_health_events_session_id ON public.bot_health_events(session_id);
CREATE INDEX IF NOT EXISTS idx_health_events_created_at ON public.bot_health_events(created_at);
CREATE INDEX IF NOT EXISTS idx_health_events_type ON public.bot_health_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_retry_status ON public.webhook_retry_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_retry_session ON public.webhook_retry_queue(session_id);

-- Auto-cleanup: only keep health events for last 30 days (run periodically)
-- This is a helper function, not auto-scheduled — call from a cron or manual cleanup.
CREATE OR REPLACE FUNCTION cleanup_old_health_events() RETURNS void AS $$
BEGIN
  DELETE FROM public.bot_health_events WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM public.webhook_retry_queue WHERE status IN ('completed', 'dead_letter') AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.bot_health_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_retry_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Service role can manage bot_health_events" ON public.bot_health_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage webhook_retry_queue" ON public.webhook_retry_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can view health events for their own sessions
CREATE POLICY "Users can view own health events" ON public.bot_health_events
  FOR SELECT USING (
    session_id IN (SELECT id FROM public.bot_sessions WHERE user_id = auth.uid())
  );
