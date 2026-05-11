-- Track re-engagement email sends to avoid spamming the same user
CREATE TABLE IF NOT EXISTS email_broadcast_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'reengagement',
  status TEXT NOT NULL DEFAULT 'sent', -- sent, failed, bounced
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  job_id TEXT
);

CREATE INDEX idx_email_broadcast_user ON email_broadcast_log(user_id, campaign_type, sent_at DESC);
CREATE INDEX idx_email_broadcast_job ON email_broadcast_log(job_id);

-- Auto-send config stored in a simple key-value style
-- Admins can toggle auto-send and set the cooldown period
CREATE TABLE IF NOT EXISTS email_broadcast_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO email_broadcast_config (key, value) VALUES
  ('auto_send_enabled', 'false'),
  ('inactive_hours_threshold', '12'),
  ('cooldown_hours', '72')
ON CONFLICT (key) DO NOTHING;
