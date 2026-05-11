-- BotWave Migration 029: Autopilot Persona System
-- Stores persona profiles (learned style + self-description) and chat samples for AI cloning

CREATE TABLE IF NOT EXISTS public.autopilot_personas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  -- Self-described persona
  self_description TEXT DEFAULT '',
  -- AI-analyzed writing style profile (JSON)
  style_profile JSONB DEFAULT '{}'::jsonb,
  -- Collected sample messages for style learning
  sample_messages JSONB DEFAULT '[]'::jsonb,
  -- Settings
  enabled BOOLEAN DEFAULT false,
  mode TEXT DEFAULT 'offline',
  reply_delay_minutes INTEGER DEFAULT 3,
  inactivity_minutes INTEGER DEFAULT 5,
  max_daily_replies INTEGER DEFAULT 30,
  daily_replies_used INTEGER DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_autopilot_personas_user ON public.autopilot_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_personas_session ON public.autopilot_personas(session_id);

ALTER TABLE public.autopilot_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage autopilot_personas" ON public.autopilot_personas;
CREATE POLICY "Service role can manage autopilot_personas" ON public.autopilot_personas
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
