-- 070_telegram_group_admin_only_and_rls.sql
--
-- Two related fixes from the Telegram architecture audit:
--
-- 1. Add per-group columns that the mini-app / dashboard already POST
--    but that did not exist on `telegram_group_configs`. Without these
--    columns the column whitelist in `lib/telegram-valid-columns.ts`
--    silently strips them and the save appears to succeed but writes
--    nothing.
--
--    Columns added (all NULL-default so existing rows continue to work):
--      - welcome_image_url    (per-group welcome image override)
--      - goodbye_image_url    (per-group goodbye image override)
--      - announce_channel_id  (per-group log/announce channel override)
--      - admin_only_mode      (per-group /adminonly toggle — previously
--                              stored bot-wide on telegram_bot_configs,
--                              which leaked the setting across every
--                              group on the same bot)
--
-- 2. Tighten RLS on `telegram_group_configs`, `telegram_notes`,
--    `telegram_filters`, `telegram_scheduled_messages`,
--    `telegram_moderation_log`, `telegram_xp`, and
--    `telegram_warnings` so the public `anon` key cannot bypass our
--    `authorizeTelegramRequest` checks.
--
--    Previous policies used `FOR ALL USING (true) WITH CHECK (true)`
--    with no `TO` clause, which grants PUBLIC access — RLS was
--    effectively disabled for any client that reached the table with
--    the anon key.
--
--    New policies grant FULL access to the `service_role` (which is
--    what the API uses after authorizing the caller) and DENY all
--    access to `anon` and `authenticated`. API routes already use the
--    service-role admin client; cookie-bound `authenticated` callers
--    flow through the same API surface.

-- ─── 1. Add missing per-group columns ──────────────────────────────────────

ALTER TABLE telegram_group_configs
  ADD COLUMN IF NOT EXISTS welcome_image_url TEXT,
  ADD COLUMN IF NOT EXISTS goodbye_image_url TEXT,
  ADD COLUMN IF NOT EXISTS announce_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS admin_only_mode BOOLEAN DEFAULT false;

COMMENT ON COLUMN telegram_group_configs.admin_only_mode IS
  'Per-group equivalent of telegram_bot_configs.admin_only_mode. When true the bot only responds to admins IN THIS CHAT. Set via /adminonly. Migrated to per-group scope in audit fix 070.';

-- ─── 2. Tighten RLS ────────────────────────────────────────────────────────
-- Helper: drop a policy if it exists, then create a service-role-only policy.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'telegram_group_configs',
    'telegram_notes',
    'telegram_filters',
    'telegram_scheduled_messages',
    'telegram_moderation_log',
    'telegram_xp',
    'telegram_warnings'
  ]
  LOOP
    -- Skip silently if the table doesn't exist yet (defensive for
    -- environments running a partial migration sequence).
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = t
    ) THEN
      CONTINUE;
    END IF;

    -- Always ensure RLS is on.
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);

    -- Drop any existing "public" policies that grant access to anon/authenticated.
    -- We keep a single service-role policy.
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I;',
      t || '_service_all',
      t
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I;',
      t || '_anon_all',
      t
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I;',
      t || '_authenticated_all',
      t
    );

    -- Service role: full access (this is what API routes use after auth).
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);',
      t || '_service_all',
      t
    );
  END LOOP;
END $$;

-- Note: we intentionally do NOT call FORCE ROW LEVEL SECURITY here.
-- Supabase's `service_role` has BYPASSRLS by default, and forcing RLS on
-- the table owner could break the API surface in environments where the
-- DB owner roles differ. The explicit service-role policy above is the
-- belt-and-suspenders against accidental BYPASSRLS revocation.
