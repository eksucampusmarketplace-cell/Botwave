-- Add qr_generated_at to bot_sessions
ALTER TABLE public.bot_sessions ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMPTZ;
