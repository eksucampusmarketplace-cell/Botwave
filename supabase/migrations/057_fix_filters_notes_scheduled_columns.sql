-- Migration 057: Add missing columns referenced by API routes / bot code
--
-- Background:
--   The Mini-App / dashboard API routes (and one bot insert path) reference
--   columns that were never defined in any prior migration. With RLS now
--   bypassed via the service-role client from `lib/telegram-auth.ts`
--   (introduced in PR #518), those upsert calls actually reach the DB and
--   fail with "column ... does not exist" instead of being silently 401'd.
--
--   This migration adds exactly the columns the application code already
--   tries to write, nothing more.
--
-- Columns:
--   * telegram_filters       — adds media_type, media_file_id, created_by
--   * telegram_notes         — adds media_type, media_file_id, created_by
--   * telegram_scheduled_messages — adds media_url
--
-- `created_by` is TEXT (not BIGINT) on filters/notes because the unified
-- auth helper passes either a Telegram user id (numeric string) or a
-- Supabase auth UUID — TEXT accommodates both without losing information.
-- `telegram_scheduled_messages.created_by` is intentionally left as the
-- existing BIGINT — that table is only written to from the bot today, where
-- the caller is always a Telegram user id.

DO $$
BEGIN
  -- telegram_filters
  ALTER TABLE telegram_filters
    ADD COLUMN IF NOT EXISTS media_type TEXT,
    ADD COLUMN IF NOT EXISTS media_file_id TEXT,
    ADD COLUMN IF NOT EXISTS created_by TEXT;

  -- telegram_notes
  ALTER TABLE telegram_notes
    ADD COLUMN IF NOT EXISTS media_type TEXT,
    ADD COLUMN IF NOT EXISTS media_file_id TEXT,
    ADD COLUMN IF NOT EXISTS created_by TEXT;

  -- telegram_scheduled_messages
  ALTER TABLE telegram_scheduled_messages
    ADD COLUMN IF NOT EXISTS media_url TEXT;
END $$;
