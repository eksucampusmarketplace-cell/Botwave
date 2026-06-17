-- ============================================================================
-- Migration 048: Translation Cache for Multilingual Content
--
-- Caches translated versions of content for SEO and performance.
-- Used by the website to serve pre-translated content to crawlers.
-- ============================================================================

CREATE TABLE IF NOT EXISTS translation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT NOT NULL,
  source_lang TEXT NOT NULL DEFAULT 'en',
  target_lang TEXT NOT NULL,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '7 days',
  UNIQUE(content_hash, target_lang)
);

CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup
  ON translation_cache (content_hash, target_lang);

CREATE INDEX IF NOT EXISTS idx_translation_cache_expiry
  ON translation_cache (expires_at)
  WHERE expires_at < now();

-- RLS: service role only
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Service role full access on translation_cache"
  ON translation_cache FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON translation_cache TO service_role;
