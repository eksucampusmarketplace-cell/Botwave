-- 062_fix_admin_only_mode_and_modlog_drift.sql
--
-- Fixes two pieces of long-standing code-vs-DB drift:
--
-- 1. `admin_only_mode` was supposed to be added to a `telegram_config`
--    table by migration 052. That table never existed (the real table is
--    `telegram_bot_configs`), so the ALTER raised an error inside its
--    DO-block, the column was never created, and the bot's
--    /adminonly toggle in `bot/telegram/utils/db.ts::getAdminOnlyMode /
--    setAdminOnlyMode` has been silently no-op'ing in production.
--
--    This migration adds the column to the correct table. The code
--    change (`telegram_config` -> `telegram_bot_configs` in
--    `bot/telegram/utils/db.ts` lines 2430 and 2442) lands in the same
--    PR.
--
-- 2. `telegram_modlog` / `telegram_mod_log` are referenced by three API
--    routes (`admin-action`, `user-info`, `analytics/summary`) but the
--    real table is `telegram_moderation_log` — already used consistently
--    by the bot's write path (`bot/telegram/utils/db.ts:1289` and
--    elsewhere). No DB change is needed here; the read-side renames also
--    land in this PR. The migration is here so the schema-drift CI
--    treats the historical references as resolved.
--
-- Both fixes are pure rename / column-add. No data backfill is required.

-- ─── 1. Add admin_only_mode to the CORRECT table ───────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_bot_configs'
      AND column_name = 'admin_only_mode'
  ) THEN
    ALTER TABLE telegram_bot_configs
      ADD COLUMN admin_only_mode BOOLEAN NOT NULL DEFAULT FALSE;
    COMMENT ON COLUMN telegram_bot_configs.admin_only_mode IS
      'When TRUE the bot only responds to admins in groups. Set via /adminonly. Was previously stored on the nonexistent telegram_config table (migration 052).';
  END IF;
END $$;

-- ─── 2. No-op marker for telegram_moderation_log ───────────────────────────
-- The table already exists; we don't recreate it. This comment exists so
-- a grep through supabase/migrations/ for "moderation_log" or "modlog"
-- finds the audit history.

DO $$ BEGIN PERFORM 1; END $$;
