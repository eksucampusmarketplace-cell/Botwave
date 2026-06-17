-- User Acquisition Tracking
-- Adds signup source tracking to profiles so admin can see where users come from
-- (referral link, WhatsApp share, web search, direct, etc.)

-- Add tracking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'direct';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_referrer TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Update trigger to also store signup_source from user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, signup_source, signup_referrer, utm_source, utm_medium, utm_campaign)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'signup_source', 'direct'),
    NEW.raw_user_meta_data->>'signup_referrer',
    NEW.raw_user_meta_data->>'utm_source',
    NEW.raw_user_meta_data->>'utm_medium',
    NEW.raw_user_meta_data->>'utm_campaign'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to atomically increment login count + update last_login_at
CREATE OR REPLACE FUNCTION public.increment_login_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET login_count = COALESCE(login_count, 0) + 1,
      last_login_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for admin analytics queries
CREATE INDEX IF NOT EXISTS idx_profiles_signup_source ON public.profiles(signup_source);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);
