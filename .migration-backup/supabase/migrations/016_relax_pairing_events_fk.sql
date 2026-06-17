-- Migration 016: Relax pairing_events FK to prevent audit logging failures.
--
-- The strict FK on pairing_events.session_id causes INSERT failures when
-- the referenced bot_sessions row doesn't exist (e.g., race conditions
-- with cascade deletes, or sessions created on a different schema path).
-- Audit logging should never fail and block the pairing flow.
--
-- This migration drops the strict FK and adds a comment explaining
-- that session_id is a soft reference (validated in application code).

ALTER TABLE pairing_events
  DROP CONSTRAINT IF EXISTS pairing_events_session_id_fkey;

COMMENT ON COLUMN pairing_events.session_id IS
  'Soft reference to bot_sessions(id). Validated in application code before insert. No FK constraint to avoid audit logging failures.';
