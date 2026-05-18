-- Migration: Create telegram_group_configs table for per-group configuration
-- Part of Permission Architecture v2

CREATE TABLE IF NOT EXISTS telegram_group_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  chat_title TEXT,
  -- Welcome
  welcome_enabled BOOLEAN DEFAULT false,
  welcome_message TEXT,
  welcome_delete_after INTEGER DEFAULT 0,
  welcome_show_rules_btn BOOLEAN DEFAULT false,
  goodbye_enabled BOOLEAN DEFAULT false,
  goodbye_message TEXT,
  -- Captcha
  captcha_enabled BOOLEAN DEFAULT false,
  captcha_mode TEXT DEFAULT 'button',
  captcha_timeout INTEGER DEFAULT 60,
  captcha_action TEXT DEFAULT 'kick',
  captcha_message TEXT,
  captcha_restrict_on_join BOOLEAN DEFAULT true,
  -- Warn
  warns_enabled BOOLEAN DEFAULT false,
  warn_limit INTEGER DEFAULT 3,
  warn_action TEXT DEFAULT 'mute',
  warn_expiry_days INTEGER DEFAULT 0,
  warn_message TEXT,
  warn_limit_message TEXT,
  -- Antiflood
  antiflood_enabled BOOLEAN DEFAULT false,
  antiflood_max INTEGER DEFAULT 10,
  antiflood_window INTEGER DEFAULT 10,
  antiflood_action TEXT DEFAULT 'mute',
  antiflood_duration INTEGER DEFAULT 5,
  antiflood_message TEXT,
  antiflood_exempt_admins BOOLEAN DEFAULT true,
  -- Antilink
  antilink_enabled BOOLEAN DEFAULT false,
  antilink_action TEXT DEFAULT 'delete',
  antilink_whitelist TEXT[] DEFAULT '{}',
  antilink_allow_telegram BOOLEAN DEFAULT false,
  antilink_exempt_admins BOOLEAN DEFAULT true,
  antilink_message TEXT,
  -- Night mode
  night_mode_enabled BOOLEAN DEFAULT false,
  night_mode_start TEXT DEFAULT '22:00',
  night_mode_end TEXT DEFAULT '06:00',
  night_mode_timezone TEXT DEFAULT 'UTC',
  night_mode_lock_msg TEXT,
  night_mode_unlock_msg TEXT,
  night_mode_exempt_admins BOOLEAN DEFAULT true,
  -- Antiraid
  antiraid_enabled BOOLEAN DEFAULT false,
  antiraid_threshold INTEGER DEFAULT 15,
  antiraid_window INTEGER DEFAULT 60,
  antiraid_mode TEXT DEFAULT 'restrict',
  antiraid_duration INTEGER DEFAULT 15,
  antiraid_message TEXT,
  -- XP
  xp_enabled BOOLEAN DEFAULT false,
  xp_per_message INTEGER DEFAULT 2,
  xp_levelup_announce BOOLEAN DEFAULT true,
  xp_levelup_message TEXT,
  xp_penalty_on_warn INTEGER DEFAULT 25,
  xp_streak_bonus BOOLEAN DEFAULT true,
  -- Rules
  rules_text TEXT,
  rules_enabled BOOLEAN DEFAULT false,
  rules_send_on_join BOOLEAN DEFAULT false,
  rules_pin_on_set BOOLEAN DEFAULT false,
  rules_button_on_welcome BOOLEAN DEFAULT false,
  -- Modlog
  modlog_enabled BOOLEAN DEFAULT false,
  modlog_channel_id TEXT,
  modlog_bans BOOLEAN DEFAULT true,
  modlog_mutes BOOLEAN DEFAULT true,
  modlog_warns BOOLEAN DEFAULT true,
  modlog_joins BOOLEAN DEFAULT false,
  modlog_name_changes BOOLEAN DEFAULT false,
  -- Booster / Force channel
  booster_enabled BOOLEAN DEFAULT false,
  booster_goal INTEGER DEFAULT 5,
  booster_reward_text TEXT,
  force_channel_enabled BOOLEAN DEFAULT false,
  force_channel_id TEXT,
  force_channel_username TEXT,
  force_channel_action TEXT DEFAULT 'delete',
  force_channel_message TEXT,
  force_channel_verify_text TEXT DEFAULT 'I joined',
  -- AI
  ai_enabled BOOLEAN DEFAULT false,
  ai_system_prompt TEXT,
  ai_provider TEXT DEFAULT 'groq',
  ai_on_mention BOOLEAN DEFAULT false,
  ai_max_length INTEGER DEFAULT 500,
  ai_cooldown INTEGER DEFAULT 10,
  -- Language
  language TEXT DEFAULT 'en',
  allow_user_lang_override BOOLEAN DEFAULT true,
  translate_enabled BOOLEAN DEFAULT true,
  -- Name history
  name_history_enabled BOOLEAN DEFAULT false,
  name_history_notify BOOLEAN DEFAULT false,
  name_history_log_channel BOOLEAN DEFAULT false,
  -- Analytics
  analytics_enabled BOOLEAN DEFAULT true,
  -- Games
  games_enabled BOOLEAN DEFAULT false,
  games_list TEXT[] DEFAULT '{}',
  game_xp_reward INTEGER DEFAULT 10,
  game_cooldown INTEGER DEFAULT 30,
  -- Filters
  filters_enabled BOOLEAN DEFAULT true,
  filters_case_sensitive BOOLEAN DEFAULT false,
  filters_delete_trigger BOOLEAN DEFAULT false,
  filters_action TEXT DEFAULT 'reply',
  -- Notes
  notes_enabled BOOLEAN DEFAULT true,
  notes_private BOOLEAN DEFAULT false,
  -- Misc features
  karma_enabled BOOLEAN DEFAULT false,
  votekick_enabled BOOLEAN DEFAULT false,
  votekick_required_votes INTEGER DEFAULT 5,
  votekick_timeout_secs INTEGER DEFAULT 60,
  join_approval_enabled BOOLEAN DEFAULT false,
  join_approval_mode TEXT DEFAULT 'manual',
  slowmode_enabled BOOLEAN DEFAULT false,
  slowmode_seconds INTEGER DEFAULT 0,
  reports_enabled BOOLEAN DEFAULT true,
  tickets_enabled BOOLEAN DEFAULT false,
  federation_enabled BOOLEAN DEFAULT false,
  autoreply_enabled BOOLEAN DEFAULT true,
  stickers_enabled BOOLEAN DEFAULT true,
  polls_enabled BOOLEAN DEFAULT true,
  mentionall_enabled BOOLEAN DEFAULT true,
  ban_ghosts_enabled BOOLEAN DEFAULT false,
  texttools_enabled BOOLEAN DEFAULT true,
  quicktools_enabled BOOLEAN DEFAULT true,
  mediadownload_enabled BOOLEAN DEFAULT true,
  funextras_enabled BOOLEAN DEFAULT true,
  infolookup_enabled BOOLEAN DEFAULT true,
  profiletools_enabled BOOLEAN DEFAULT true,
  mediatools_enabled BOOLEAN DEFAULT true,
  imagetools_enabled BOOLEAN DEFAULT true,
  -- Timezone
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id)
);

-- Enable RLS
ALTER TABLE telegram_group_configs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY telegram_group_configs_service_all ON telegram_group_configs
  FOR ALL
  USING (true)
  WITH CHECK (true);
