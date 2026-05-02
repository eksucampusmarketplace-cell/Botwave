-- BotWave Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot Sessions table
CREATE TABLE IF NOT EXISTS public.bot_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  session_name TEXT NOT NULL,
  state TEXT DEFAULT 'qr_pending' CHECK (state IN ('active', 'inactive', 'qr_pending')),
  qr_code TEXT,
  qr_expires_at TIMESTAMPTZ,
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

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welcome_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only view/edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Bot Sessions: Users can only access their own sessions
CREATE POLICY "Users can view own sessions" ON public.bot_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON public.bot_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.bot_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.bot_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Bot Features: Users can only access their own features
CREATE POLICY "Users can view own features" ON public.bot_features
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own features" ON public.bot_features
  FOR ALL USING (auth.uid() = user_id);

-- Messages: Users can only view messages from their sessions
CREATE POLICY "Users can view own session messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bot_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Auto Replies: Users can only manage their own auto replies
CREATE POLICY "Users can view own auto replies" ON public.auto_replies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own auto replies" ON public.auto_replies
  FOR ALL USING (auth.uid() = user_id);

-- Welcome Messages: Users can only manage their own welcome messages
CREATE POLICY "Users can view own welcome messages" ON public.welcome_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own welcome messages" ON public.welcome_messages
  FOR ALL USING (auth.uid() = user_id);

-- Polls: Users can only view polls from their sessions
CREATE POLICY "Users can view own session polls" ON public.polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bot_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own session polls" ON public.polls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bot_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Game States: Users can only access their session games
CREATE POLICY "Users can view own session games" ON public.game_states
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bot_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own session games" ON public.game_states
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.bot_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Leaderboard: Users can only view their session leaderboards
CREATE POLICY "Users can view own session leaderboard" ON public.leaderboard
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bot_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own session leaderboard" ON public.leaderboard
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bot_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_sessions_updated_at
  BEFORE UPDATE ON public.bot_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_features_updated_at
  BEFORE UPDATE ON public.bot_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auto_replies_updated_at
  BEFORE UPDATE ON public.auto_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_welcome_messages_updated_at
  BEFORE UPDATE ON public.welcome_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();