-- Migration 058: persistent email broadcast log + unsubscribe table.
--
-- These tables are referenced by app/api/admin/email-broadcast/route.ts
-- and lib/email/bounce.ts but were never created by a migration. The
-- in-memory dedup map keeps the system mostly correct, but every restart
-- wipes the cooldown window, and the unsubscribe check was silently
-- failing in production.
--
-- Creating both with the same shape the route already expects so no app
-- code needs to change to use them.

-- ═══════════════════════════════════════════════════════════════
-- 1. email_broadcast_log — per-recipient send history for dedup + audit
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.email_broadcast_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  job_id UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cooldown lookups (campaign_type + user_id + sent_at) are the hottest
-- path — the dedup query scans by these three columns every send.
CREATE INDEX IF NOT EXISTS idx_email_broadcast_log_dedup
  ON public.email_broadcast_log (campaign_type, status, user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_broadcast_log_last_run
  ON public.email_broadcast_log (campaign_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 2. email_unsubscribes — opt-out list (lowercase email PK)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  email TEXT PRIMARY KEY,
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 3. RLS — service role only; users access nothing here
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.email_broadcast_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- No policies = no public access. The service-role key bypasses RLS and is
-- the only thing that writes/reads these tables.
