-- BotWave Migration 006: Complete schema + private-chat support
--
-- 1. Ensures user_stats, user_settings, and afk_states tables exist
--    (covers the case where migration 004 was never applied)
-- 2. Adds skip_probability column to user_settings so the account owner
--    can control the read-but-skip percentage (default 0.15 = 15%)

-- ─── Ensure migration-004 tables exist ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  sender_jid TEXT NOT NULL,
  sticker_count INTEGER DEFAULT 0,
  doc_count INTEGER DEFAULT 0,
  translate_count INTEGER DEFAULT 0,
  img2text_count INTEGER DEFAULT 0,
  total_commands INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, sender_jid)
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  groq_api_key TEXT,
  afk_enabled BOOLEAN DEFAULT false,
  afk_message TEXT DEFAULT 'I am currently away',
  bot_name TEXT DEFAULT 'BotWave',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.afk_states (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  user_jid TEXT NOT NULL,
  is_afk BOOLEAN DEFAULT false,
  afk_reason TEXT,
  afk_since TIMESTAMPTZ,
  UNIQUE(session_id, user_jid)
);

-- ─── Indexes (IF NOT EXISTS keeps this idempotent) ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_stats_session_id ON public.user_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_sender_jid ON public.user_stats(sender_jid);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_afk_states_session_id ON public.afk_states(session_id);

-- ─── RLS (no-op if already enabled) ───────────────────────────────────────────

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afk_states ENABLE ROW LEVEL SECURITY;

-- Policies — DROP IF EXISTS then CREATE to stay idempotent

DROP POLICY IF EXISTS "Users can view own user_stats" ON public.user_stats;
CREATE POLICY "Users can view own user_stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage user_stats" ON public.user_stats;
CREATE POLICY "Service role can manage user_stats" ON public.user_stats
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role can insert user_stats" ON public.user_stats;
CREATE POLICY "Service role can insert user_stats" ON public.user_stats
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage user_settings" ON public.user_settings;
CREATE POLICY "Service role can manage user_settings" ON public.user_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role can manage afk_states" ON public.afk_states;
CREATE POLICY "Service role can manage afk_states" ON public.afk_states
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role can insert afk_states" ON public.afk_states;
CREATE POLICY "Service role can insert afk_states" ON public.afk_states
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ─── New column: skip_probability ─────────────────────────────────────────────
-- Lets the account owner control the 15% read-but-skip chance.
-- Default 0.15 = 15%. Range 0.0 (never skip) to 1.0 (always skip).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_settings'
      AND column_name = 'skip_probability'
  ) THEN
    ALTER TABLE public.user_settings
      ADD COLUMN skip_probability REAL DEFAULT 0.15;
  END IF;
END
$$;
