-- BotWave Monetization: Dunning System + Trial/Subscription Notifications
-- Migration 021

-- ─── Dunning Attempts ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dunning_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'retry_scheduled', 'recovered', 'downgraded')),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('payment_failed', 'retry_reminder', 'final_warning', 'downgraded')),
  notified_via TEXT CHECK (notified_via IN ('whatsapp', 'email', 'both')),
  next_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Subscription Notifications ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscription_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('trial_expiry_7d', 'trial_expiry_3d', 'trial_expiry_1d', 'trial_expired', 'renewal_reminder', 'quota_80', 'quota_100', 'upgrade_prompt')),
  sent_via TEXT NOT NULL DEFAULT 'whatsapp' CHECK (sent_via IN ('whatsapp', 'email', 'both')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID REFERENCES public.bot_sessions(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'
);

-- Prevent duplicate notifications for same type on same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_notif_user_type_daily
  ON public.subscription_notifications (user_id, notification_type, (sent_at::date));

-- ─── Add trial fields to subscriptions ──────────────────────────────────────

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dunning_status TEXT DEFAULT NULL CHECK (dunning_status IN (NULL, 'active', 'resolved', 'downgraded')),
  ADD COLUMN IF NOT EXISTS failed_payment_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_attempt_at TIMESTAMPTZ;

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_dunning_user_id ON public.dunning_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_dunning_status ON public.dunning_attempts(status) WHERE status NOT IN ('recovered', 'downgraded');
CREATE INDEX IF NOT EXISTS idx_sub_notif_user_id ON public.subscription_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial ON public.subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_dunning ON public.subscriptions(dunning_status) WHERE dunning_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal ON public.subscriptions(next_renewal) WHERE plan != 'free';

-- ─── RLS Policies ───────────────────────────────────────────────────────────

ALTER TABLE public.dunning_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own dunning records
CREATE POLICY "Users can view own dunning"
  ON public.dunning_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.subscription_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (bot uses service role key)
CREATE POLICY "Service role full access dunning"
  ON public.dunning_attempts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access notifications"
  ON public.subscription_notifications FOR ALL
  USING (auth.role() = 'service_role');
