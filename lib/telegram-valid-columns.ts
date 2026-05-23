/**
 * Valid database columns for Telegram config tables.
 * 
 * Used to filter out fields that exist in DEFAULT_CONFIG or UI state
 * but do NOT exist in the actual database tables, preventing
 * "Failed to save" errors from Supabase upsert.
 */

// ─── telegram_bot_configs ────────────────────────────────────────────────────
// Derived from migrations 033 through 045.
export const TELEGRAM_BOT_CONFIG_COLUMNS = new Set([
  // Original 033 columns
  'session_id', 'webhook_url', 'webhook_secret', 'welcome_message', 'goodbye_message',
  'rules_text', 'antiflood_enabled', 'antiflood_max_per_min', 'antispam_enabled',
  'antilink_enabled', 'antilink_whitelist', 'captcha_enabled', 'captcha_type',
  'warn_limit', 'warn_action', 'night_mode_enabled', 'night_mode_start', 'night_mode_end',
  'locked_types', 'log_channel_id', 'xp_enabled',
  // 034 additions
  'start_text', 'start_buttons_json', 'owner_user_id',
  // 035 additions
  'night_mode_groups',
  // 037 enhanced dashboard controls
  'timezone', 'welcome_enabled', 'welcome_timing', 'rules_enabled',
  'admonition_enabled', 'admonition_timing', 'noiseless_mode', 'noiseless_timing',
  'auto_delete_bot_msgs', 'auto_delete_timing', 'auto_delete_minutes',
  'check_admin_violations', 'verify_user_realness', 'ignore_public_commands',
  'remove_join_leave_notifs', 'remove_join_leave_timing', 'anon_admin', 'admin_error_messages',
  'warnings_enabled', 'warnings_timing', 'max_warnings', 'warning_keep_days',
  'default_violation_penalty', 'warn_time',
  'prohibit_unofficial_ads', 'prohibit_unofficial_ads_timing',
  'prohibit_bots_deletion', 'prohibit_bot_inviter_removal',
  'prohibit_userbots', 'prohibit_userbots_timing', 'prohibit_userbots_penalty',
  'strict_mode', 'prohibit_porn_words', 'prohibit_website_links', 'prohibit_telegram_links',
  'prohibit_usernames', 'prohibit_hashtags', 'prohibit_text', 'prohibit_forwarding',
  'prohibit_forward_channels', 'prohibit_pictures', 'prohibit_videos', 'prohibit_stickers',
  'prohibit_emojis', 'prohibit_emoji_only', 'prohibit_location', 'prohibit_contact',
  'prohibit_audio', 'prohibit_voice', 'prohibit_files', 'prohibit_apps',
  'prohibit_apps_timing', 'prohibit_apps_penalty',
  'prohibit_gifs', 'prohibit_polls', 'prohibit_glass_buttons', 'prohibit_games',
  'prohibit_bot_commands', 'prohibit_textless_posts', 'prohibit_english',
  'prohibit_arabic_farsi', 'prohibit_regular_reply', 'prohibit_external_reply',
  'message_regex_pattern', 'forbidden_words', 'necessary_words',
  'min_message_words', 'max_message_words', 'message_count_limit',
  'message_count_timeframe_mins', 'max_repeated_messages', 'repeated_msg_timeframe_mins',
  'silent_time_1_enabled', 'silent_time_1_start', 'silent_time_1_end',
  'silent_time_2_enabled', 'silent_time_2_start', 'silent_time_2_end',
  'silent_time_3_enabled', 'silent_time_3_start', 'silent_time_3_end',
  'temporary_lock_enabled', 'forced_add_count', 'forced_add_timeframe_days',
  'mandatory_channels', 'custom_welcome_text', 'custom_rules_text',
  'custom_silent_start_text', 'custom_silent_end_text', 'custom_admonition_text',
  'custom_forced_add_text', 'custom_mandatory_channel_text',
  'antiflood_action', 'antiflood_timed_count', 'antiflood_timed_duration_secs',
  'antiflood_clear_messages', 'antiraid_time', 'antiraid_action_time',
  'auto_antiraid_threshold',
  // 041 start image
  'start_image_file_id', 'start_group_dm_text', 'help_text', 'miniapp_base_url',
  // 042 dashboard missing columns
  'bot_language', 'antiraid_enabled', 'antiraid_threshold', 'antiraid_mode',
  'antiraid_duration_mins', 'captcha_mode', 'captcha_rules', 'captcha_mute_time',
  'captcha_kick', 'captcha_kick_time', 'captcha_button_text',
  'memberbooster_enabled', 'memberbooster_max', 'memberbooster_max_mode',
  'memberbooster_text', 'memberbooster_text_enabled', 'memberbooster_channel_text',
  'memberbooster_daily_text', 'memberbooster_daily', 'memberbooster_daily_minute',
  'memberbooster_daily_mode', 'memberbooster_channel_enabled', 'memberbooster_channel',
  'memberbooster_channel2_enabled', 'memberbooster_channel2', 'memberbooster_forced_boost',
  'memberbooster_btn_enabled', 'memberbooster_btn_link', 'memberbooster_btn_text',
  'memberbooster_hard_mode',
  'ai_enabled', 'karma_enabled', 'ban_ghosts_enabled', 'mentionall_enabled',
  'booster_enabled', 'games_enabled', 'texttools_enabled', 'quicktools_enabled',
  'mediadownload_enabled', 'funextras_enabled', 'infolookup_enabled',
  'autoreply_enabled', 'stickers_enabled', 'polls_enabled', 'namehistory_enabled',
  'analytics_enabled', 'profiletools_enabled', 'mediatools_enabled', 'imagetools_enabled',
  'reports_enabled', 'tickets_enabled', 'federation_enabled',
  'votekick_enabled', 'votekick_required_votes', 'votekick_timeout_secs',
  'join_approval_enabled', 'join_approval_mode',
  'slowmode_enabled', 'slowmode_seconds',
  'blacklist_mode', 'clean_welcome', 'force_channel', 'auto_delete_seconds',
  // 046 daily summary (new)
  'daily_summary_enabled', 'daily_summary_hour', 'daily_summary_channel_id', 'last_summary_sent_at',
  // 054 announce / bot-to-bot
  'announce_channel_id', 'bot_to_bot_enabled',
  // Per-group default that mirrors to group config
  'admin_only_mode',
  // Timestamps (read-only, but valid in DB)
  'updated_at',
]);

