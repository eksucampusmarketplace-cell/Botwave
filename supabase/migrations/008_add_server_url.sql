-- Add server_url column for multi-region IP rotation
-- NULL means the session is handled by the current instance
-- A URL means requests should be forwarded to that instance
ALTER TABLE bot_sessions ADD COLUMN IF NOT EXISTS server_url TEXT;
