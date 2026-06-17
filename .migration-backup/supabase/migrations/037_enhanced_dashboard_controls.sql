-- ============================================================================
-- Migration 037: Enhanced Dashboard Controls
-- Adds comprehensive config columns for full dashboard control of all bot features
-- ============================================================================

-- ─── General Settings ───────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS welcome_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS welcome_timing TEXT DEFAULT 'always';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS rules_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS admonition_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS admonition_timing TEXT DEFAULT 'always';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS noiseless_mode BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS noiseless_timing TEXT DEFAULT 'always';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS auto_delete_bot_msgs BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS auto_delete_timing TEXT DEFAULT 'always';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS auto_delete_minutes INTEGER DEFAULT 1;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS check_admin_violations BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS verify_user_realness BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS ignore_public_commands BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS remove_join_leave_notifs BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS remove_join_leave_timing TEXT DEFAULT 'always';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS anon_admin BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS admin_error_messages BOOLEAN DEFAULT true;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Warnings Configuration ─────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS warnings_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS warnings_timing TEXT DEFAULT 'always';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS max_warnings INTEGER DEFAULT 20;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS warning_keep_days INTEGER DEFAULT 3;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS default_violation_penalty TEXT DEFAULT 'warn';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS warn_time TEXT DEFAULT 'off';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Prohibitions ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_unofficial_ads BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_unofficial_ads_timing TEXT DEFAULT 'always';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_bots_deletion BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_bot_inviter_removal BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_userbots BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_userbots_timing TEXT DEFAULT 'always';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_userbots_penalty TEXT DEFAULT 'default';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS strict_mode BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_porn_words BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_website_links BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_telegram_links BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_usernames BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_hashtags BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_text BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_forwarding BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_forward_channels BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_pictures BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_videos BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_stickers BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_emojis BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_emoji_only BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_location BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_contact BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_audio BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_voice BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_files BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_apps BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_apps_timing TEXT DEFAULT 'always';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_apps_penalty TEXT DEFAULT 'default';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_gifs BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_polls BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_glass_buttons BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_games BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_bot_commands BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_textless_posts BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_english BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_arabic_farsi BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_regular_reply BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS prohibit_external_reply BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS message_regex_pattern TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS forbidden_words TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS necessary_words TEXT DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Numerical Limitations ──────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS min_message_words INTEGER DEFAULT 0;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS max_message_words INTEGER DEFAULT 0;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS message_count_limit INTEGER DEFAULT 0;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS message_count_timeframe_mins INTEGER DEFAULT 1;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS max_repeated_messages INTEGER DEFAULT 0;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS repeated_msg_timeframe_mins INTEGER DEFAULT 1;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Silent Times ───────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS silent_time_1_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS silent_time_1_start TEXT DEFAULT '00:00';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS silent_time_1_end TEXT DEFAULT '06:00';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS silent_time_2_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS silent_time_2_start TEXT DEFAULT '00:00';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS silent_time_2_end TEXT DEFAULT '06:00';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS silent_time_3_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS silent_time_3_start TEXT DEFAULT '00:00';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS silent_time_3_end TEXT DEFAULT '06:00';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS temporary_lock_enabled BOOLEAN DEFAULT false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Mandatory Memberships ──────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS forced_add_count INTEGER DEFAULT 0;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS forced_add_timeframe_days INTEGER DEFAULT 0;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS mandatory_channels TEXT DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Customized Texts ───────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS custom_welcome_text TEXT DEFAULT 'Greetings, esteemed {user}! Welcome to {group}! We wish you a delightful experience during your presence here.';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS custom_rules_text TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS custom_silent_start_text TEXT DEFAULT 'Silent time has been successfully activated. This group is currently in silent mode from {starttime} until {endtime}.';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS custom_silent_end_text TEXT DEFAULT 'Silent time has been deactivated. The next silent time period will begin at {starttime}.';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS custom_admonition_text TEXT DEFAULT 'Reason: {reason} | Penalty: {penalty} | {user_warnings} warnings out of {warnings_count} | Each warning will be deleted after {warningstime}';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS custom_forced_add_text TEXT DEFAULT 'To be able to send messages to this group, you need to add {number} members. So far, you have added {added} members.';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS custom_mandatory_channel_text TEXT DEFAULT 'Before sending messages to this group, please join the following channel(s)/group(s): {channel_names}';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Antiflood Enhancements ─────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS antiflood_action TEXT DEFAULT 'mute';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS antiflood_timed_count INTEGER DEFAULT 0;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS antiflood_timed_duration_secs INTEGER DEFAULT 0;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS antiflood_clear_messages BOOLEAN DEFAULT false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── AntiRaid Enhancements ──────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS antiraid_time TEXT DEFAULT '6h';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS antiraid_action_time TEXT DEFAULT '1h';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS auto_antiraid_threshold INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Approvals table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telegram_approved_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_approved_session_chat
  ON telegram_approved_users(session_id, chat_id);

-- ─── Group Statistics table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telegram_group_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  new_members INTEGER DEFAULT 0,
  left_members INTEGER DEFAULT 0,
  messages_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chat_id, date)
);

CREATE INDEX IF NOT EXISTS idx_telegram_group_stats_session_chat_date
  ON telegram_group_stats(session_id, chat_id, date DESC);

-- ─── RLS + Policies for new tables ──────────────────────────────────────────
ALTER TABLE telegram_approved_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_group_stats ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'telegram_approved_users',
    'telegram_group_stats'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "service_role_full_%s" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;
