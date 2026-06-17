-- Migration 060: actually create bot_sessions.botfather_reminder_sent.
--
-- Background:
--   Migration 052 (`bot_ignored_chats_and_admin_mode.sql`) intended to add
--   this column inside a DO block. However the *previous* DO block in the
--   same migration references `telegram_config` (a table that does not
--   exist in this schema — the real per-session config table is
--   `telegram_bot_configs`). Postgres aborts the whole migration on
--   "relation telegram_config does not exist", so the third DO block
--   (adding `botfather_reminder_sent`) never runs.
--
--   Consequence on production: the @BotFather Setup Reminder DM logic in
--   bot/telegram/manager.ts::sendBotFatherReminder() reads/writes a column
--   that doesn't exist. The Supabase client swallows the error, so
--   `session?.botfather_reminder_sent` is always undefined → falsy → the
--   reminder is re-sent to the owner on every bot restart. Verified live
--   on the Contabo VPS on 2026-05-22 by checking information_schema.
--
--   This migration adds the column directly (no DO-block wrapper, so it
--   can't be skipped by an upstream failure) and backfills existing
--   sessions to `TRUE` so the spam stops at next restart. New sessions
--   created from this point still receive the reminder exactly once.
--
--   The admin_only_mode mis-wiring on `telegram_config` is a separate
--   bug (the code in bot/telegram/utils/db.ts references the same wrong
--   table); fixing that requires both a code change and a migration that
--   adds the column to the *right* table, so it's deliberately out of
--   scope here and tracked in the wiring audit.

ALTER TABLE public.bot_sessions
  ADD COLUMN IF NOT EXISTS botfather_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.bot_sessions.botfather_reminder_sent IS
  'Once true, the TelegramBot wrapper skips sending the @BotFather setup '
  'reminder DM. Originally declared (but un-applied) in migration 052.';

-- Backfill: all sessions that already exist must have already received
-- the reminder one or more times (often many) before this column existed,
-- so mark them as sent. Without this backfill the next restart would fire
-- the reminder again for every existing session.
UPDATE public.bot_sessions
   SET botfather_reminder_sent = TRUE
 WHERE botfather_reminder_sent = FALSE;
