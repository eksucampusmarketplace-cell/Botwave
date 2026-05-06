-- BotWave Monetization: Subscriptions, Payments, and Rewards
-- Migration 019

-- ─── Subscriptions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'lite', 'standard', 'boss')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  quota_limit INTEGER NOT NULL DEFAULT 300,
  quota_used INTEGER NOT NULL DEFAULT 0,
  session_limit INTEGER NOT NULL DEFAULT 1,
  ai_daily_limit INTEGER NOT NULL DEFAULT 10,
  billing_start TIMESTAMPTZ DEFAULT NOW(),
  next_renewal TIMESTAMPTZ,
  squad_transaction_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Payments ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  squad_transaction_ref TEXT UNIQUE,
  squad_gateway_ref TEXT,
  payment_channel TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reward Balances ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reward_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_cashed_out INTEGER NOT NULL DEFAULT 0,
  last_cashout_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reward Transactions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reward_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Signup Bonuses (Airtime Cashouts) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.airtime_cashouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 100,
  network TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  inlomax_reference TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate cashouts to same phone in short window (1 per day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_airtime_cashout_daily
  ON public.airtime_cashouts (user_id, phone_number, (created_at::date))
  WHERE status = 'success';

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_squad_ref ON public.payments(squad_transaction_ref);
CREATE INDEX IF NOT EXISTS idx_reward_balances_user_id ON public.reward_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_user_id ON public.reward_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_created ON public.reward_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_airtime_cashouts_user_id ON public.airtime_cashouts(user_id);

-- ─── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airtime_cashouts ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reward balance" ON public.reward_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reward transactions" ON public.reward_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own cashouts" ON public.airtime_cashouts
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (bot backend uses service role key)
CREATE POLICY "Service role full access subscriptions" ON public.subscriptions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access payments" ON public.payments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access reward_balances" ON public.reward_balances
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access reward_transactions" ON public.reward_transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access airtime_cashouts" ON public.airtime_cashouts
  FOR ALL USING (true) WITH CHECK (true);
