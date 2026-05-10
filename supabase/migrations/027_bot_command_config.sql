-- BotWave Migration 027: Bot command configuration table
-- Allows admin to enable/disable commands and set custom responses

CREATE TABLE IF NOT EXISTS public.bot_command_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  command_key TEXT UNIQUE NOT NULL,
  display_name TEXT,
  description TEXT,
  category TEXT DEFAULT 'general',
  enabled BOOLEAN DEFAULT true,
  custom_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_command_config_key ON public.bot_command_config(command_key);

-- Only admins should access this table, so no RLS needed (accessed via service role key)
