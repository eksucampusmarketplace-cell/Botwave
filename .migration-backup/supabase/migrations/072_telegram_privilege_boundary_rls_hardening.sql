-- 072_telegram_privilege_boundary_rls_hardening.sql
--
-- Hardens Telegram RLS boundaries by removing permissive PUBLIC / anon /
-- fully-open authenticated policies on privileged telegram_* tables.
--
-- Goal: direct anon-key writes to Telegram configuration/moderation tables must
-- never succeed. API routes use service_role after app-layer authorization.

DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'telegram_group_configs',
    'telegram_notes',
    'telegram_filters',
    'telegram_scheduled_messages',
    'telegram_moderation_log',
    'telegram_xp',
    'telegram_warnings',
    'telegram_captcha_verifications'
  ]
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);

    FOR pol IN
      SELECT policyname, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
    LOOP
      IF pol.roles IS NULL
        OR 'public' = ANY(pol.roles)
        OR 'anon' = ANY(pol.roles)
        OR (
          'authenticated' = ANY(pol.roles)
          AND lower(trim(COALESCE(pol.qual, ''))) IN ('true', '(true)')
          AND lower(trim(COALESCE(pol.with_check, ''))) IN ('', 'true', '(true)')
        )
      THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol.policyname, tbl);
      END IF;
    END LOOP;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_service_role_all', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_service_all', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'service_role_full_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'service_role_all_' || tbl, tbl);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);',
      tbl || '_service_role_all',
      tbl
    );
  END LOOP;
END $$;
