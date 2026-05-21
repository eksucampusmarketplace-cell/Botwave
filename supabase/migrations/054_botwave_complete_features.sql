-- Migration 054: BotWave Complete Features
-- Adds bot_creations, carts, orders, flow_sessions tables
-- Adds missing columns and performance indexes

-- =============================================
-- 1. Bot Creations Table (Bot Management Mode)
-- =============================================
CREATE TABLE IF NOT EXISTS bot_creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_telegram_id TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  new_bot_token TEXT,
  new_bot_username TEXT,
  session_id UUID REFERENCES bot_sessions(id) ON DELETE SET NULL,
  error TEXT
);

ALTER TABLE bot_creations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'bot_creations' AND policyname = 'bot_creations_user_policy'
  ) THEN
    CREATE POLICY bot_creations_user_policy ON bot_creations
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- =============================================
-- 2. Carts Table (E-Commerce)
-- =============================================
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_jid TEXT NOT NULL,
  product_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_jid, product_id, session_id)
);

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'carts' AND policyname = 'carts_session_policy'
  ) THEN
    CREATE POLICY carts_session_policy ON carts
      FOR ALL USING (
        session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- =============================================
-- 3. Orders Table (E-Commerce)
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_jid TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'orders' AND policyname = 'orders_session_policy'
  ) THEN
    CREATE POLICY orders_session_policy ON orders
      FOR ALL USING (
        session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- =============================================
-- 4. Flow Sessions Table (Chatbot Flows)
-- =============================================
CREATE TABLE IF NOT EXISTS flow_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_jid TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL,
  step_index INT NOT NULL DEFAULT 0,
  answers JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_jid, session_id)
);

ALTER TABLE flow_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'flow_sessions' AND policyname = 'flow_sessions_policy'
  ) THEN
    CREATE POLICY flow_sessions_policy ON flow_sessions
      FOR ALL USING (
        session_id IN (SELECT id FROM bot_sessions WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- =============================================
-- 5. Missing Columns on Existing Tables
-- =============================================

-- announce_channel_id for Telegram bot configs
ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS announce_channel_id TEXT;

-- Platform columns for cross-platform features
ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'whatsapp';
ALTER TABLE products ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'whatsapp';
ALTER TABLE chatbot_flows ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'whatsapp';

-- Image/media columns for WhatsApp handlers
ALTER TABLE auto_replies ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS media_type TEXT;

-- CAPTCHA config columns for telegram_group_configs
ALTER TABLE telegram_group_configs ADD COLUMN IF NOT EXISTS captcha_mode TEXT DEFAULT 'button';
ALTER TABLE telegram_group_configs ADD COLUMN IF NOT EXISTS captcha_rules BOOLEAN DEFAULT false;
ALTER TABLE telegram_group_configs ADD COLUMN IF NOT EXISTS captcha_mute_time INT DEFAULT 60;
ALTER TABLE telegram_group_configs ADD COLUMN IF NOT EXISTS captcha_kick BOOLEAN DEFAULT true;
ALTER TABLE telegram_group_configs ADD COLUMN IF NOT EXISTS captcha_kick_time INT DEFAULT 60;
ALTER TABLE telegram_group_configs ADD COLUMN IF NOT EXISTS captcha_button_text TEXT;

-- Bot-to-bot loop protection tracking
ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS bot_to_bot_enabled BOOLEAN DEFAULT false;

-- =============================================
-- 6. Performance Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_custom_commands_lookup
  ON custom_commands (command, enabled, platform);

CREATE INDEX IF NOT EXISTS idx_products_user_active
  ON products (user_id, active);

CREATE INDEX IF NOT EXISTS idx_flow_sessions_user_jid
  ON flow_sessions (user_jid, session_id);

CREATE INDEX IF NOT EXISTS idx_carts_user_session
  ON carts (user_jid, session_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_session
  ON orders (user_jid, session_id);

CREATE INDEX IF NOT EXISTS idx_bot_creations_user
  ON bot_creations (user_id, status);

CREATE INDEX IF NOT EXISTS idx_captcha_verifications_lookup
  ON telegram_captcha_verifications (session_id, chat_id, user_id);
