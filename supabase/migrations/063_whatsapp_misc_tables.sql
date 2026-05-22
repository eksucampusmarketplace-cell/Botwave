-- 063_whatsapp_misc_tables.sql
--
-- Backfill for the last 3 missing tables surfaced in the 2026-05-22
-- wiring audit. All three are referenced by code (WhatsApp bot
-- commands + email pipeline) but were never declared in any prior
-- supabase migration. Calls have been silently no-op'ing in production.
--
-- Tables added here:
--   - schedule_templates       (WhatsApp /schedule template save/list/use)
--   - email_bounces            (Postal bounce webhook + bounce suppression)
--   - bank_cashout_requests    (WhatsApp /cashout bank-transfer flow)
--
-- A 4th audit entry, `uploads`, was a false positive \u2014 the code
-- (\`app/api/telegram/userbot/upload/route.ts\`) calls
-- \`supabase.storage.from('uploads')\` (a Storage bucket), not
-- \`supabase.from('uploads')\` (a Postgres table). The schema-drift CI
-- script is updated in the same PR to skip \`.storage.from(...)\`.

-- ─── schedule_templates ─────────────────────────────────────────────────────
-- Reusable WhatsApp schedule templates. CRUD'd from
-- bot/whatsapp/commands/productivity.ts:
--   !schedule template save <name> <interval> <message>
--   !schedule template list
--   !schedule template use <name>
-- Saved per phone_number (not session_id) because a single bot session
-- can serve multiple chats and users may want personal templates.

CREATE TABLE IF NOT EXISTS schedule_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid REFERENCES bot_sessions(id) ON DELETE CASCADE,
  phone_number  text NOT NULL,
  name          text NOT NULL,
  interval      text NOT NULL,
  message       text NOT NULL,
  chat_jid      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_templates_unique_name UNIQUE (phone_number, name)
);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_phone
  ON schedule_templates (phone_number);

ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_schedule_templates" ON schedule_templates;
CREATE POLICY "service_role_all_schedule_templates" ON schedule_templates
  FOR ALL USING (auth.role() = 'service_role');

-- ─── email_bounces ──────────────────────────────────────────────────────────
-- Records hard/soft bounce events from the email pipeline (Postal/SES
-- webhook \u2192 app/api/email/bounce/route.ts \u2192 lib/email/bounce.ts).
-- A recipient with any 'hard' bounce is suppressed from future sends by
-- isRecipientBounced(). Without this table the suppression check
-- returns 0 and hard-bounced addresses keep getting emailed, which can
-- damage sender reputation.

CREATE TABLE IF NOT EXISTS email_bounces (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient     text NOT NULL,
  bounce_type   text NOT NULL CHECK (bounce_type IN ('hard', 'soft')),
  reason        text,
  source        text NOT NULL DEFAULT 'unknown',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_bounces_recipient_type
  ON email_bounces (recipient, bounce_type);
CREATE INDEX IF NOT EXISTS idx_email_bounces_created
  ON email_bounces (created_at DESC);

ALTER TABLE email_bounces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_email_bounces" ON email_bounces;
CREATE POLICY "service_role_all_email_bounces" ON email_bounces
  FOR ALL USING (auth.role() = 'service_role');

-- ─── bank_cashout_requests ─────────────────────────────────────────────────
-- Bank-transfer cashout requests from the WhatsApp reward flow
-- (bot/whatsapp/commands/admin.ts). Customers earn reward credits and
-- redeem to a Nigerian bank account; this table is the queue an admin
-- works through to actually wire the money.
--
-- `status` workflow: pending \u2192 processing \u2192 (paid | rejected | cancelled).

CREATE TABLE IF NOT EXISTS bank_cashout_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid,
  phone_number    text NOT NULL,
  bank_name       text NOT NULL,
  account_number  text NOT NULL,
  account_name    text NOT NULL,
  amount          numeric(12, 2) NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'paid', 'rejected', 'cancelled')),
  notes           text,
  processed_by    uuid,
  processed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_cashout_requests_status_created
  ON bank_cashout_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_cashout_requests_phone
  ON bank_cashout_requests (phone_number);

ALTER TABLE bank_cashout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_bank_cashout_requests" ON bank_cashout_requests;
CREATE POLICY "service_role_all_bank_cashout_requests" ON bank_cashout_requests
  FOR ALL USING (auth.role() = 'service_role');
