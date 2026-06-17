-- Migration: Add pairing_retries column and pairing_failed state.
--
-- Background: `bot/database.ts::expireStuckPairingSessions` reads/writes a
-- `pairing_retries` column on `bot_sessions` and transitions stuck sessions
-- to a `pairing_failed` state. The original column/state were declared in
-- `migrations/004_platform_column.sql` (an older, pre-Supabase migration
-- directory) and that file was never folded into the Supabase migration
-- chain, so production databases provisioned from supabase/migrations are
-- missing both.
--
-- Symptoms before this migration:
--   ERROR:  column bot_sessions.pairing_retries does not exist
--   (every minute, from PostgREST during the cleanup loop)
--
-- This migration is idempotent and safe to run on databases that already
-- have the column (it'll be a no-op there).

-- 1. Add pairing_retries column (default 0).
ALTER TABLE bot_sessions
  ADD COLUMN IF NOT EXISTS pairing_retries INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN bot_sessions.pairing_retries IS
  'Number of consecutive pairing failures. After 3, session moves to pairing_failed state.';

-- 2. Allow 'pairing_failed' in the bot_sessions.state check constraint.
DO $$
DECLARE
  constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid)
    INTO constraint_def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'bot_sessions'
    AND c.conname = 'bot_sessions_state_check';

  IF constraint_def IS NOT NULL AND constraint_def NOT LIKE '%pairing_failed%' THEN
    ALTER TABLE bot_sessions DROP CONSTRAINT bot_sessions_state_check;
    ALTER TABLE bot_sessions
      ADD CONSTRAINT bot_sessions_state_check
      CHECK (state = ANY (ARRAY[
        'qr_pending'::text,
        'pairing_sent'::text,
        'pairing_failed'::text,
        'active'::text,
        'inactive'::text,
        'disconnected'::text,
        'needs_reauth'::text
      ]));
  END IF;
END $$;
