-- Migration 013: Add enhanced settings columns to user_settings
-- Adds welcome message template, command prefix, and timezone

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS command_prefix TEXT DEFAULT '!',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT '';
