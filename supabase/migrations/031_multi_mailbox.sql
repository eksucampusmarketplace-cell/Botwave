-- Allow admin users to create multiple mailboxes
-- Default users: 1 mailbox, admin: up to 10

ALTER TABLE user_mailboxes ADD COLUMN IF NOT EXISTS label TEXT DEFAULT 'Primary';

-- Track max allowed mailboxes per user on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_mailboxes INTEGER DEFAULT 1;
