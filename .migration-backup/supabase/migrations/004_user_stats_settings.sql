-- BotWave Migration 004: User Stats and Settings tables
-- Tracks command usage for promo logic and stores per-user settings (Groq API key)

-- User Stats table - tracks command usage counts for promo logic
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

-- User Settings table - stores per-user bot preferences (Groq API key, etc.)
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

-- AFK states table - tracks which users have AFK mode on per session
CREATE TABLE IF NOT EXISTS public.afk_states (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  user_jid TEXT NOT NULL,
  is_afk BOOLEAN DEFAULT false,
  afk_reason TEXT,
  afk_since TIMESTAMPTZ,
  UNIQUE(session_id, user_jid)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_session_id ON public.user_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_sender_jid ON public.user_stats(sender_jid);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_afk_states_session_id ON public.afk_states(session_id);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afk_states ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_stats
CREATE POLICY "Users can view own user_stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user_stats" ON public.user_stats
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can insert user_stats" ON public.user_stats
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- RLS policies for user_settings
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user_settings" ON public.user_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS policies for afk_states
CREATE POLICY "Service role can manage afk_states" ON public.afk_states
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can insert afk_states" ON public.afk_states
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at triggers
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
