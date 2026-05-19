-- Migration 044: Audit fixes
-- - Create missing telegram_groups table
-- - Add RLS user policies on Telegram tables (restrict by session_id → user_id)
-- - Add performance indexes
-- - Add telegram_bot_configs missing column safety net

-- ═══════════════════════════════════════════════════════════════
-- 1. Create telegram_groups table (referenced by bot code but never created)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS telegram_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  chat_title TEXT,
  chat_type TEXT,
  added_by_user_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_groups_session ON telegram_groups(session_id);
CREATE INDEX IF NOT EXISTS idx_telegram_groups_active ON telegram_groups(session_id, is_active);

ALTER TABLE telegram_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "service_role_full_telegram_groups"
  ON telegram_groups FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "users_read_own_telegram_groups"
  ON telegram_groups FOR SELECT TO authenticated
  USING (session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "users_update_own_telegram_groups"
  ON telegram_groups FOR UPDATE TO authenticated
  USING (session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- 2. Add user-facing RLS policies on existing Telegram tables
--    (service_role already has full access from migration 033)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl TEXT;
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
    -- SELECT: users can only read rows for their own sessions
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "users_read_own_%s" ON %I FOR SELECT TO authenticated USING (session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid()))',
      tbl, tbl
    );
    -- UPDATE: users can only update rows for their own sessions
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "users_update_own_%s" ON %I FOR UPDATE TO authenticated USING (session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid()))',
      tbl, tbl
    );
    -- INSERT: users can only insert rows for their own sessions
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "users_insert_own_%s" ON %I FOR INSERT TO authenticated WITH CHECK (session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid()))',
      tbl, tbl
    );
    -- DELETE: users can only delete rows for their own sessions
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "users_delete_own_%s" ON %I FOR DELETE TO authenticated USING (session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid()))',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Also add RLS to tables from later migrations that may be missing policies
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'telegram_group_configs',
    'telegram_xp',
    'telegram_approved_users',
    'telegram_reports',
    'telegram_locks',
    'telegram_group_stats'
  ]) LOOP
    -- Only create if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

      EXECUTE format(
        'CREATE POLICY IF NOT EXISTS "service_role_full_%s" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        tbl, tbl
      );
      EXECUTE format(
        'CREATE POLICY IF NOT EXISTS "users_read_own_%s" ON %I FOR SELECT TO authenticated USING (session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid()))',
        tbl, tbl
      );
      EXECUTE format(
        'CREATE POLICY IF NOT EXISTS "users_update_own_%s" ON %I FOR UPDATE TO authenticated USING (session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid()))',
        tbl, tbl
      );
    END IF;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. Performance indexes on high-query tables
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_session_timestamp
  ON messages(session_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_telegram_group_configs_session_chat
  ON telegram_group_configs(session_id, chat_id);

-- XP index (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'telegram_xp') THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_telegram_xp_session_chat ON telegram_xp(session_id, chat_id)';
  END IF;
END $$;

-- Bot sessions index for common lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bot_sessions_user_platform
  ON bot_sessions(user_id, platform);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bot_sessions_state
  ON bot_sessions(state) WHERE state IN ('active', 'connecting', 'qr_pending');
