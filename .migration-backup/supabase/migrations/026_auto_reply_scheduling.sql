-- BotWave Migration 026: Auto-reply scheduling + match_type column
--
-- Adds scheduling support for auto-replies (business hours, AFK schedules)
-- Also adds match_type column that the bot handler expects

-- Add match_type column (exact or contains)
ALTER TABLE public.auto_replies
  ADD COLUMN IF NOT EXISTS match_type TEXT DEFAULT 'contains'
  CHECK (match_type IN ('exact', 'contains'));

-- Add trigger column as alias (bot code reads 'trigger', DB has 'trigger_keyword')
ALTER TABLE public.auto_replies
  ADD COLUMN IF NOT EXISTS trigger TEXT;

-- Copy existing trigger_keyword values to trigger column
UPDATE public.auto_replies SET trigger = trigger_keyword WHERE trigger IS NULL;

-- Add response column as alias (bot code reads 'response', DB has 'response_text')
ALTER TABLE public.auto_replies
  ADD COLUMN IF NOT EXISTS response TEXT;

-- Copy existing response_text values to response column
UPDATE public.auto_replies SET response = response_text WHERE response IS NULL;

-- Add scheduling columns
ALTER TABLE public.auto_replies
  ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.auto_replies
  ADD COLUMN IF NOT EXISTS schedule_start TIME DEFAULT '09:00';

ALTER TABLE public.auto_replies
  ADD COLUMN IF NOT EXISTS schedule_end TIME DEFAULT '17:00';

ALTER TABLE public.auto_replies
  ADD COLUMN IF NOT EXISTS active_days INTEGER[] DEFAULT '{1,2,3,4,5}';

-- Add category for organizing replies (general, afk, business, greeting)
ALTER TABLE public.auto_replies
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'
  CHECK (category IN ('general', 'afk', 'business', 'greeting'));
