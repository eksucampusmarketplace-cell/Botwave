-- ============================================================================
-- Migration 047: Feature Requests Platform
--
-- Stores user-submitted feature suggestions from Telegram, WhatsApp, and web.
-- Groq processes them automatically; admin views responses in dashboard.
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('telegram', 'whatsapp', 'web')),
  description TEXT NOT NULL,
  ai_response TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'needs_review')),
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for admin listing (newest first) and status filtering
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests (status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created ON feature_requests (created_at DESC);

-- RLS: service role only (bot + admin API use service key)
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Service role full access on feature_requests"
  ON feature_requests FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant service role full access
GRANT ALL ON feature_requests TO service_role;
