-- System-wide key-value configuration (survives deploys/restarts)
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default auto-send config (disabled)
INSERT INTO public.system_config (key, value)
VALUES ('email_auto_send', '{"enabled": false, "intervalHours": 12, "inactiveHours": 12}'::jsonb)
ON CONFLICT (key) DO NOTHING;
