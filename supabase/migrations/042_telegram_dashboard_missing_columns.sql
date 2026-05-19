-- ============================================================================
-- Migration 042: Add missing telegram_bot_configs columns for dashboard
-- The dashboard UI references these config fields but they were never added
-- to the database, causing "Failed to save" errors on the settings page.
-- ============================================================================

-- ─── Language ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS bot_language TEXT DEFAULT 'en';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Anti-Raid core settings ─────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS antiraid_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS antiraid_threshold INTEGER DEFAULT 15;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS antiraid_mode TEXT DEFAULT 'restrict';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS antiraid_duration_mins INTEGER DEFAULT 15;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── CAPTCHA enhancements ────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS captcha_mode TEXT DEFAULT 'button';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS captcha_rules BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS captcha_mute_time TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS captcha_kick BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS captcha_kick_time TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS captcha_button_text TEXT DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── MemberBooster ───────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_max INTEGER DEFAULT 0;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_max_mode TEXT DEFAULT 'new';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_text TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_text_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_channel_text TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_daily_text TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_daily INTEGER DEFAULT 0;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_daily_minute INTEGER DEFAULT 1440;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_daily_mode TEXT DEFAULT 'reset';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_channel_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_channel TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_channel2_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_channel2 TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_forced_boost BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_btn_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_btn_link TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_btn_text TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS memberbooster_hard_mode BOOLEAN DEFAULT false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Feature toggles ─────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS karma_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS ban_ghosts_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS mentionall_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS booster_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS games_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS texttools_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS quicktools_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS mediadownload_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS funextras_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS infolookup_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS autoreply_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS stickers_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS polls_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS namehistory_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS profiletools_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS mediatools_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS imagetools_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS reports_enabled BOOLEAN DEFAULT true;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS tickets_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS federation_enabled BOOLEAN DEFAULT false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── VoteKick ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS votekick_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS votekick_required_votes INTEGER DEFAULT 5;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS votekick_timeout_secs INTEGER DEFAULT 60;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Join Approval ───────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS join_approval_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS join_approval_mode TEXT DEFAULT 'manual';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Slow Mode ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS slowmode_enabled BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS slowmode_seconds INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Misc settings ──────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS blacklist_mode TEXT DEFAULT 'delete';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS clean_welcome BOOLEAN DEFAULT false;
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS force_channel TEXT DEFAULT '';
  ALTER TABLE telegram_bot_configs ADD COLUMN IF NOT EXISTS auto_delete_seconds INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
