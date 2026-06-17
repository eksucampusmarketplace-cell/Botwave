-- 064_flow_sessions_node_id_and_ttl.sql
--
-- Extends `flow_sessions` (created in 054) with the two columns the
-- WhatsApp MessageHandler chatbot-flow engine actually needs:
--
--   - node_id TEXT       \u2014 the string id of the FlowNode the bot is
--                          currently waiting for the user to reply to.
--                          (The legacy in-memory state used a node id
--                          string. flow-engine.ts also tracked a numeric
--                          step_index, which is fine for linear flows
--                          but breaks the moment a `condition` node
--                          branches to a non-adjacent node.)
--
--   - expires_at TIMESTAMPTZ \u2014 hard TTL for the session row. The
--                          in-memory implementation expired after 5
--                          minutes. We keep the same behavior persistent
--                          here. A background cleanup query can prune
--                          expired rows (or the read path can ignore
--                          them, which is what MessageHandler does).
--
-- Both columns are nullable in the schema for forward-compat \u2014
-- existing rows from the legacy flow-engine.ts code path may not have
-- them set. The MessageHandler write path always populates both.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flow_sessions' AND column_name = 'node_id'
  ) THEN
    ALTER TABLE flow_sessions ADD COLUMN node_id TEXT;
    COMMENT ON COLUMN flow_sessions.node_id IS
      'String id of the pending FlowNode the bot is waiting for the user to reply to. Used by bot/whatsapp/handlers/MessageHandler.ts::processChatbotFlow.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flow_sessions' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE flow_sessions ADD COLUMN expires_at TIMESTAMPTZ;
    COMMENT ON COLUMN flow_sessions.expires_at IS
      'Hard TTL for the flow session. Rows past expires_at are treated as no active session by the WhatsApp message handler (matches the legacy 5-minute in-memory expiry).';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flow_sessions_expires_at
  ON flow_sessions (expires_at)
  WHERE expires_at IS NOT NULL;
