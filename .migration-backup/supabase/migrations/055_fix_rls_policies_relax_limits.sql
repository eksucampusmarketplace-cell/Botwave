-- ============================================================================
-- Migration 055: Fix RLS policies for telegram_bot_configs and new tables
-- ============================================================================

-- Fix: Add authenticated-user policies for telegram_bot_configs and related tables
DO $$
DECLARE
  tbl TEXT;
  pol TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'telegram_bot_configs',
    'telegram_userbot_configs',
    'telegram_warnings',
    'telegram_filters',
    'telegram_notes',
    'telegram_scheduled_posts',
    'telegram_moderation_log'
  ]) LOOP
    -- SELECT
    pol := 'users_read_own_' || tbl;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = tbl AND policyname = pol) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid()))',
        pol, tbl
      );
    END IF;
    -- UPDATE
    pol := 'users_update_own_' || tbl;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = tbl AND policyname = pol) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid()))',
        pol, tbl
      );
    END IF;
    -- INSERT
    pol := 'users_insert_own_' || tbl;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = tbl AND policyname = pol) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid()))',
        pol, tbl
      );
    END IF;
    -- DELETE
    pol := 'users_delete_own_' || tbl;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = tbl AND policyname = pol) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid()))',
        pol, tbl
      );
    END IF;
  END LOOP;
END $$;

-- Fix: Add authenticated-user policies for bot_creations (user_id based)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'bot_creations' AND policyname = 'users_read_own_bot_creations') THEN
    CREATE POLICY users_read_own_bot_creations ON bot_creations FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'bot_creations' AND policyname = 'users_insert_own_bot_creations') THEN
    CREATE POLICY users_insert_own_bot_creations ON bot_creations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'bot_creations' AND policyname = 'users_update_own_bot_creations') THEN
    CREATE POLICY users_update_own_bot_creations ON bot_creations FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- Fix: Add service_role full access to new tables from migration 054
DO $$
DECLARE
  tbl TEXT;
  pol TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'bot_creations',
    'carts',
    'orders',
    'flow_sessions'
  ]) LOOP
    pol := 'service_role_full_' || tbl;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = tbl AND policyname = pol) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        pol, tbl
      );
    END IF;
  END LOOP;
END $$;

-- Fix: Add permissive policies for carts, orders, flow_sessions
-- These tables use user_jid (not user_id), so app layer handles authorization
DO $$
DECLARE
  tbl TEXT;
  pol TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'carts',
    'orders',
    'flow_sessions'
  ]) LOOP
    pol := 'authenticated_access_' || tbl;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = tbl AND policyname = pol) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        pol, tbl
      );
    END IF;
  END LOOP;
END $$;

-- Fix: Ensure telegram_captcha_verifications has proper policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'telegram_captcha_verifications') THEN
    ALTER TABLE telegram_captcha_verifications ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'telegram_captcha_verifications' AND policyname = 'service_role_full_captcha_verif') THEN
      CREATE POLICY service_role_full_captcha_verif ON telegram_captcha_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'telegram_captcha_verifications' AND policyname = 'authenticated_access_captcha_verif') THEN
      CREATE POLICY authenticated_access_captcha_verif ON telegram_captcha_verifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- Add owner_telegram_id to telegram_bot_configs for ownership tracking
ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS owner_telegram_id TEXT;
