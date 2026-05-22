-- 061_telegram_feature_tables.sql
--
-- Backfill migration for Telegram feature tables that were referenced by
-- code (`bot/telegram/handlers/*.ts` + `app/api/telegram/**`) but never
-- declared by any prior migration. Each missing table caused the
-- corresponding feature to silently no-op in production — Supabase client
-- returns `{ data: null, error: 'relation does not exist' }` and most
-- call-sites discard the error.
--
-- Tables created here:
--   - telegram_analytics       (Mini-App Stats tab + /stats /groupstats)
--   - telegram_karma           (+/- reply karma + /karma /mykarma)
--   - telegram_rules           (per-chat group rules used by /start rules_<chatId>)
--   - telegram_feedback        (/feedback command)
--   - telegram_name_history    (name/username change log + /namehistory)
--   - telegram_welcome_messages (per-chat welcome message history; used by /exportconfig)
--
-- Convention matches existing telegram_* tables:
--   - session_id uuid REFERENCES bot_sessions(id) ON DELETE CASCADE
--   - chat_id    text
--   - user_id    text
--
-- All tables have RLS enabled with service-role-only access; the bot runs
-- with the service role key, and end-user reads route through API routes
-- that filter on session_id.

-- ─── telegram_analytics ─────────────────────────────────────────────────────
-- Per-day rollup of message counts, grouped by (session, chat, user, type).
-- Upserted by `processAnalytics()` in bot/telegram/handlers/analytics.ts on
-- every message; read by /stats, /groupstats, and the Mini-App Stats tab.

CREATE TABLE IF NOT EXISTS telegram_analytics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id      text NOT NULL,
  user_id      text NOT NULL,
  date         date NOT NULL,
  message_type text NOT NULL DEFAULT 'message',
  count        integer NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telegram_analytics_unique_bucket
    UNIQUE (session_id, chat_id, user_id, date, message_type)
);

CREATE INDEX IF NOT EXISTS idx_telegram_analytics_session_date
  ON telegram_analytics (session_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_analytics_session_chat_date
  ON telegram_analytics (session_id, chat_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_analytics_session_user_date
  ON telegram_analytics (session_id, user_id, date DESC);

ALTER TABLE telegram_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_telegram_analytics" ON telegram_analytics;
CREATE POLICY "service_role_all_telegram_analytics" ON telegram_analytics
  FOR ALL USING (auth.role() = 'service_role');

-- ─── telegram_karma ─────────────────────────────────────────────────────────
-- Per-user karma score within a chat. Updated by +/- replies (see
-- bot/telegram/handlers/karma.ts::adjustKarma); read by /karma /mykarma.

CREATE TABLE IF NOT EXISTS telegram_karma (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id     text NOT NULL,
  user_id     text NOT NULL,
  score       integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telegram_karma_unique_user UNIQUE (session_id, chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_karma_session_chat_score
  ON telegram_karma (session_id, chat_id, score DESC);

ALTER TABLE telegram_karma ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_telegram_karma" ON telegram_karma;
CREATE POLICY "service_role_all_telegram_karma" ON telegram_karma
  FOR ALL USING (auth.role() = 'service_role');

-- ─── telegram_rules ─────────────────────────────────────────────────────────
-- Per-chat rules text. Read by the /start rules_<chatId> deep-link handler
-- in bot/telegram/handlers/start.ts:240 and exportconfig.ts. The main
-- /setrules /clearrules handler stores per-session rules on
-- telegram_bot_configs.rules_text — this table is the per-chat override.

CREATE TABLE IF NOT EXISTS telegram_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id     text NOT NULL,
  rules_text  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telegram_rules_unique_chat UNIQUE (session_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_rules_session
  ON telegram_rules (session_id);

ALTER TABLE telegram_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_telegram_rules" ON telegram_rules;
CREATE POLICY "service_role_all_telegram_rules" ON telegram_rules
  FOR ALL USING (auth.role() = 'service_role');

-- ─── telegram_feedback ──────────────────────────────────────────────────────
-- User feedback submissions via /feedback. Stored unconditionally even if
-- the log channel / owner DM also receives the message (see
-- bot/telegram/handlers/feedback.ts).

CREATE TABLE IF NOT EXISTS telegram_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  user_id     text NOT NULL,
  user_name   text,
  chat_id     text,
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_feedback_session_created
  ON telegram_feedback (session_id, created_at DESC);

ALTER TABLE telegram_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_telegram_feedback" ON telegram_feedback;
CREATE POLICY "service_role_all_telegram_feedback" ON telegram_feedback
  FOR ALL USING (auth.role() = 'service_role');

-- ─── telegram_name_history ──────────────────────────────────────────────────
-- Snapshot history of user first_name / last_name / username. Append-only;
-- bot inserts a new row whenever it detects a change in any field.
-- Read by /namehistory and the cross-group analytics.

CREATE TABLE IF NOT EXISTS telegram_name_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  user_id     text NOT NULL,
  first_name  text NOT NULL,
  last_name   text,
  username    text,
  change_type text NOT NULL DEFAULT 'initial',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_name_history_session_user_created
  ON telegram_name_history (session_id, user_id, created_at DESC);

ALTER TABLE telegram_name_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_telegram_name_history" ON telegram_name_history;
CREATE POLICY "service_role_all_telegram_name_history" ON telegram_name_history
  FOR ALL USING (auth.role() = 'service_role');

-- ─── telegram_welcome_messages ──────────────────────────────────────────────
-- Per-chat welcome message history. Currently only read by /exportconfig
-- (bot/telegram/handlers/exportconfig.ts). The main welcome flow stores
-- the live message on telegram_group_configs.welcome_msg; this table is
-- the audit / history log for backups and rollbacks.

CREATE TABLE IF NOT EXISTS telegram_welcome_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id       text NOT NULL,
  message_text  text NOT NULL,
  message_type  text NOT NULL DEFAULT 'welcome' CHECK (message_type IN ('welcome', 'goodbye')),
  enabled       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_welcome_messages_session_chat
  ON telegram_welcome_messages (session_id, chat_id);

ALTER TABLE telegram_welcome_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_telegram_welcome_messages" ON telegram_welcome_messages;
CREATE POLICY "service_role_all_telegram_welcome_messages" ON telegram_welcome_messages
  FOR ALL USING (auth.role() = 'service_role');
