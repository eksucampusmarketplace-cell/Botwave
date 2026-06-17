-- BotWave Migration 030: Autopilot per-contact overrides
-- Adds contact_overrides JSONB column to autopilot_personas table
-- Stores per-contact autopilot on/off overrides as { "jid": "on"|"off" }

ALTER TABLE public.autopilot_personas
  ADD COLUMN IF NOT EXISTS contact_overrides JSONB DEFAULT '{}'::jsonb;
