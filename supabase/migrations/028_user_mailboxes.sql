-- User Mailboxes: each user gets {username}@mail.botwave.online
-- Stores incoming and outgoing emails per user

CREATE TABLE IF NOT EXISTS user_mailboxes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  daily_send_count INTEGER DEFAULT 0,
  daily_send_limit INTEGER DEFAULT 50,
  last_send_reset TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mailboxes_user_id ON user_mailboxes(user_id);
CREATE INDEX IF NOT EXISTS idx_mailboxes_email ON user_mailboxes(email_address);

CREATE TABLE IF NOT EXISTS user_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mailbox_id UUID NOT NULL REFERENCES user_mailboxes(id) ON DELETE CASCADE,
  message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_address TEXT NOT NULL,
  subject TEXT DEFAULT '',
  body_html TEXT DEFAULT '',
  body_text TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  folder TEXT DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'spam', 'trash')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_mailbox_id ON user_emails(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_emails_folder ON user_emails(mailbox_id, folder);
CREATE INDEX IF NOT EXISTS idx_emails_created ON user_emails(created_at DESC);

-- Anti-spam tracking for user mailboxes
CREATE TABLE IF NOT EXISTS mailbox_spam_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mailbox_id UUID NOT NULL REFERENCES user_mailboxes(id) ON DELETE CASCADE,
  reported_by TEXT,
  reason TEXT,
  action_taken TEXT DEFAULT 'none' CHECK (action_taken IN ('none', 'warned', 'rate_limited', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE user_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_spam_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mailbox" ON user_mailboxes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own emails" ON user_emails
  FOR SELECT USING (
    mailbox_id IN (SELECT id FROM user_mailboxes WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own emails" ON user_emails
  FOR UPDATE USING (
    mailbox_id IN (SELECT id FROM user_mailboxes WHERE user_id = auth.uid())
  );

-- Service role can do everything
CREATE POLICY "Service role full access mailboxes" ON user_mailboxes
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access emails" ON user_emails
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access spam" ON mailbox_spam_reports
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
