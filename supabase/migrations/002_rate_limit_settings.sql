-- Rate Limit Settings table for admin-configurable rate limits
CREATE TABLE IF NOT EXISTS public.rate_limit_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_name TEXT NOT NULL,
  window_ms INTEGER NOT NULL DEFAULT 60000,
  max_requests INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rate limit settings
INSERT INTO public.rate_limit_settings (setting_key, setting_name, window_ms, max_requests, enabled, description) VALUES
  ('signup', 'Sign Up', 0, 0, false, 'Sign up rate limit - 0 means unlimited'),
  ('login', 'Login', 60000, 10, true, 'Login attempts per minute'),
  ('message', 'Messages', 60000, 20, true, 'Messages per minute'),
  ('command', 'Commands', 60000, 30, true, 'Commands per minute'),
  ('download', 'Downloads', 60000, 10, true, 'Downloads per minute')
ON CONFLICT (setting_key) DO NOTHING;

-- RLS for rate_limit_settings - admins only
CREATE POLICY "Admins can manage rate limit settings" ON public.rate_limit_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view rate limit settings" ON public.rate_limit_settings
  FOR SELECT USING (true);
