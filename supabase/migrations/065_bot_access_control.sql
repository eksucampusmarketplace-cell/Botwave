-- 065_bot_access_control.sql
--
-- Adds public/private bot mode with group whitelist/blacklist and an
-- optional user whitelist so bot creators can lock down who can use their
-- bot and which groups it operates in.
--
-- Three knobs surfaced in the dashboard ("Access Control" tab):
--
--   1. `access_mode` on telegram_bot_configs:
--        - 'public'  (default) — anyone can add the bot to any group, anyone
--          can DM the bot. Blocklist still applies.
--        - 'private' — bot only works in groups on `telegram_group_allowlist`
--          and only responds to users in `telegram_user_allowlist` (if any
--          rows exist; otherwise public for DMs but still group-locked).
--
--   2. `telegram_group_allowlist` (private mode):
--        Bot auto-leaves any group not in this list when added.
--        Bot silently ignores all messages in groups not in this list.
--
--   3. `telegram_group_blocklist` (always enforced):
--        Bot auto-leaves these groups when added, even in public mode.
--        Useful for kicking spam groups without flipping the whole bot
--        into private mode.
--
--   4. `telegram_user_allowlist` (private mode, optional):
--        When at least one row exists for a session, ONLY these users can
--        trigger the bot anywhere. Empty list = no user restriction.
--
-- All four are session-scoped (FK -> bot_sessions) so each SaaS user
-- controls their own bot independently.

-- ─── 1. access_mode column on telegram_bot_configs ─────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_bot_configs'
      AND column_name = 'access_mode'
  ) THEN
    ALTER TABLE telegram_bot_configs
      ADD COLUMN access_mode TEXT NOT NULL DEFAULT 'public'
      CHECK (access_mode IN ('public', 'private'));
    COMMENT ON COLUMN telegram_bot_configs.access_mode IS
      'public = anyone can add bot to any group; private = only allowlisted groups/users. Default public for backwards compat.';
  END IF;
END $$;

-- ─── 2. Group allowlist (private mode whitelist) ───────────────────────────

CREATE TABLE IF NOT EXISTS telegram_group_allowlist (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id     TEXT NOT NULL,
  chat_title  TEXT,
  added_by    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_tg_group_allowlist_session
  ON telegram_group_allowlist(session_id);

COMMENT ON TABLE telegram_group_allowlist IS
  'Per-session whitelist of group chat IDs the bot is allowed to operate in (private mode).';

-- ─── 3. Group blocklist (always enforced) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS telegram_group_blocklist (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id     TEXT NOT NULL,
  chat_title  TEXT,
  added_by    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_tg_group_blocklist_session
  ON telegram_group_blocklist(session_id);

COMMENT ON TABLE telegram_group_blocklist IS
  'Per-session blocklist of group chat IDs the bot refuses to operate in (always enforced, even in public mode).';

-- ─── 4. User allowlist (private mode, optional) ────────────────────────────

CREATE TABLE IF NOT EXISTS telegram_user_allowlist (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  user_label  TEXT,
  added_by    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tg_user_allowlist_session
  ON telegram_user_allowlist(session_id);

COMMENT ON TABLE telegram_user_allowlist IS
  'Per-session allowlist of Telegram user IDs that can trigger the bot when access_mode=private. Empty list = no user restriction (group-only gating).';

-- ─── RLS ───────────────────────────────────────────────────────────────────
-- Service-role only; matches the rest of the telegram_* tables.

ALTER TABLE telegram_group_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_group_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_user_allowlist  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'telegram_group_allowlist'
      AND policyname = 'service_role_full_access_group_allowlist'
  ) THEN
    CREATE POLICY service_role_full_access_group_allowlist
      ON telegram_group_allowlist
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'telegram_group_blocklist'
      AND policyname = 'service_role_full_access_group_blocklist'
  ) THEN
    CREATE POLICY service_role_full_access_group_blocklist
      ON telegram_group_blocklist
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'telegram_user_allowlist'
      AND policyname = 'service_role_full_access_user_allowlist'
  ) THEN
    CREATE POLICY service_role_full_access_user_allowlist
      ON telegram_user_allowlist
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