// ─── telegram_group_configs ──────────────────────────────────────────────────
// Derived from migration 038, plus column additions from later migrations
// (042 captcha_*, 054 captcha_rules/mute/kick/button, admin_only_mode).
export const TELEGRAM_GROUP_CONFIG_COLUMNS = new Set([
  'session_id', 'chat_id', 'chat_title',
  // Welcome
  'welcome_enabled', 'welcome_message', 'welcome_delete_after', 'welcome_show_rules_btn',
  'goodbye_enabled', 'goodbye_message',
  // Captcha
  'captcha_enabled', 'captcha_mode', 'captcha_timeout', 'captcha_action',
  'captcha_message', 'captcha_restrict_on_join',
  // 054 captcha additions
  'captcha_rules', 'captcha_mute_time', 'captcha_kick', 'captcha_kick_time',
  'captcha_button_text',
  // Per-group welcome / goodbye image overrides + announce channel
  // (added in migration 060 alongside admin_only_mode)
  'welcome_image_url', 'goodbye_image_url', 'announce_channel_id',
  // Per-group admin-only override (migration 060)
  'admin_only_mode',
  // Warn
  'warns_enabled', 'warn_limit', 'warn_action', 'warn_expiry_days',
  'warn_message', 'warn_limit_message',
  // Antiflood
  'antiflood_enabled', 'antiflood_max', 'antiflood_window', 'antiflood_action',
  'antiflood_duration', 'antiflood_message', 'antiflood_exempt_admins',
  // Antilink
  'antilink_enabled', 'antilink_action', 'antilink_whitelist',
  'antilink_allow_telegram', 'antilink_exempt_admins', 'antilink_message',
  // Night mode
  'night_mode_enabled', 'night_mode_start', 'night_mode_end', 'night_mode_timezone',
  'night_mode_lock_msg', 'night_mode_unlock_msg', 'night_mode_exempt_admins',
  // Antiraid
  'antiraid_enabled', 'antiraid_threshold', 'antiraid_window', 'antiraid_mode',
  'antiraid_duration', 'antiraid_message',
  // XP
  'xp_enabled', 'xp_per_message', 'xp_levelup_announce', 'xp_levelup_message',
  'xp_penalty_on_warn', 'xp_streak_bonus',
  // Rules
  'rules_text', 'rules_enabled', 'rules_send_on_join', 'rules_pin_on_set',
  'rules_button_on_welcome',
  // Modlog
  'modlog_enabled', 'modlog_channel_id', 'modlog_bans', 'modlog_mutes',
  'modlog_warns', 'modlog_joins', 'modlog_name_changes',
  // Booster / Force channel
  'booster_enabled', 'booster_goal', 'booster_reward_text',
  'force_channel_enabled', 'force_channel_id', 'force_channel_username',
  'force_channel_action', 'force_channel_message', 'force_channel_verify_text',
  // AI
  'ai_enabled', 'ai_system_prompt', 'ai_provider', 'ai_on_mention',
  'ai_max_length', 'ai_cooldown',
  // Language
  'language', 'allow_user_lang_override', 'translate_enabled',
  // Name history
  'name_history_enabled', 'name_history_notify', 'name_history_log_channel',
  // Analytics
  'analytics_enabled',
  // Games
  'games_enabled', 'games_list', 'game_xp_reward', 'game_cooldown',
  // Filters
  'filters_enabled', 'filters_case_sensitive', 'filters_delete_trigger', 'filters_action',
  // Notes
  'notes_enabled', 'notes_private',
  // Misc features
  'karma_enabled', 'votekick_enabled', 'votekick_required_votes', 'votekick_timeout_secs',
  'join_approval_enabled', 'join_approval_mode', 'slowmode_enabled', 'slowmode_seconds',
  'reports_enabled', 'tickets_enabled', 'federation_enabled', 'autoreply_enabled',
  'stickers_enabled', 'polls_enabled', 'mentionall_enabled', 'ban_ghosts_enabled',
  'texttools_enabled', 'quicktools_enabled', 'mediadownload_enabled', 'funextras_enabled',
  'infolookup_enabled', 'profiletools_enabled', 'mediatools_enabled', 'imagetools_enabled',
  'timezone',
  // 046 daily summary (new)
  'daily_summary_enabled', 'daily_summary_hour', 'daily_summary_channel_id', 'last_summary_sent_at',
  // Timestamps
  'updated_at',
]);

