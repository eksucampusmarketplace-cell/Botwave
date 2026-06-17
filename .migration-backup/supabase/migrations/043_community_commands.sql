-- Community commands: user-submitted bot automations
CREATE TABLE IF NOT EXISTS community_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_user_id UUID REFERENCES auth.users(id),
  platform TEXT NOT NULL CHECK (platform IN ('WhatsApp', 'Telegram', 'Both')),
  category TEXT NOT NULL CHECK (category IN ('Moderation', 'Engagement', 'Education', 'Business', 'Entertainment', 'Utility', 'Community')),
  commands TEXT[] NOT NULL DEFAULT '{}',
  setup_instructions TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  likes INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Index for listing approved commands
CREATE INDEX IF NOT EXISTS idx_community_commands_status ON community_commands(status);
CREATE INDEX IF NOT EXISTS idx_community_commands_category ON community_commands(category);
CREATE INDEX IF NOT EXISTS idx_community_commands_likes ON community_commands(likes DESC);

-- RLS policies
ALTER TABLE community_commands ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved commands
CREATE POLICY "Anyone can read approved community commands"
  ON community_commands FOR SELECT
  USING (status = 'approved');

-- Authenticated users can submit commands
CREATE POLICY "Authenticated users can submit community commands"
  ON community_commands FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own pending commands
CREATE POLICY "Users can update own pending commands"
  ON community_commands FOR UPDATE
  TO authenticated
  USING (author_user_id = auth.uid() AND status = 'pending')
  WITH CHECK (author_user_id = auth.uid() AND status = 'pending');
