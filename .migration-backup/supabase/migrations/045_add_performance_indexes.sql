-- Performance indexes for high-query columns
-- These indexes improve dashboard load times and bot query performance

-- bot_sessions: queried by user_id + state on every dashboard load and session list
CREATE INDEX IF NOT EXISTS idx_bot_sessions_user_state ON bot_sessions (user_id, state);

-- bot_sessions: queried by state for admin monitoring
CREATE INDEX IF NOT EXISTS idx_bot_sessions_state ON bot_sessions (state);

-- messages: queried by session_id + created_at for message history
CREATE INDEX IF NOT EXISTS idx_messages_session_created ON messages (session_id, created_at DESC);

-- auto_replies: queried by session_id + keyword for command matching
CREATE INDEX IF NOT EXISTS idx_auto_replies_session_keyword ON auto_replies (session_id, keyword);

-- auto_replies: queried by session_id for listing all replies
CREATE INDEX IF NOT EXISTS idx_auto_replies_session ON auto_replies (session_id);

-- telegram_bot_config: queried by session_id on every config load
CREATE INDEX IF NOT EXISTS idx_telegram_bot_config_session ON telegram_bot_config (session_id);

-- userbot_config: queried by session_id on every config load
CREATE INDEX IF NOT EXISTS idx_userbot_config_session ON userbot_config (session_id);

-- support_tickets: queried by user_id for user's ticket list
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets (user_id);

-- support_tickets: queried by status for admin queue
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);
