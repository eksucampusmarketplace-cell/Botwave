-- ============================================================================
-- Migration 014: API Keys + Persistent Audit Log
-- Copy-paste this entire block into your Supabase SQL Editor and run it.
-- ============================================================================

-- API keys table for webhook/API access
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  permissions TEXT[] NOT NULL DEFAULT ARRAY['read']::TEXT[],
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);

-- Persistent audit log table (replaces in-memory audit log)
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- RLS policies
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role full access api_keys" ON public.api_keys
    FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access admin_audit_log" ON public.admin_audit_log
    FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
