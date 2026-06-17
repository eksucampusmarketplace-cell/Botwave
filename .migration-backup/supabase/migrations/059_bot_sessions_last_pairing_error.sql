-- Migration 059: add bot_sessions.last_pairing_error column.
--
-- Background:
--   PR #517 (proxy denylist + no-reuse + BYOP nudge banner) and earlier
--   evolution-webhook work introduced writes/reads to a
--   `bot_sessions.last_pairing_error` column, but no migration ever declared
--   it. On databases provisioned from supabase/migrations the column is
--   missing, so every call to
--     * app/api/bot/sessions/[id]/health/route.ts        (.select(...))
--     * app/api/evolution/webhook/route.ts                (.update({...}))
--     * bot/scaling/sessionCoordinator.ts                 (.update({...}))
--   errors out with:
--     ERROR:  column bot_sessions.last_pairing_error does not exist
--
--   Adding the column here with a default-NULL so the only thing changing
--   for existing rows is the schema, not the data.

ALTER TABLE public.bot_sessions
  ADD COLUMN IF NOT EXISTS last_pairing_error TEXT;

COMMENT ON COLUMN public.bot_sessions.last_pairing_error IS
  'Human-readable last pairing failure reason. NULL = no recent failure. Set by '
  'sessionCoordinator/auto-recovery and evolution-webhook; cleared on successful '
  're-pair.';
