-- 066_tycoon_signups.sql
--
-- Coming-soon lander signup capture for Cosa Nostra Tycoon.
--
-- §33.2 Day 3-7 ("validate distribution before building") needs a place
-- to record interested users *before* the game backend ships. We ask for
-- a Telegram @-handle (the only thing we need to DM at launch) and an
-- optional email. Both are unique-on-lower-case to dedupe.
--
-- The lander runs an A/B between the Cosa Nostra theme and a softer
-- neutral theme (§32.3.3 mitigation for the 20-30% theme reach hit);
-- the chosen variant is stored on each row so we can compare conversion.
--
-- This is the only schema this PR touches. The full V1 game schema
-- (players, families, cities, raids) ships in the V1-foundation PR.

CREATE TABLE IF NOT EXISTS tycoon_signups (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_username   TEXT,
  telegram_user_id    BIGINT,
  email               TEXT,
  -- A/B bucket. Free-text so we can add more variants without a migration.
  theme_variant       TEXT NOT NULL DEFAULT 'cosa-nostra',
  -- Attribution: where did the user land from?
  -- e.g. 'botwave-dm', 'partner-bot:<name>', 'twitter', 'direct'
  source              TEXT,
  -- Free-form for utm params, referrer, A/B bucket, etc.
  meta                JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- IP truncated to /24 in app code; never store the raw IP for GDPR.
  ip_prefix           TEXT,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tycoon_signups_created
  ON tycoon_signups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tycoon_signups_theme
  ON tycoon_signups(theme_variant);
CREATE INDEX IF NOT EXISTS idx_tycoon_signups_source
  ON tycoon_signups(source);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tycoon_signups_username
  ON tycoon_signups(LOWER(telegram_username))
  WHERE telegram_username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tycoon_signups_email
  ON tycoon_signups(LOWER(email))
  WHERE email IS NOT NULL;

ALTER TABLE tycoon_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_tycoon_signups" ON tycoon_signups
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Page-view / signup analytics ─────────────────────────────────────
-- Lightweight server-side events for the lander. The G0 demand gate
-- (§33.4) needs landing tap-through and signup rate; these rows are the
-- ground truth for those metrics.

CREATE TABLE IF NOT EXISTS tycoon_lander_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind            TEXT NOT NULL,              -- 'view' | 'signup' | 'dismiss'
  theme_variant   TEXT,
  source          TEXT,
  -- session-scoped anonymous id so we can dedupe views from the same
  -- browser within a window without storing PII.
  client_id       TEXT,
  meta            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tycoon_lander_events_created
  ON tycoon_lander_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tycoon_lander_events_kind
  ON tycoon_lander_events(kind, created_at DESC);

ALTER TABLE tycoon_lander_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_tycoon_lander_events" ON tycoon_lander_events
  FOR ALL USING (auth.role() = 'service_role');
