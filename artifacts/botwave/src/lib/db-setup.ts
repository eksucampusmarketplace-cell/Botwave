
export const SCHEMA_SQL = `
-- BotWave Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot Sessions table
CREATE TABLE IF NOT EXISTS public.bot_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  session_name TEXT NOT NULL,
  state TEXT DEFAULT 'inactive' CHECK (state IN ('active', 'inactive', 'connecting', 'needs_reauth')),
  auth_state JSONB,
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot Features configuration
CREATE TABLE IF NOT EXISTS public.bot_features (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  feature_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id, feature_name)
);

-- Message history
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  sender_jid TEXT NOT NULL,
  sender_name TEXT,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'sticker', 'document')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_group BOOLEAN DEFAULT false,
  group_jid TEXT
);

-- Auto replies configuration
CREATE TABLE IF NOT EXISTS public.auto_replies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  trigger_keyword TEXT NOT NULL,
  response_text TEXT NOT NULL,
  is_regex BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Welcome messages
CREATE TABLE IF NOT EXISTS public.welcome_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  group_jid TEXT NOT NULL,
  message_text TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Polls
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  group_jid TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  votes JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by_jid TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ
);

-- Game states
CREATE TABLE IF NOT EXISTS public.game_states (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('trivia', 'hangman', 'wordchain', 'numberguess')),
  player_jid TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ
);

-- Leaderboard
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE CASCADE NOT NULL,
  user_jid TEXT NOT NULL,
  user_name TEXT,
  message_count INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_jid)
);

-- Rate Limit Settings
CREATE TABLE IF NOT EXISTS public.rate_limit_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_name TEXT NOT NULL,
  window_ms INTEGER NOT NULL DEFAULT 60000,
  max_requests INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rate limit settings
INSERT INTO public.rate_limit_settings (setting_key, setting_name, window_ms, max_requests, enabled, description) VALUES
  ('signup', 'Sign Up', 0, 0, false, 'Sign up rate limit - 0 means unlimited'),
  ('login', 'Login', 60000, 10, true, 'Login attempts per minute'),
  ('message', 'Messages', 60000, 20, true, 'Messages per minute'),
  ('command', 'Commands', 60000, 30, true, 'Commands per minute'),
  ('download', 'Downloads', 60000, 10, true, 'Downloads per minute')
ON CONFLICT (setting_key) DO NOTHING;

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

-- User Settings table - stores per-user bot preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  groq_api_key TEXT,
  afk_enabled BOOLEAN DEFAULT false,
  afk_message TEXT DEFAULT 'I am currently away',
  bot_name TEXT DEFAULT 'BotWave',
  skip_probability REAL DEFAULT 0.15,
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bot_sessions_user_id ON public.bot_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_features_session_id ON public.bot_features(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_auto_replies_session_id ON public.auto_replies(session_id);
CREATE INDEX IF NOT EXISTS idx_welcome_messages_session_id ON public.welcome_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_polls_session_id ON public.polls(session_id);
CREATE INDEX IF NOT EXISTS idx_game_states_session_id ON public.game_states(session_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_session_id ON public.leaderboard(session_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_session_id ON public.user_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_sender_jid ON public.user_stats(sender_jid);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_afk_states_session_id ON public.afk_states(session_id);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welcome_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afk_states ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for setup)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own sessions" ON public.bot_sessions;
CREATE POLICY "Users can view own sessions" ON public.bot_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own sessions" ON public.bot_sessions;
CREATE POLICY "Users can create own sessions" ON public.bot_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.bot_sessions;
CREATE POLICY "Users can update own sessions" ON public.bot_sessions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.bot_sessions;
CREATE POLICY "Users can delete own sessions" ON public.bot_sessions FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own features" ON public.bot_features;
CREATE POLICY "Users can view own features" ON public.bot_features FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own features" ON public.bot_features;
CREATE POLICY "Users can manage own features" ON public.bot_features FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view rate limit settings" ON public.rate_limit_settings;
CREATE POLICY "Anyone can view rate limit settings" ON public.rate_limit_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage rate limit settings" ON public.rate_limit_settings;
CREATE POLICY "Admins can manage rate limit settings" ON public.rate_limit_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Helper function to check if a column exists
CREATE OR REPLACE FUNCTION check_column_exists(t_name TEXT, c_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = t_name 
      AND column_name = c_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for user_stats
DROP POLICY IF EXISTS "Users can view own user_stats" ON public.user_stats;
CREATE POLICY "Users can view own user_stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage user_stats" ON public.user_stats;
CREATE POLICY "Service role can manage user_stats" ON public.user_stats
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS policies for user_settings
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage user_settings" ON public.user_settings;
CREATE POLICY "Service role can manage user_settings" ON public.user_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS policies for afk_states
DROP POLICY IF EXISTS "Service role can manage afk_states" ON public.afk_states;
CREATE POLICY "Service role can manage afk_states" ON public.afk_states
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
`;

export const REQUIRED_TABLES = [
  'profiles',
  'bot_sessions',
  'bot_features',
  'messages',
  'auto_replies',
  'welcome_messages',
  'polls',
  'game_states',
  'leaderboard',
  'rate_limit_settings',
  'user_stats',
  'user_settings',
  'afk_states',
];
