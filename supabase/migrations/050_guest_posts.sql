-- Guest posts with multilingual translation support.
-- Original content stored once; translations cached per language.

CREATE TABLE IF NOT EXISTS public.guest_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  author_identifier TEXT,
  original_lang TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden')),
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guest_post_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.guest_posts(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, lang)
);

CREATE INDEX IF NOT EXISTS idx_guest_posts_status ON public.guest_posts(status);
CREATE INDEX IF NOT EXISTS idx_guest_post_translations_post_lang ON public.guest_post_translations(post_id, lang);

COMMENT ON TABLE public.guest_posts IS 'User-submitted guest posts with multilingual translation cache';
COMMENT ON TABLE public.guest_post_translations IS 'Cached AI translations of guest posts per language';