// ─── userbot_config ──────────────────────────────────────────────────────────
// Derived from migration 039.
export const USERBOT_CONFIG_COLUMNS = new Set([
  'session_id', 'prefix', 'anti_pm', 'anti_pm_block', 'anti_pm_report',
  'pm_permit_enabled', 'pm_permit_limit', 'pm_permit_message',
  'pm_permit_image', 'pm_permit_inline',
  'afk_enabled', 'afk_reason', 'afk_since',
  'alive_message', 'alive_image',
  'log_chat_id', 'sudo_users', 'disabled_modules',
  'auto_read_enabled', 'presence_simulation', 'timezone_offset',
  'welcome_sent',
  'updated_at',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Filter an object to only include keys that exist as valid DB columns.
 * Also strips internal-only fields like 'id', 'created_at'.
 */
export function filterValidColumns(
  obj: Record<string, unknown>,
  validColumns: Set<string>,
): Record<string, unknown> {
  const ALWAYS_STRIP = new Set(['id', 'created_at']);
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (ALWAYS_STRIP.has(key)) continue;
    if (validColumns.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * Convert antilink_whitelist from comma-separated string to array.
 */
export function normalizeAntilinkWhitelist(
  value: unknown,
): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Clamp a numeric value to a min/max range.
 */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

/**
 * Validate and clamp numeric fields in a config object.
 */
export function validateNumericFields(config: Record<string, unknown>): Record<string, unknown> {
  const NUMERIC_LIMITS: Record<string, { min: number; max: number; fallback: number }> = {
    warn_limit: { min: 1, max: 100, fallback: 3 },
    max_warnings: { min: 1, max: 100, fallback: 20 },
    warning_keep_days: { min: 0, max: 365, fallback: 3 },
    antiflood_max_per_min: { min: 1, max: 1000, fallback: 10 },
    antiflood_max: { min: 1, max: 1000, fallback: 10 },
    antiflood_window: { min: 1, max: 300, fallback: 10 },
    antiflood_duration: { min: 1, max: 86400, fallback: 5 },
    antiflood_timed_count: { min: 0, max: 100, fallback: 0 },
    antiflood_timed_duration_secs: { min: 0, max: 86400, fallback: 0 },
    antiraid_threshold: { min: 1, max: 1000, fallback: 15 },
    antiraid_duration_mins: { min: 1, max: 1440, fallback: 15 },
    antiraid_window: { min: 10, max: 600, fallback: 60 },
    antiraid_duration: { min: 1, max: 1440, fallback: 15 },
    auto_antiraid_threshold: { min: 0, max: 1000, fallback: 0 },
    auto_delete_minutes: { min: 1, max: 1440, fallback: 1 },
    auto_delete_seconds: { min: 0, max: 86400, fallback: 0 },
    min_message_words: { min: 0, max: 1000, fallback: 0 },
    max_message_words: { min: 0, max: 10000, fallback: 0 },
    message_count_limit: { min: 0, max: 10000, fallback: 0 },
    message_count_timeframe_mins: { min: 1, max: 1440, fallback: 1 },
    max_repeated_messages: { min: 0, max: 100, fallback: 0 },
    repeated_msg_timeframe_mins: { min: 1, max: 1440, fallback: 1 },
    forced_add_count: { min: 0, max: 100, fallback: 0 },
    forced_add_timeframe_days: { min: 0, max: 365, fallback: 0 },
    memberbooster_max: { min: 0, max: 10000, fallback: 0 },
    memberbooster_daily: { min: 0, max: 10000, fallback: 0 },
    memberbooster_daily_minute: { min: 0, max: 1440, fallback: 1440 },
    votekick_required_votes: { min: 1, max: 100, fallback: 5 },
    votekick_timeout_secs: { min: 10, max: 600, fallback: 60 },
    slowmode_seconds: { min: 0, max: 86400, fallback: 0 },
    captcha_timeout: { min: 10, max: 600, fallback: 60 },
    xp_per_message: { min: 0, max: 100, fallback: 2 },
    xp_penalty_on_warn: { min: 0, max: 1000, fallback: 25 },
    ai_max_length: { min: 50, max: 4000, fallback: 500 },
    ai_cooldown: { min: 0, max: 3600, fallback: 10 },
    booster_goal: { min: 1, max: 10000, fallback: 5 },
    game_xp_reward: { min: 0, max: 1000, fallback: 10 },
    game_cooldown: { min: 0, max: 3600, fallback: 30 },
    pm_permit_limit: { min: 1, max: 100, fallback: 3 },
    daily_summary_hour: { min: 0, max: 23, fallback: 23 },
  };

  for (const [key, limits] of Object.entries(NUMERIC_LIMITS)) {
    if (key in config && config[key] !== undefined && config[key] !== null) {
      config[key] = clampNumber(config[key], limits.min, limits.max, limits.fallback);
    }
  }
  return config;
}

/**
 * Parse a Supabase error into a human-readable message.
 */
export function parseSupabaseError(error: unknown): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  const e = error as Record<string, unknown>;
  if (e.message && typeof e.message === 'string') {
    // Common patterns
    if (e.message.includes('column') && e.message.includes('does not exist')) {
      const match = e.message.match(/column "([^"]+)"/);
      return match
        ? `Database column "${match[1]}" does not exist. A migration may be needed.`
        : `A database column does not exist. Run pending migrations.`;
    }
    if (e.message.includes('violates unique constraint')) {
      return 'A record with this key already exists.';
    }
    if (e.message.includes('violates foreign key constraint')) {
      return 'Referenced record not found (invalid session or chat ID).';
    }
    return e.message;
  }
  if (e.details && typeof e.details === 'string') return e.details;
  return JSON.stringify(error);
}
