-- BotWave Migration 020: New Features + Referral System with Fraud Prevention
-- Run this in Supabase SQL Editor

-- ─── Message Templates ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_user_id ON public.message_templates(user_id);

-- ─── Custom Commands ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.custom_commands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  command TEXT NOT NULL,
  response TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'exact' CHECK (match_type IN ('exact', 'contains', 'startsWith')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_commands_user_id ON public.custom_commands(user_id);

-- ─── Chatbot Flows ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chatbot_flows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_flows_user_id ON public.chatbot_flows(user_id);

-- ─── Products (E-commerce) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT -1,
  image_url TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);

-- ─── QR Alert Preferences ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.qr_alert_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  email BOOLEAN NOT NULL DEFAULT true,
  whatsapp BOOLEAN NOT NULL DEFAULT false,
  backup_number TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_alert_prefs_user_id ON public.qr_alert_preferences(user_id);

-- ─── Referrals (with fraud prevention columns) ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  total_referred INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  frozen_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(code);
CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON public.referrals(user_id);

-- ─── Referral History (with fraud tracking) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_email TEXT NOT NULL DEFAULT '',
  reward_amount INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'credited' CHECK (status IN ('credited', 'pending', 'flagged', 'revoked')),
  flagged_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_history_referrer ON public.referral_history(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_history_referred ON public.referral_history(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_history_ip ON public.referral_history(ip_address);

-- Prevent same user being referred twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_history_unique_referred
  ON public.referral_history(referred_user_id);

-- ─── RLS Policies ───────────────────────────────────────────────────────────

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own templates" ON public.message_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own commands" ON public.custom_commands
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own flows" ON public.chatbot_flows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own products" ON public.products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own qr prefs" ON public.qr_alert_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own referral" ON public.referrals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own referral history" ON public.referral_history
  FOR SELECT USING (auth.uid() = referrer_id);

-- Service role full access (API routes use service role key)
CREATE POLICY "Service role full access message_templates" ON public.message_templates
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access custom_commands" ON public.custom_commands
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access chatbot_flows" ON public.chatbot_flows
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access products" ON public.products
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access qr_alert_preferences" ON public.qr_alert_preferences
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access referrals" ON public.referrals
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access referral_history" ON public.referral_history
  FOR ALL USING (true) WITH CHECK (true);

-- ─── Helper function: increment referral stats safely ───────────────────────

CREATE OR REPLACE FUNCTION public.increment_referral_stats(
  p_user_id UUID,
  p_earned INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.referrals
  SET total_referred = total_referred + 1,
      total_earned = total_earned + p_earned
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Helper function: safe reward balance increment ─────────────────────────

CREATE OR REPLACE FUNCTION public.increment_reward_balance(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.reward_balances (user_id, balance, total_earned)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = reward_balances.balance + p_amount,
    total_earned = reward_balances.total_earned + p_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
