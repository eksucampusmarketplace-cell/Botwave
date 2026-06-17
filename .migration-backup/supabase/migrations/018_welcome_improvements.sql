-- BotWave Migration 018: Welcome message improvements
-- Adds unique constraint, message_type column for goodbye support

-- Add unique constraint so upsert works correctly
ALTER TABLE public.welcome_messages
  ADD CONSTRAINT unique_welcome_session_group_type UNIQUE (session_id, group_jid);

-- Add message_type to distinguish welcome vs goodbye messages
-- Default 'welcome' for existing rows
ALTER TABLE public.welcome_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'welcome' CHECK (message_type IN ('welcome', 'goodbye'));

-- Drop the old unique and recreate with message_type included
ALTER TABLE public.welcome_messages
  DROP CONSTRAINT IF EXISTS unique_welcome_session_group_type;

ALTER TABLE public.welcome_messages
  ADD CONSTRAINT unique_welcome_session_group_type UNIQUE (session_id, group_jid, message_type);
