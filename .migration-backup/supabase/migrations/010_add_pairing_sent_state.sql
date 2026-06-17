-- BotWave Migration 010: Add pairing_sent to session state constraint
-- This state prevents the sync loop from killing bots that have already
-- generated a pairing code and are waiting for the user to enter it.

ALTER TABLE bot_sessions
  DROP CONSTRAINT IF EXISTS bot_sessions_state_check;

ALTER TABLE bot_sessions
  ADD CONSTRAINT bot_sessions_state_check
  CHECK (state IN (
    'qr_pending',
    'pairing_sent',
    'active',
    'inactive',
    'disconnected',
    'needs_reauth'
  ));
