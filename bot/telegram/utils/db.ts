/**
 * Telegram-specific database helpers.
 * All operations are scoped by session_id for per-session isolation.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Config ────────────────────────────────────────────────────────────────

export interface TelegramConfig {
  [key: string]: unknown;
  id?: string;
  session_id: string;
  welcome_message: string | null;
  goodbye_message: string | null;
  rules_text: string | null;
  captcha_enabled: boolean;
  antiflood_enabled: boolean;
  antiflood_max_per_min: number;
  antilink_enabled: boolean;
  antilink_whitelist: string[];
  night_mode_enabled: boolean;
  night_mode_start: string | null;
  night_mode_end: string | null;
  warn_limit: number;
  warn_action: string;
  xp_enabled: boolean;
  log_channel_id: string | null;
  announce_channel_id: string | null;
  admin_only_mode: boolean;
  start_text: string | null;
  start_image_file_id: string | null;
  start_group_dm_text: string | null;
  help_text: string | null;
  owner_user_id: string | null;
  miniapp_base_url: string | null;
  night_mode_groups: number[];
  antiraid_enabled: boolean;
  antiraid_threshold: number;
  antiraid_mode: string;
  antiraid_duration_mins: number;
  start_buttons_json: string | null;
  karma_enabled: boolean;
  votekick_enabled: boolean;
  join_approval_enabled: boolean;
  join_approval_mode: string;
  ban_ghosts_enabled: boolean;
  auto_delete_seconds: number;
  mentionall_enabled: boolean;
  bot_language: string;
  ai_enabled: boolean;
  force_channel: string | null;
  booster_enabled: boolean;
  games_enabled: boolean;
  texttools_enabled: boolean;
  quicktools_enabled: boolean;
  mediadownload_enabled: boolean;
  funextras_enabled: boolean;
  infolookup_enabled: boolean;
  // Access control
  access_mode: 'public' | 'private';
  // General settings
  timezone: string;
  welcome_enabled: boolean;
  welcome_timing: string;
  rules_enabled: boolean;
  admonition_enabled: boolean;
  admonition_timing: string;
  noiseless_mode: boolean;
  noiseless_timing: string;
  auto_delete_bot_msgs: boolean;
  auto_delete_timing: string;
  auto_delete_minutes: number;
  check_admin_violations: boolean;
  verify_user_realness: boolean;
  ignore_public_commands: boolean;
  remove_join_leave_notifs: boolean;
  remove_join_leave_timing: string;
  anon_admin: boolean;
  admin_error_messages: boolean;
  // Warnings configuration
  warnings_enabled: boolean;
  warnings_timing: string;
  max_warnings: number;
  warning_keep_days: number;
  default_violation_penalty: string;
  warn_time: string;
  // Prohibitions
  prohibit_unofficial_ads: boolean;
  prohibit_unofficial_ads_timing: string;
  prohibit_bots_deletion: boolean;
  prohibit_bot_inviter_removal: boolean;
  prohibit_userbots: boolean;
  prohibit_userbots_timing: string;
  prohibit_userbots_penalty: string;
  strict_mode: boolean;
  prohibit_porn_words: boolean;
  prohibit_website_links: boolean;
  prohibit_telegram_links: boolean;
  prohibit_usernames: boolean;
  prohibit_hashtags: boolean;
  prohibit_text: boolean;
  prohibit_forwarding: boolean;
  prohibit_forward_channels: boolean;
  prohibit_pictures: boolean;
  prohibit_videos: boolean;
  prohibit_stickers: boolean;
  prohibit_emojis: boolean;
  prohibit_emoji_only: boolean;
  prohibit_location: boolean;
  prohibit_contact: boolean;
  prohibit_audio: boolean;
  prohibit_voice: boolean;
  prohibit_files: boolean;
  prohibit_apps: boolean;
  prohibit_apps_timing: string;
  prohibit_apps_penalty: string;
  prohibit_gifs: boolean;
  prohibit_polls: boolean;
  prohibit_glass_buttons: boolean;
  prohibit_games: boolean;
  prohibit_bot_commands: boolean;
  prohibit_textless_posts: boolean;
  prohibit_english: boolean;
  prohibit_arabic_farsi: boolean;
  prohibit_regular_reply: boolean;
  prohibit_external_reply: boolean;
  message_regex_pattern: string;
  forbidden_words: string;
  necessary_words: string;
  // Numerical limitations
  min_message_words: number;
  max_message_words: number;
  message_count_limit: number;
  message_count_timeframe_mins: number;
  max_repeated_messages: number;
  repeated_msg_timeframe_mins: number;
  // Silent times
  silent_time_1_enabled: boolean;
  silent_time_1_start: string;
  silent_time_1_end: string;
  silent_time_2_enabled: boolean;
  silent_time_2_start: string;
  silent_time_2_end: string;
  silent_time_3_enabled: boolean;
  silent_time_3_start: string;
  silent_time_3_end: string;
  temporary_lock_enabled: boolean;
  // Mandatory memberships
  forced_add_count: number;
  forced_add_timeframe_days: number;
  mandatory_channels: string;
  // Customized texts
  custom_welcome_text: string;
  custom_rules_text: string;
  custom_silent_start_text: string;
  custom_silent_end_text: string;
  custom_admonition_text: string;
  custom_forced_add_text: string;
  custom_mandatory_channel_text: string;
  // Antiflood enhancements
  antiflood_action: string;
  antiflood_timed_count: number;
  antiflood_timed_duration_secs: number;
  antiflood_clear_messages: boolean;
  // AntiRaid enhancements
  antiraid_time: string;
  antiraid_action_time: string;
  auto_antiraid_threshold: number;
  // CAPTCHA enhancements
  captcha_mode: string;
  captcha_rules: boolean;
  captcha_mute_time: string | null;
  captcha_kick: boolean;
  captcha_kick_time: string | null;
  captcha_button_text: string | null;
  // MemberBooster
  memberbooster_enabled: boolean;
  memberbooster_max: number;
  memberbooster_max_mode: string;
  memberbooster_text: string;
  memberbooster_text_enabled: boolean;
  memberbooster_channel_text: string;
  memberbooster_daily_text: string;
  memberbooster_daily: number;
  memberbooster_daily_minute: number;
  memberbooster_daily_mode: string;
  memberbooster_channel_enabled: boolean;
  memberbooster_channel: string;
  memberbooster_channel2_enabled: boolean;
  memberbooster_channel2: string;
  memberbooster_forced_boost: boolean;
  memberbooster_btn_enabled: boolean;
  memberbooster_btn_link: string;
  memberbooster_btn_text: string;
  memberbooster_hard_mode: boolean;
  // Additional feature settings
  clean_welcome: boolean;
  votekick_required_votes: number;
  votekick_timeout_secs: number;
  slowmode_seconds: number;
  blacklist_mode: string;
  reports_enabled: boolean;
  tickets_enabled: boolean;
  federation_enabled: boolean;
  autoreply_enabled: boolean;
  stickers_enabled: boolean;
  polls_enabled: boolean;
  namehistory_enabled: boolean;
  analytics_enabled: boolean;
  profiletools_enabled: boolean;
  mediatools_enabled: boolean;
  imagetools_enabled: boolean;
  slowmode_enabled: boolean;
}

const DEFAULT_CONFIG: Omit<TelegramConfig, 'session_id'> = {
  welcome_message: null,
  goodbye_message: null,
  rules_text: null,
  captcha_enabled: false,
  antiflood_enabled: false,
  antiflood_max_per_min: 10,
  antilink_enabled: false,
  antilink_whitelist: [],
  night_mode_enabled: false,
  night_mode_start: '22:00',
  night_mode_end: '06:00',
  warn_limit: 3,
  warn_action: 'mute',
  xp_enabled: true,
  log_channel_id: null,
  announce_channel_id: null,
  admin_only_mode: false,
  start_text: null,
  start_image_file_id: null,
  start_group_dm_text: null,
  help_text: null,
  owner_user_id: null,
  miniapp_base_url: null,
  night_mode_groups: [],
  antiraid_enabled: false,
  antiraid_threshold: 15,
  antiraid_mode: 'restrict',
  antiraid_duration_mins: 15,
  start_buttons_json: null,
  karma_enabled: false,
  votekick_enabled: false,
  join_approval_enabled: false,
  join_approval_mode: 'manual',
  ban_ghosts_enabled: false,
  auto_delete_seconds: 0,
  mentionall_enabled: true,
  bot_language: 'en',
  ai_enabled: false,
  force_channel: null,
  booster_enabled: false,
  games_enabled: true,
  texttools_enabled: true,
  quicktools_enabled: true,
  mediadownload_enabled: true,
  funextras_enabled: true,
  infolookup_enabled: true,
  // Access control
  access_mode: 'public',
  // General settings
  timezone: 'UTC',
  welcome_enabled: true,
  welcome_timing: 'always',
  rules_enabled: false,
  admonition_enabled: false,
  admonition_timing: 'always',
  noiseless_mode: false,
  noiseless_timing: 'always',
  auto_delete_bot_msgs: false,
  auto_delete_timing: 'always',
  auto_delete_minutes: 1,
  check_admin_violations: false,
  verify_user_realness: false,
  ignore_public_commands: false,
  remove_join_leave_notifs: false,
  remove_join_leave_timing: 'always',
  anon_admin: false,
  admin_error_messages: true,
  // Warnings configuration
  warnings_enabled: false,
  warnings_timing: 'always',
  max_warnings: 20,
  warning_keep_days: 3,
  default_violation_penalty: 'warn',
  warn_time: 'off',
  // Prohibitions
  prohibit_unofficial_ads: false,
  prohibit_unofficial_ads_timing: 'always',
  prohibit_bots_deletion: false,
  prohibit_bot_inviter_removal: false,
  prohibit_userbots: false,
  prohibit_userbots_timing: 'always',
  prohibit_userbots_penalty: 'default',
  strict_mode: false,
  prohibit_porn_words: false,
  prohibit_website_links: false,
  prohibit_telegram_links: false,
  prohibit_usernames: false,
  prohibit_hashtags: false,
  prohibit_text: false,
  prohibit_forwarding: false,
  prohibit_forward_channels: false,
  prohibit_pictures: false,
  prohibit_videos: false,
  prohibit_stickers: false,
  prohibit_emojis: false,
  prohibit_emoji_only: false,
  prohibit_location: false,
  prohibit_contact: false,
  prohibit_audio: false,
  prohibit_voice: false,
  prohibit_files: false,
  prohibit_apps: false,
  prohibit_apps_timing: 'always',
  prohibit_apps_penalty: 'default',
  prohibit_gifs: false,
  prohibit_polls: false,
  prohibit_glass_buttons: false,
  prohibit_games: false,
  prohibit_bot_commands: false,
  prohibit_textless_posts: false,
  prohibit_english: false,
  prohibit_arabic_farsi: false,
  prohibit_regular_reply: false,
  prohibit_external_reply: false,
  message_regex_pattern: '',
  forbidden_words: '',
  necessary_words: '',
  // Numerical limitations
  min_message_words: 0,
  max_message_words: 0,
  message_count_limit: 0,
  message_count_timeframe_mins: 1,
  max_repeated_messages: 0,
  repeated_msg_timeframe_mins: 1,
  // Silent times
  silent_time_1_enabled: false,
  silent_time_1_start: '00:00',
  silent_time_1_end: '06:00',
  silent_time_2_enabled: false,
  silent_time_2_start: '00:00',
  silent_time_2_end: '06:00',
  silent_time_3_enabled: false,
  silent_time_3_start: '00:00',
  silent_time_3_end: '06:00',
  temporary_lock_enabled: false,
  // Mandatory memberships
  forced_add_count: 0,
  forced_add_timeframe_days: 0,
  mandatory_channels: '',
  // Customized texts
  custom_welcome_text: 'Greetings, esteemed {user}! Welcome to {group}! We wish you a delightful experience during your presence here.',
  custom_rules_text: '',
  custom_silent_start_text: 'Silent time has been successfully activated. This group is currently in silent mode from {starttime} until {endtime}.',
  custom_silent_end_text: 'Silent time has been deactivated. The next silent time period will begin at {starttime}.',
  custom_admonition_text: 'Reason: {reason} | Penalty: {penalty} | {user_warnings} warnings out of {warnings_count} | Each warning will be deleted after {warningstime}',
  custom_forced_add_text: 'To be able to send messages to this group, you need to add {number} members. So far, you have added {added} members.',
  custom_mandatory_channel_text: 'Before sending messages to this group, please join the following channel(s)/group(s): {channel_names}',
  // Antiflood enhancements
  antiflood_action: 'mute',
  antiflood_timed_count: 0,
  antiflood_timed_duration_secs: 0,
  antiflood_clear_messages: false,
  // AntiRaid enhancements
  antiraid_time: '6h',
  antiraid_action_time: '1h',
  auto_antiraid_threshold: 0,
  // CAPTCHA enhancements
  captcha_mode: 'button',
  captcha_rules: false,
  captcha_mute_time: null,
  captcha_kick: true,
  captcha_kick_time: null,
  captcha_button_text: null,
  // MemberBooster
  memberbooster_enabled: false,
  memberbooster_max: 0,
  memberbooster_max_mode: 'new',
  memberbooster_text: '',
  memberbooster_text_enabled: true,
  memberbooster_channel_text: '',
  memberbooster_daily_text: '',
  memberbooster_daily: 0,
  memberbooster_daily_minute: 1440,
  memberbooster_daily_mode: 'reset',
  memberbooster_channel_enabled: false,
  memberbooster_channel: '',
  memberbooster_channel2_enabled: false,
  memberbooster_channel2: '',
  memberbooster_forced_boost: false,
  memberbooster_btn_enabled: false,
  memberbooster_btn_link: '',
  memberbooster_btn_text: '',
  memberbooster_hard_mode: false,
  // Additional feature settings
  clean_welcome: false,
  votekick_required_votes: 5,
  votekick_timeout_secs: 60,
  slowmode_seconds: 0,
  blacklist_mode: 'delete',
  reports_enabled: true,
  tickets_enabled: false,
  federation_enabled: false,
  autoreply_enabled: true,
  stickers_enabled: true,
  polls_enabled: true,
  namehistory_enabled: true,
  analytics_enabled: true,
  profiletools_enabled: true,
  mediatools_enabled: true,
  imagetools_enabled: true,
  slowmode_enabled: false,
};

const configCache = new Map<string, { data: TelegramConfig; expiresAt: number }>();
const CONFIG_TTL_MS = 60_000;

export async function getTelegramConfig(sessionId: string): Promise<TelegramConfig> {
  const cached = configCache.get(sessionId);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const { data, error } = await supabase
    .from('telegram_bot_configs')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error || !data) {
    return { ...DEFAULT_CONFIG, session_id: sessionId } as TelegramConfig;
  }

  const config: TelegramConfig = {
    ...DEFAULT_CONFIG,
    ...data,
  };
  configCache.set(sessionId, { data: config, expiresAt: Date.now() + CONFIG_TTL_MS });
  return config;
}

export async function updateTelegramConfig(
  sessionId: string,
  updates: Partial<TelegramConfig>,
): Promise<void> {
  const { error } = await supabase
    .from('telegram_bot_configs')
    .upsert(
      {
        session_id: sessionId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' },
    );

  if (error) {
    console.error(`[TG-DB] Failed to update config for ${sessionId}:`, error);
  }
  configCache.delete(sessionId);
}

export async function ensureConfig(sessionId: string): Promise<void> {
  const { data } = await supabase
    .from('telegram_bot_configs')
    .select('id')
    .eq('session_id', sessionId)
    .single();

  if (!data) {
    await supabase.from('telegram_bot_configs').insert({
      session_id: sessionId,
      ...DEFAULT_CONFIG,
    });
  }
}

// ─── Group Config (Per-Group) ────────────────────────────────────────────────

export interface GroupConfig {
  [key: string]: unknown;
  id?: string;
  session_id: string;
  chat_id: number;
  chat_title?: string;
  // Welcome
  welcome_enabled: boolean;
  welcome_message: string | null;
  welcome_delete_after: number;
  welcome_show_rules_btn: boolean;
  welcome_image_url: string | null;
  goodbye_enabled: boolean;
  goodbye_message: string | null;
  goodbye_image_url: string | null;
  // Captcha
  captcha_enabled: boolean;
  captcha_mode: string;
  captcha_timeout: number;
  captcha_action: string;
  captcha_message: string | null;
  captcha_restrict_on_join: boolean;
  // Warn
  warns_enabled: boolean;
  warn_limit: number;
  warn_action: string;
  warn_expiry_days: number;
  warn_message: string | null;
  warn_limit_message: string | null;
  // Antiflood
  antiflood_enabled: boolean;
  antiflood_max: number;
  antiflood_window: number;
  antiflood_action: string;
  antiflood_duration: number;
  antiflood_message: string | null;
  antiflood_exempt_admins: boolean;
  // Antilink
  antilink_enabled: boolean;
  antilink_action: string;
  antilink_whitelist: string[];
  antilink_allow_telegram: boolean;
  antilink_exempt_admins: boolean;
  antilink_message: string | null;
  // Night mode
  night_mode_enabled: boolean;
  night_mode_start: string;
  night_mode_end: string;
  night_mode_timezone: string;
  night_mode_lock_msg: string | null;
  night_mode_unlock_msg: string | null;
  night_mode_exempt_admins: boolean;
  // Antiraid
  antiraid_enabled: boolean;
  antiraid_threshold: number;
  antiraid_window: number;
  antiraid_mode: string;
  antiraid_duration: number;
  antiraid_message: string | null;
  // XP
  xp_enabled: boolean;
  xp_per_message: number;
  xp_levelup_announce: boolean;
  xp_levelup_message: string | null;
  xp_penalty_on_warn: number;
  xp_streak_bonus: boolean;
  // Rules
  rules_text: string | null;
  rules_enabled: boolean;
  rules_send_on_join: boolean;
  rules_pin_on_set: boolean;
  rules_button_on_welcome: boolean;
  // Modlog
  modlog_enabled: boolean;
  modlog_channel_id: string | null;
  announce_channel_id: string | null;
  modlog_bans: boolean;
  modlog_mutes: boolean;
  modlog_warns: boolean;
  modlog_joins: boolean;
  modlog_name_changes: boolean;
  // Booster / Force channel
  booster_enabled: boolean;
  booster_goal: number;
  booster_reward_text: string | null;
  force_channel_enabled: boolean;
  force_channel_id: string | null;
  force_channel_username: string | null;
  force_channel_action: string;
  force_channel_message: string | null;
  force_channel_verify_text: string;
  // AI
  ai_enabled: boolean;
  ai_system_prompt: string | null;
  ai_provider: string;
  ai_on_mention: boolean;
  ai_max_length: number;
  ai_cooldown: number;
  // Language
  language: string;
  allow_user_lang_override: boolean;
  translate_enabled: boolean;
  // Name history
  name_history_enabled: boolean;
  name_history_notify: boolean;
  name_history_log_channel: boolean;
  // Analytics
  analytics_enabled: boolean;
  // Games
  games_enabled: boolean;
  games_list: string[];
  game_xp_reward: number;
  game_cooldown: number;
  // Filters
  filters_enabled: boolean;
  filters_case_sensitive: boolean;
  filters_delete_trigger: boolean;
  filters_action: string;
  // Notes
  notes_enabled: boolean;
  notes_private: boolean;
  // Misc
  karma_enabled: boolean;
  votekick_enabled: boolean;
  votekick_required_votes: number;
  votekick_timeout_secs: number;
  join_approval_enabled: boolean;
  join_approval_mode: string;
  slowmode_enabled: boolean;
  slowmode_seconds: number;
  reports_enabled: boolean;
  tickets_enabled: boolean;
  federation_enabled: boolean;
  autoreply_enabled: boolean;
  stickers_enabled: boolean;
  polls_enabled: boolean;
  mentionall_enabled: boolean;
  ban_ghosts_enabled: boolean;
  texttools_enabled: boolean;
  quicktools_enabled: boolean;
  mediadownload_enabled: boolean;
  funextras_enabled: boolean;
  infolookup_enabled: boolean;
  profiletools_enabled: boolean;
  mediatools_enabled: boolean;
  imagetools_enabled: boolean;
  admin_only_mode: boolean;
  daily_summary_enabled: boolean;
  daily_summary_hour: number;
  daily_summary_channel_id: string | null;
  last_summary_sent_at?: string | null;
  timezone: string;
  created_at?: string;
  updated_at?: string;
}

const GROUP_CONFIG_DEFAULTS: Omit<GroupConfig, 'session_id' | 'chat_id'> = {
  welcome_enabled: false,
  welcome_message: null,
  welcome_delete_after: 0,
  welcome_show_rules_btn: false,
  welcome_image_url: null,
  goodbye_enabled: false,
  goodbye_message: null,
  goodbye_image_url: null,
  captcha_enabled: false,
  captcha_mode: 'button',
  captcha_timeout: 60,
  captcha_action: 'kick',
  captcha_message: null,
  captcha_restrict_on_join: true,
  warns_enabled: false,
  warn_limit: 3,
  warn_action: 'mute',
  warn_expiry_days: 0,
  warn_message: null,
  warn_limit_message: null,
  antiflood_enabled: false,
  antiflood_max: 10,
  antiflood_window: 10,
  antiflood_action: 'mute',
  antiflood_duration: 5,
  antiflood_message: null,
  antiflood_exempt_admins: true,
  antilink_enabled: false,
  antilink_action: 'delete',
  antilink_whitelist: [],
  antilink_allow_telegram: false,
  antilink_exempt_admins: true,
  antilink_message: null,
  night_mode_enabled: false,
  night_mode_start: '22:00',
  night_mode_end: '06:00',
  night_mode_timezone: 'UTC',
  night_mode_lock_msg: null,
  night_mode_unlock_msg: null,
  night_mode_exempt_admins: true,
  antiraid_enabled: false,
  antiraid_threshold: 15,
  antiraid_window: 60,
  antiraid_mode: 'restrict',
  antiraid_duration: 15,
  antiraid_message: null,
  xp_enabled: false,
  xp_per_message: 2,
  xp_levelup_announce: true,
  xp_levelup_message: null,
  xp_penalty_on_warn: 25,
  xp_streak_bonus: true,
  rules_text: null,
  rules_enabled: false,
  rules_send_on_join: false,
  rules_pin_on_set: false,
  rules_button_on_welcome: false,
  modlog_enabled: false,
  modlog_channel_id: null,
  announce_channel_id: null,
  modlog_bans: true,
  modlog_mutes: true,
  modlog_warns: true,
  modlog_joins: false,
  modlog_name_changes: false,
  booster_enabled: false,
  booster_goal: 5,
  booster_reward_text: null,
  force_channel_enabled: false,
  force_channel_id: null,
  force_channel_username: null,
  force_channel_action: 'delete',
  force_channel_message: null,
  force_channel_verify_text: 'I joined',
  ai_enabled: false,
  ai_system_prompt: null,
  ai_provider: 'groq',
  ai_on_mention: false,
  ai_max_length: 500,
  ai_cooldown: 10,
  language: 'en',
  allow_user_lang_override: true,
  translate_enabled: true,
  name_history_enabled: false,
  name_history_notify: false,
  name_history_log_channel: false,
  analytics_enabled: true,
  games_enabled: false,
  games_list: [],
  game_xp_reward: 10,
  game_cooldown: 30,
  filters_enabled: true,
  filters_case_sensitive: false,
  filters_delete_trigger: false,
  filters_action: 'reply',
  notes_enabled: true,
  notes_private: false,
  karma_enabled: false,
  votekick_enabled: false,
  votekick_required_votes: 5,
  votekick_timeout_secs: 60,
  join_approval_enabled: false,
  join_approval_mode: 'manual',
  slowmode_enabled: false,
  slowmode_seconds: 0,
  reports_enabled: true,
  tickets_enabled: false,
  federation_enabled: false,
  autoreply_enabled: true,
  stickers_enabled: true,
  polls_enabled: true,
  mentionall_enabled: true,
  ban_ghosts_enabled: false,
  texttools_enabled: true,
  quicktools_enabled: true,
  mediadownload_enabled: true,
  funextras_enabled: true,
  infolookup_enabled: true,
  profiletools_enabled: true,
  mediatools_enabled: true,
  imagetools_enabled: true,
  admin_only_mode: false,
  daily_summary_enabled: false,
  daily_summary_hour: 23,
  daily_summary_channel_id: null,
  timezone: 'UTC',
};

const groupConfigCache = new Map<string, { data: GroupConfig; expiresAt: number }>();
const GROUP_CONFIG_TTL_MS = 60_000;

/**
 * Get the effective config for a specific group.
 * Priority: group-specific config > global bot config > hardcoded defaults.
 */
export async function getGroupConfig(
  sessionId: string,
  chatId: string,
): Promise<TelegramConfig> {
  const cacheKey = `${sessionId}:${chatId}`;
  const cached = groupConfigCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data as unknown as TelegramConfig;
  }

  const globalConfig = await getTelegramConfig(sessionId);

  // `telegram_group_configs.chat_id` is BIGINT, so non-numeric sentinels like
  // 'global' (which a few handlers pass to read the session-level defaults)
  // can't be used as a query parameter — Postgres rejects them with
  // "invalid input syntax for type bigint". Skip the per-group lookup and
  // return the merged session-level defaults instead.
  const numericChatId = Number(chatId);
  const isGlobalLookup = chatId === 'global' || !Number.isFinite(numericChatId);

  const groupQuery = isGlobalLookup
    ? { data: null }
    : await supabase
        .from('telegram_group_configs')
        .select('*')
        .eq('session_id', sessionId)
        .eq('chat_id', chatId)
        .single();
  const groupData = groupQuery.data;

  // Merge: defaults < global config < group-specific config
  const merged = {
    ...GROUP_CONFIG_DEFAULTS,
    ...globalConfig,
    ...(groupData || {}),
    session_id: sessionId,
    chat_id: isGlobalLookup ? 0 : numericChatId,
  } as GroupConfig;

  groupConfigCache.set(cacheKey, { data: merged, expiresAt: Date.now() + GROUP_CONFIG_TTL_MS });
  return merged as unknown as TelegramConfig;
}

/**
 * Update (upsert) per-group config.
 */
export async function updateGroupConfig(
  sessionId: string,
  chatId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('telegram_group_configs')
    .upsert(
      {
        session_id: sessionId,
        chat_id: chatId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,chat_id' },
    );

  if (error) {
    console.error(`[TG-DB] Failed to update group config for ${sessionId}/${chatId}:`, error);
  }
  groupConfigCache.delete(`${sessionId}:${chatId}`);
}

/**
 * Get all groups for a session from telegram_group_configs.
 */
export async function getSessionGroups(
  sessionId: string,
): Promise<Array<{ chat_id: string; chat_title: string | null }>> {
  const { data, error } = await supabase
    .from('telegram_group_configs')
    .select('chat_id, chat_title')
    .eq('session_id', sessionId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn(`[TG-DB] getSessionGroups: ${error.message}`);
    return [];
  }
  return (data || []).map((r: { chat_id: number; chat_title: string | null }) => ({
    chat_id: String(r.chat_id),
    chat_title: r.chat_title,
  }));
}

/**
 * Ensure a group config row exists (auto-create on first activity).
 */
export async function ensureGroupConfig(
  sessionId: string,
  chatId: string,
  chatTitle?: string,
): Promise<void> {
  const { data } = await supabase
    .from('telegram_group_configs')
    .select('id, chat_title')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .single();

  if (!data) {
    await supabase.from('telegram_group_configs').insert({
      session_id: sessionId,
      chat_id: chatId,
      chat_title: chatTitle || null,
    });
  } else if (chatTitle && data.chat_title !== chatTitle) {
    await supabase
      .from('telegram_group_configs')
      .update({ chat_title: chatTitle, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('chat_id', chatId);
  }
}

// ─── Warnings ──────────────────────────────────────────────────────────────

export interface Warning {
  id: string;
  session_id: string;
  chat_id: string;
  user_id: string;
  warned_by: string;
  reason: string | null;
  created_at: string;
}

export async function addWarning(
  sessionId: string,
  chatId: string,
  userId: string,
  warnedBy: string,
  reason: string | null,
): Promise<number> {
  await supabase.from('telegram_warnings').insert({
    session_id: sessionId,
    chat_id: chatId,
    user_id: userId,
    warned_by: warnedBy,
    reason,
  });

  const { count } = await supabase
    .from('telegram_warnings')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId);

  return count || 1;
}

export async function removeWarning(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from('telegram_warnings')
    .select('id')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    await supabase.from('telegram_warnings').delete().eq('id', data[0].id);
  }

  const { count } = await supabase
    .from('telegram_warnings')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId);

  return count || 0;
}

export async function getWarnings(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<Warning[]> {
  const { data } = await supabase
    .from('telegram_warnings')
    .select('*')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (data as Warning[]) || [];
}

export async function getWarningCount(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from('telegram_warnings')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId);

  return count || 0;
}

export async function resetWarnings(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('telegram_warnings')
    .delete()
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId);
}

// ─── Notes ─────────────────────────────────────────────────────────────────

export interface Note {
  id: string;
  session_id: string;
  chat_id: string;
  note_name: string;
  content: string;
  created_at: string;
}

export async function saveNote(
  sessionId: string,
  chatId: string,
  name: string,
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from('telegram_notes')
    .upsert(
      {
        session_id: sessionId,
        chat_id: chatId,
        note_name: name.toLowerCase(),
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,chat_id,note_name' },
    );

  if (error) {
    console.error(`[TG-DB] Failed to save note "${name}":`, error);
  }
}

export async function getNote(
  sessionId: string,
  chatId: string,
  name: string,
): Promise<Note | null> {
  const { data } = await supabase
    .from('telegram_notes')
    .select('*')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('note_name', name.toLowerCase())
    .single();

  return data as Note | null;
}

export async function deleteNote(
  sessionId: string,
  chatId: string,
  name: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_notes')
    .delete()
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('note_name', name.toLowerCase());

  return !error;
}

export async function listNotes(
  sessionId: string,
  chatId: string,
): Promise<Note[]> {
  const { data } = await supabase
    .from('telegram_notes')
    .select('*')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .order('note_name');

  return (data as Note[]) || [];
}

// ─── Filters ───────────────────────────────────────────────────────────────

export interface Filter {
  id: string;
  session_id: string;
  chat_id: string;
  keyword: string;
  response: string;
  is_regex: boolean;
  image_url?: string;
}

export async function addFilter(
  sessionId: string,
  chatId: string,
  keyword: string,
  response: string,
  isRegex: boolean = false,
): Promise<void> {
  await supabase
    .from('telegram_filters')
    .upsert(
      {
        session_id: sessionId,
        chat_id: chatId,
        keyword: keyword.toLowerCase(),
        response,
        is_regex: isRegex,
      },
      { onConflict: 'session_id,chat_id,keyword' },
    );
}

export async function removeFilter(
  sessionId: string,
  chatId: string,
  keyword: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_filters')
    .delete()
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('keyword', keyword.toLowerCase());

  return !error;
}

export async function getFilters(
  sessionId: string,
  chatId: string,
): Promise<Filter[]> {
  const { data } = await supabase
    .from('telegram_filters')
    .select('*')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId);

  return (data as Filter[]) || [];
}

// ─── XP ───────────────────────────────────────────────��────────────────────

const XP_PER_MESSAGE = 2;
const XP_LEVEL_MULTIPLIER = 100;

function xpForLevel(level: number): number {
  return level * level * XP_LEVEL_MULTIPLIER;
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / XP_LEVEL_MULTIPLIER)) + 1;
}

export interface XpResult {
  xp: number;
  level: number;
  leveledUp: boolean;
}

export async function awardXp(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<XpResult> {
  const { data: existing } = await supabase
    .from('telegram_xp')
    .select('*')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .single();

  const currentXp = existing?.xp || 0;
  const currentLevel = existing?.level || 1;
  const newXp = currentXp + XP_PER_MESSAGE;
  const newLevel = levelFromXp(newXp);
  const leveledUp = newLevel > currentLevel;
  const today = new Date().toISOString().split('T')[0];

  if (existing) {
    const streakDays = existing.last_active_date === today
      ? existing.streak_days
      : (existing.streak_days || 0) + 1;

    await supabase
      .from('telegram_xp')
      .update({
        xp: newXp,
        level: newLevel,
        streak_days: streakDays,
        last_active_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('telegram_xp').insert({
      session_id: sessionId,
      chat_id: chatId,
      user_id: userId,
      xp: newXp,
      level: newLevel,
      streak_days: 1,
      last_active_date: today,
    });
  }

  return { xp: newXp, level: newLevel, leveledUp };
}

export async function getXp(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<{ xp: number; level: number; streak_days: number } | null> {
  const { data } = await supabase
    .from('telegram_xp')
    .select('xp, level, streak_days')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .single();

  return data;
}

export async function getXpLeaderboard(
  sessionId: string,
  chatId: string,
  limit: number = 10,
): Promise<Array<{ user_id: string; xp: number; level: number }>> {
  const { data } = await supabase
    .from('telegram_xp')
    .select('user_id, xp, level')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .order('xp', { ascending: false })
    .limit(limit);

  return data || [];
}

// ─── Captcha ───────────────────────────────────────────────────────────────

export async function setCaptchaPending(
  sessionId: string,
  chatId: string,
  userId: string,
  expiresAt: Date,
): Promise<void> {
  await supabase.from('telegram_captcha_pending').insert({
    session_id: sessionId,
    chat_id: chatId,
    user_id: userId,
    verified: false,
    expires_at: expiresAt.toISOString(),
  });
}

export async function markCaptchaVerified(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('telegram_captcha_pending')
    .update({ verified: true })
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .eq('verified', false);
}

export async function isCaptchaVerified(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('telegram_captcha_pending')
    .select('verified')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data?.verified === true;
}

// ─── Moderation Log ────────────────────────────────────────────────────────

export async function logModAction(
  sessionId: string,
  chatId: string,
  action: string,
  targetUserId: string | null,
  moderatorUserId: string | null,
  reason: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  await supabase.from('telegram_moderation_log').insert({
    session_id: sessionId,
    chat_id: chatId,
    action,
    target_user_id: targetUserId,
    moderator_user_id: moderatorUserId,
    reason,
    details,
  }).then(({ error }) => {
    if (error) console.error(`[TG-DB] Failed to log mod action:`, error);
  });
}

// ─── Blacklist ──────────────────────────────────────────────────────────────

const blacklistCache = new Map<string, { words: string[]; expiresAt: number }>();
const BLACKLIST_TTL = 30_000;

export async function getBlacklistedWords(
  sessionId: string,
  chatId: string,
): Promise<string[]> {
  const key = `${sessionId}:${chatId}`;
  const cached = blacklistCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.words;

  const { data } = await supabase
    .from('telegram_blacklist')
    .select('word')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId);

  const words = (data || []).map((r: { word: string }) => r.word);
  blacklistCache.set(key, { words, expiresAt: Date.now() + BLACKLIST_TTL });
  return words;
}

export async function addBlacklistWord(
  sessionId: string,
  chatId: string,
  word: string,
): Promise<void> {
  await supabase.from('telegram_blacklist').upsert(
    { session_id: sessionId, chat_id: chatId, word: word.toLowerCase() },
    { onConflict: 'session_id,chat_id,word' },
  );
  blacklistCache.delete(`${sessionId}:${chatId}`);
}

export async function removeBlacklistWord(
  sessionId: string,
  chatId: string,
  word: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_blacklist')
    .delete()
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('word', word.toLowerCase());
  blacklistCache.delete(`${sessionId}:${chatId}`);
  return !error;
}

export async function getBlacklistMode(
  sessionId: string,
  chatId: string,
): Promise<string> {
  const { data } = await supabase
    .from('telegram_blacklist_settings')
    .select('mode')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .single();
  return data?.mode || 'delete';
}

export async function setBlacklistMode(
  sessionId: string,
  chatId: string,
  mode: string,
): Promise<void> {
  await supabase.from('telegram_blacklist_settings').upsert(
    { session_id: sessionId, chat_id: chatId, mode },
    { onConflict: 'session_id,chat_id' },
  );
}

// ─── Reports ────────────────────────────────────────────────────────────────

export interface Report {
  id: number;
  session_id: string;
  chat_id: string;
  reporter_user_id: string;
  reported_user_id: string;
  message_id: string;
  reason: string | null;
  status: string;
  resolved_by: string | null;
  created_at: string;
}

export async function createReport(
  sessionId: string,
  chatId: string,
  reporterUserId: string,
  reportedUserId: string,
  messageId: string,
  reason: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('telegram_reports')
    .insert({
      session_id: sessionId,
      chat_id: chatId,
      reporter_user_id: reporterUserId,
      reported_user_id: reportedUserId,
      message_id: messageId,
      reason,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error(`[TG-DB] Failed to create report:`, error);
    return 0;
  }
  return data?.id || 0;
}

export async function getReports(
  sessionId: string,
  chatId: string,
  status: string = 'pending',
): Promise<Report[]> {
  const { data } = await supabase
    .from('telegram_reports')
    .select('*')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data as Report[]) || [];
}

export async function resolveReport(
  sessionId: string,
  reportId: number,
  resolvedBy: string,
): Promise<boolean> {
  const { error, count } = await supabase
    .from('telegram_reports')
    .update({ status: 'resolved', resolved_by: resolvedBy })
    .eq('session_id', sessionId)
    .eq('id', reportId)
    .eq('status', 'pending');

  return !error;
}

export async function dismissReport(
  sessionId: string,
  reportId: number,
  dismissedBy: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_reports')
    .update({ status: 'dismissed', resolved_by: dismissedBy })
    .eq('session_id', sessionId)
    .eq('id', reportId)
    .eq('status', 'pending');

  return !error;
}

// ─── Locks ──────────────────────────────────────────────────────────────────

const locksCache = new Map<string, { locks: string[]; expiresAt: number }>();
const LOCKS_TTL = 30_000;

export async function getLocks(
  sessionId: string,
  chatId: string,
): Promise<string[]> {
  const key = `${sessionId}:${chatId}`;
  const cached = locksCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.locks;

  const { data } = await supabase
    .from('telegram_locks')
    .select('lock_type')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('is_locked', true);

  const locks = (data || []).map((r: { lock_type: string }) => r.lock_type);
  locksCache.set(key, { locks, expiresAt: Date.now() + LOCKS_TTL });
  return locks;
}

export async function setLock(
  sessionId: string,
  chatId: string,
  lockType: string,
  isLocked: boolean,
): Promise<void> {
  await supabase.from('telegram_locks').upsert(
    {
      session_id: sessionId,
      chat_id: chatId,
      lock_type: lockType,
      is_locked: isLocked,
    },
    { onConflict: 'session_id,chat_id,lock_type' },
  );
  locksCache.delete(`${sessionId}:${chatId}`);
}

export async function clearAllLocks(
  sessionId: string,
  chatId: string,
): Promise<void> {
  await supabase
    .from('telegram_locks')
    .delete()
    .eq('session_id', sessionId)
    .eq('chat_id', chatId);
  locksCache.delete(`${sessionId}:${chatId}`);
}

// ─── Scheduled Messages ─────────────────────────────────────────────────────

export interface ScheduledMessage {
  id: number;
  session_id: string;
  chat_id: string;
  content: string;
  schedule_type: string;
  next_send_at: string;
  time_of_day: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  media_url?: string;
}

export async function createScheduledMessage(
  sessionId: string,
  chatId: string,
  content: string,
  scheduleType: string,
  nextSendAt: Date,
  createdBy: string,
  timeOfDay?: string,
  mediaUrl?: string,
): Promise<number> {
  const insertData: Record<string, unknown> = {
    session_id: sessionId,
    chat_id: chatId,
    content,
    schedule_type: scheduleType,
    next_send_at: nextSendAt.toISOString(),
    time_of_day: timeOfDay || null,
    is_active: true,
    created_by: createdBy,
  };
  if (mediaUrl) insertData.media_url = mediaUrl;
  const { data, error } = await supabase
    .from('telegram_scheduled_messages')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error(`[TG-DB] Failed to create scheduled message:`, error);
    return 0;
  }
  return data?.id || 0;
}

export async function getScheduledMessages(
  sessionId: string,
  chatId: string,
): Promise<ScheduledMessage[]> {
  const { data } = await supabase
    .from('telegram_scheduled_messages')
    .select('*')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('is_active', true)
    .order('next_send_at', { ascending: true })
    .limit(20);

  return (data as ScheduledMessage[]) || [];
}

export async function cancelScheduledMessage(
  sessionId: string,
  chatId: string,
  messageId: number,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_scheduled_messages')
    .update({ is_active: false })
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('id', messageId)
    .eq('is_active', true);

  return !error;
}

export async function getDueScheduledMessages(): Promise<ScheduledMessage[]> {
  const { data } = await supabase
    .from('telegram_scheduled_messages')
    .select('*')
    .eq('is_active', true)
    .lte('next_send_at', new Date().toISOString())
    .limit(50);

  return (data as ScheduledMessage[]) || [];
}

export async function markScheduledMessageSent(
  messageId: number,
  scheduleType: string,
  timeOfDay: string | null,
): Promise<void> {
  if (scheduleType === 'once') {
    await supabase
      .from('telegram_scheduled_messages')
      .update({ is_active: false })
      .eq('id', messageId);
  } else if (scheduleType === 'daily' && timeOfDay) {
    // Calculate next send time
    const [h, m] = timeOfDay.split(':').map(Number);
    const next = new Date();
    next.setUTCHours(h, m, 0, 0);
    next.setUTCDate(next.getUTCDate() + 1);

    await supabase
      .from('telegram_scheduled_messages')
      .update({ next_send_at: next.toISOString() })
      .eq('id', messageId);
  }
}

// ─── Federation (TrustNet) ──────────────────────────────────────────────────

export interface Federation {
  id: string;
  session_id: string;
  name: string;
  owner_user_id: string;
  invite_code: string;
  created_at: string;
}

export interface FederationMember {
  federation_id: string;
  chat_id: string;
  joined_by: string;
  created_at: string;
}

export interface FederationBan {
  id: string;
  federation_id: string;
  user_id: string;
  reason: string | null;
  banned_by: string;
  created_at: string;
}

export interface FederationAdmin {
  federation_id: string;
  user_id: string;
  added_by: string;
  created_at: string;
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function createFederation(
  sessionId: string,
  name: string,
  ownerUserId: string,
): Promise<Federation | null> {
  const { data, error } = await supabase
    .from('telegram_federations')
    .insert({
      session_id: sessionId,
      name,
      owner_user_id: ownerUserId,
      invite_code: generateInviteCode(),
    })
    .select('*')
    .single();

  if (error) {
    console.error(`[TG-DB] Failed to create federation:`, error);
    return null;
  }
  return data as Federation;
}

export async function getFederation(federationId: string): Promise<Federation | null> {
  const { data } = await supabase
    .from('telegram_federations')
    .select('*')
    .eq('id', federationId)
    .single();
  return data as Federation | null;
}

export async function getFederationByInviteCode(code: string): Promise<Federation | null> {
  const { data } = await supabase
    .from('telegram_federations')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .single();
  return data as Federation | null;
}

export async function getUserFederations(ownerUserId: string): Promise<Federation[]> {
  const { data } = await supabase
    .from('telegram_federations')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false });
  return (data as Federation[]) || [];
}

export async function getFederationForChat(chatId: string): Promise<Federation | null> {
  const { data: member } = await supabase
    .from('telegram_federation_members')
    .select('federation_id')
    .eq('chat_id', chatId)
    .single();

  if (!member) return null;
  return getFederation(member.federation_id);
}

export async function joinFederation(
  federationId: string,
  chatId: string,
  joinedBy: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_federation_members')
    .upsert(
      { federation_id: federationId, chat_id: chatId, joined_by: joinedBy },
      { onConflict: 'federation_id,chat_id' },
    );
  return !error;
}

export async function leaveFederation(chatId: string): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_federation_members')
    .delete()
    .eq('chat_id', chatId);
  return !error;
}

export async function getFederationChats(federationId: string): Promise<FederationMember[]> {
  const { data } = await supabase
    .from('telegram_federation_members')
    .select('*')
    .eq('federation_id', federationId);
  return (data as FederationMember[]) || [];
}

export async function addFederationBan(
  federationId: string,
  userId: string,
  reason: string | null,
  bannedBy: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_federation_bans')
    .upsert(
      { federation_id: federationId, user_id: userId, reason, banned_by: bannedBy },
      { onConflict: 'federation_id,user_id' },
    );
  return !error;
}

export async function removeFederationBan(
  federationId: string,
  userId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_federation_bans')
    .delete()
    .eq('federation_id', federationId)
    .eq('user_id', userId);
  return !error;
}

export async function getFederationBans(federationId: string): Promise<FederationBan[]> {
  const { data } = await supabase
    .from('telegram_federation_bans')
    .select('*')
    .eq('federation_id', federationId)
    .order('created_at', { ascending: false });
  return (data as FederationBan[]) || [];
}

export async function isFederationBanned(
  federationId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('telegram_federation_bans')
    .select('id')
    .eq('federation_id', federationId)
    .eq('user_id', userId)
    .single();
  return !!data;
}

export async function addFederationAdmin(
  federationId: string,
  userId: string,
  addedBy: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_federation_admins')
    .upsert(
      { federation_id: federationId, user_id: userId, added_by: addedBy },
      { onConflict: 'federation_id,user_id' },
    );
  return !error;
}

export async function removeFederationAdmin(
  federationId: string,
  userId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_federation_admins')
    .delete()
    .eq('federation_id', federationId)
    .eq('user_id', userId);
  return !error;
}

export async function getFederationAdmins(federationId: string): Promise<FederationAdmin[]> {
  const { data } = await supabase
    .from('telegram_federation_admins')
    .select('*')
    .eq('federation_id', federationId);
  return (data as FederationAdmin[]) || [];
}

export async function isFederationAdmin(
  federationId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('telegram_federation_admins')
    .select('federation_id')
    .eq('federation_id', federationId)
    .eq('user_id', userId)
    .single();
  return !!data;
}

// ─── Anti-Raid ──────────────────────────────────────────────────────────────

export interface AntiraidSession {
  id: string;
  session_id: string;
  chat_id: string;
  is_active: boolean;
  triggered_by: string;
  started_at: string;
}

export async function trackJoin(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<void> {
  await supabase.from('telegram_antiraid_joins').insert({
    session_id: sessionId,
    chat_id: chatId,
    user_id: userId,
    joined_at: new Date().toISOString(),
  });
}

export async function getRecentJoinCount(
  sessionId: string,
  chatId: string,
  windowMs: number = 60_000,
): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count } = await supabase
    .from('telegram_antiraid_joins')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .gte('joined_at', since);
  return count || 0;
}

export async function startRaidSession(
  sessionId: string,
  chatId: string,
  triggeredBy: string,
): Promise<void> {
  await supabase.from('telegram_antiraid_sessions').upsert(
    {
      session_id: sessionId,
      chat_id: chatId,
      is_active: true,
      triggered_by: triggeredBy,
      started_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,chat_id' },
  );
}

export async function endRaidSession(
  sessionId: string,
  chatId: string,
): Promise<void> {
  await supabase
    .from('telegram_antiraid_sessions')
    .update({ is_active: false })
    .eq('session_id', sessionId)
    .eq('chat_id', chatId);
}

export async function isRaidActive(
  sessionId: string,
  chatId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('telegram_antiraid_sessions')
    .select('is_active')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .single();
  return data?.is_active === true;
}

// ─── Tickets ────────────────────────────────────────────────────────────────

export interface Ticket {
  id: number;
  session_id: string;
  chat_id: string;
  creator_id: string;
  subject: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: string;
  message_text: string;
  is_staff: boolean;
  is_system: boolean;
  created_at: string;
}

export async function createTicket(
  sessionId: string,
  chatId: string,
  creatorId: string,
  subject: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('telegram_tickets')
    .insert({
      session_id: sessionId,
      chat_id: chatId,
      creator_id: creatorId,
      subject,
      priority: 'normal',
      status: 'open',
    })
    .select('id')
    .single();

  if (error) {
    console.error(`[TG-DB] Failed to create ticket:`, error);
    return 0;
  }
  return data?.id || 0;
}

export async function getTicket(
  sessionId: string,
  ticketId: number,
): Promise<Ticket | null> {
  const { data } = await supabase
    .from('telegram_tickets')
    .select('*')
    .eq('session_id', sessionId)
    .eq('id', ticketId)
    .single();
  return data as Ticket | null;
}

export async function getOpenTickets(
  sessionId: string,
  chatId: string,
): Promise<Ticket[]> {
  const { data } = await supabase
    .from('telegram_tickets')
    .select('*')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(20);
  return (data as Ticket[]) || [];
}

export async function closeTicket(
  sessionId: string,
  ticketId: number,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_tickets')
    .update({ status: 'closed' })
    .eq('session_id', sessionId)
    .eq('id', ticketId);
  return !error;
}

export async function assignTicket(
  sessionId: string,
  ticketId: number,
  assignedTo: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_tickets')
    .update({ assigned_to: assignedTo, status: 'in_progress' })
    .eq('session_id', sessionId)
    .eq('id', ticketId);
  return !error;
}

export async function escalateTicket(
  sessionId: string,
  ticketId: number,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_tickets')
    .update({ priority: 'high' })
    .eq('session_id', sessionId)
    .eq('id', ticketId);
  return !error;
}

export async function addTicketMessage(
  ticketId: number,
  senderId: string,
  messageText: string,
  isStaff: boolean,
  isSystem: boolean = false,
): Promise<void> {
  await supabase.from('telegram_ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: senderId,
    message_text: messageText,
    is_staff: isStaff,
    is_system: isSystem,
  });
}

// ─── AFK (Persisted) ───────────────────────────────────────────────────────

export async function setAfk(
  sessionId: string,
  chatId: string,
  userId: string,
  reason: string,
): Promise<void> {
  await supabase.from('telegram_afk').upsert(
    {
      session_id: sessionId,
      chat_id: chatId,
      user_id: userId,
      reason,
      since: new Date().toISOString(),
    },
    { onConflict: 'session_id,chat_id,user_id' },
  );
}

export async function getAfk(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<{ reason: string; since: string } | null> {
  const { data } = await supabase
    .from('telegram_afk')
    .select('reason, since')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .single();
  return data;
}

export async function removeAfk(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('telegram_afk')
    .delete()
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId);
  return !error;
}

// ─── Moderation Log (read) ──────────────────────────────────────────────────

export async function getModLog(
  sessionId: string,
  chatId: string,
  limit: number = 20,
): Promise<Array<{
  action: string;
  target_user_id: string | null;
  moderator_user_id: string | null;
  reason: string | null;
  created_at: string;
}>> {
  const { data } = await supabase
    .from('telegram_moderation_log')
    .select('action, target_user_id, moderator_user_id, reason, created_at')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ─── Groups ─────────────────────────────────────────────────────────────────

export interface TelegramGroup {
  session_id: string;
  chat_id: string;
  chat_title: string;
  chat_type: string;
  added_by_user_id: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function registerGroup(
  sessionId: string,
  chatId: string,
  chatTitle: string,
  chatType: string,
  addedByUserId: string | null,
): Promise<void> {
  const { error } = await supabase.from('telegram_groups').upsert(
    {
      session_id: sessionId,
      chat_id: chatId,
      chat_title: chatTitle,
      chat_type: chatType,
      added_by_user_id: addedByUserId,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,chat_id' },
  );
  if (error) {
    console.warn(`[TG-DB] registerGroup ${chatId}: ${error.message}`);
  }
}

export async function unregisterGroup(
  sessionId: string,
  chatId: string,
): Promise<void> {
  const { error } = await supabase
    .from('telegram_groups')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('chat_id', chatId);
  if (error) {
    console.warn(`[TG-DB] unregisterGroup ${chatId}: ${error.message}`);
  }
}

export async function getActiveGroups(
  sessionId: string,
): Promise<TelegramGroup[]> {
  const { data, error } = await supabase
    .from('telegram_groups')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn(`[TG-DB] getActiveGroups: ${error.message}`);
    return [];
  }
  return (data as TelegramGroup[]) || [];
}

// ─── XP Reset ───────────────────────────────────────────────────────────────

export async function resetXp(
  sessionId: string,
  chatId: string,
): Promise<void> {
  await supabase
    .from('telegram_xp')
    .delete()
    .eq('session_id', sessionId)
    .eq('chat_id', chatId);
}

// ─── Broadcast Stats ────────────────────────────────────────────────────────

export async function getActiveChats(sessionId: string): Promise<string[]> {
  const { data } = await supabase
    .from('telegram_moderation_log')
    .select('chat_id')
    .eq('session_id', sessionId);

  const chatIds = new Set<string>();
  if (data) {
    for (const row of data) {
      if (row.chat_id) chatIds.add(row.chat_id);
    }
  }

  const { data: xpData } = await supabase
    .from('telegram_xp')
    .select('chat_id')
    .eq('session_id', sessionId);

  if (xpData) {
    for (const row of xpData) {
      if (row.chat_id) chatIds.add(row.chat_id);
    }
  }

  return Array.from(chatIds);
}

// ─── Approved Users ─────────────────────────────────────────────────────────

export async function approveUser(
  sessionId: string,
  chatId: string,
  userId: string,
  approvedBy: string,
): Promise<void> {
  await supabase.from('telegram_approved_users').upsert(
    { session_id: sessionId, chat_id: chatId, user_id: userId, approved_by: approvedBy },
    { onConflict: 'session_id,chat_id,user_id' },
  );
}

export async function unapproveUser(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('telegram_approved_users')
    .delete()
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId);
}

export async function isApprovedUser(
  sessionId: string,
  chatId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('telegram_approved_users')
    .select('id')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .single();
  return !!data;
}

export async function getApprovedUsers(
  sessionId: string,
  chatId: string,
): Promise<Array<{ user_id: string; approved_by: string; created_at: string }>> {
  const { data } = await supabase
    .from('telegram_approved_users')
    .select('user_id, approved_by, created_at')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function unapproveAllUsers(
  sessionId: string,
  chatId: string,
): Promise<void> {
  await supabase
    .from('telegram_approved_users')
    .delete()
    .eq('session_id', sessionId)
    .eq('chat_id', chatId);
}

// ─── Group Statistics ───────────────────────────────────────────────────────

export async function incrementGroupStat(
  sessionId: string,
  chatId: string,
  field: 'new_members' | 'left_members' | 'messages_count',
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('telegram_group_stats')
    .select('id, ' + field)
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('date', today)
    .single();

  if (existing) {
    const rec = existing as any;
    await supabase
      .from('telegram_group_stats')
      .update({ [field]: ((rec[field] as number) || 0) + 1 })
      .eq('id', rec.id as string);
  } else {
    await supabase.from('telegram_group_stats').insert({
      session_id: sessionId,
      chat_id: chatId,
      date: today,
      [field]: 1,
    });
  }
}

export async function getGroupStats(
  sessionId: string,
  chatId: string,
  days: number = 30,
): Promise<Array<{ date: string; new_members: number; left_members: number; messages_count: number }>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data } = await supabase
    .from('telegram_group_stats')
    .select('date, new_members, left_members, messages_count')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });

  return data || [];
}

// ─── Bot Ignored Chats ──────────────────────────────────���──────────────────

export async function getIgnoredChats(
  sessionId: string,
): Promise<Array<{ chat_id: string; chat_title: string | null }>> {
  const { data } = await supabase
    .from('bot_ignored_chats')
    .select('chat_id, chat_title')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });
  return (data || []) as Array<{ chat_id: string; chat_title: string | null }>;
}

export async function addIgnoredChat(
  sessionId: string,
  chatId: string,
  chatTitle?: string,
): Promise<void> {
  const { error } = await supabase
    .from('bot_ignored_chats')
    .upsert(
      { session_id: sessionId, chat_id: chatId, chat_title: chatTitle || null },
      { onConflict: 'session_id,chat_id' },
    );
  if (error) console.error('[TG-DB] addIgnoredChat error:', error.message);
}

export async function removeIgnoredChat(
  sessionId: string,
  chatId: string,
): Promise<void> {
  const { error } = await supabase
    .from('bot_ignored_chats')
    .delete()
    .eq('session_id', sessionId)
    .eq('chat_id', chatId);
  if (error) console.error('[TG-DB] removeIgnoredChat error:', error.message);
}

export async function isIgnoredChat(
  sessionId: string,
  chatId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('bot_ignored_chats')
    .select('id')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .limit(1);
  return (data || []).length > 0;
}

// ─── Admin-Only Mode ───────────────────────────────────────────────────────

export async function getAdminOnlyMode(
  sessionId: string,
  chatId?: string,
): Promise<boolean> {
  if (chatId) {
    const { data: groupData } = await supabase
      .from('telegram_group_configs')
      .select('admin_only_mode')
      .eq('session_id', sessionId)
      .eq('chat_id', chatId)
      .maybeSingle();

    const groupMode = (groupData as Record<string, unknown> | null)?.admin_only_mode;
    if (groupMode !== null && groupMode !== undefined) {
      return !!groupMode;
    }
  }

  const { data } = await supabase
    .from('telegram_bot_configs')
    .select('admin_only_mode')
    .eq('session_id', sessionId)
    .maybeSingle();

  return !!(data as Record<string, unknown> | null)?.admin_only_mode;
}

export async function setAdminOnlyMode(
  sessionId: string,
  enabled: boolean,
  chatId?: string,
): Promise<void> {
  if (chatId) {
    const { error } = await supabase
      .from('telegram_group_configs')
      .upsert(
        {
          session_id: sessionId,
          chat_id: chatId,
          admin_only_mode: enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,chat_id' },
      );

    if (error) {
      console.error('[TG-DB] setAdminOnlyMode(group) error:', error.message);
    }
    groupConfigCache.delete(`${sessionId}:${chatId}`);
    return;
  }

  const { error } = await supabase
    .from('telegram_bot_configs')
    .upsert({ session_id: sessionId, admin_only_mode: enabled }, { onConflict: 'session_id' });
  if (error) console.error('[TG-DB] setAdminOnlyMode error:', error.message);
  configCache.delete(sessionId);
}

// ─── Access Control (public/private mode + allowlists/blocklists) ─────────
//
// `access_mode` is stored on telegram_bot_configs:
//   - 'public'  : anyone can add the bot to any group, anyone can DM it.
//                 Blocklist is still enforced.
//   - 'private' : bot only operates in groups on `telegram_group_allowlist`
//                 and only responds to users on `telegram_user_allowlist`
//                 (if at least one user-allowlist row exists).
//
// All four reads are short-cached so middleware can call them on every
// incoming message without hammering Supabase.

export type AccessMode = 'public' | 'private';

interface AccessConfig {
  mode: AccessMode;
  groupAllowlist: Set<string>;
  groupBlocklist: Set<string>;
  userAllowlist: Set<string>;
}

const accessConfigCache = new Map<string, { data: AccessConfig; expiresAt: number }>();
const ACCESS_CONFIG_TTL_MS = 30_000;

export function invalidateAccessConfigCache(sessionId: string): void {
  accessConfigCache.delete(sessionId);
}

export async function getAccessMode(sessionId: string): Promise<AccessMode> {
  const { data } = await supabase
    .from('telegram_bot_configs')
    .select('access_mode')
    .eq('session_id', sessionId)
    .maybeSingle();
  const raw = (data as Record<string, unknown> | null)?.access_mode;
  return raw === 'private' ? 'private' : 'public';
}

export async function setAccessMode(
  sessionId: string,
  mode: AccessMode,
): Promise<void> {
  const { error } = await supabase
    .from('telegram_bot_configs')
    .upsert(
      { session_id: sessionId, access_mode: mode },
      { onConflict: 'session_id' },
    );
  if (error) console.error('[TG-DB] setAccessMode error:', error.message);
  invalidateAccessConfigCache(sessionId);
}

async function loadAccessConfig(sessionId: string): Promise<AccessConfig> {
  const [modeRow, allowGroups, blockGroups, allowUsers] = await Promise.all([
    supabase
      .from('telegram_bot_configs')
      .select('access_mode')
      .eq('session_id', sessionId)
      .maybeSingle(),
    supabase
      .from('telegram_group_allowlist')
      .select('chat_id')
      .eq('session_id', sessionId),
    supabase
      .from('telegram_group_blocklist')
      .select('chat_id')
      .eq('session_id', sessionId),
    supabase
      .from('telegram_user_allowlist')
      .select('user_id')
      .eq('session_id', sessionId),
  ]);

  const rawMode = (modeRow.data as Record<string, unknown> | null)?.access_mode;
  return {
    mode: rawMode === 'private' ? 'private' : 'public',
    groupAllowlist: new Set(
      (allowGroups.data || []).map((r: { chat_id: string }) => String(r.chat_id)),
    ),
    groupBlocklist: new Set(
      (blockGroups.data || []).map((r: { chat_id: string }) => String(r.chat_id)),
    ),
    userAllowlist: new Set(
      (allowUsers.data || []).map((r: { user_id: string }) => String(r.user_id)),
    ),
  };
}

async function getAccessConfigCached(sessionId: string): Promise<AccessConfig> {
  const cached = accessConfigCache.get(sessionId);
  if (cached && Date.now() < cached.expiresAt) return cached.data;
  const data = await loadAccessConfig(sessionId);
  accessConfigCache.set(sessionId, { data, expiresAt: Date.now() + ACCESS_CONFIG_TTL_MS });
  return data;
}

/**
 * Should the bot operate in this chat at all?
 *
 *   - Blocklist always wins → returns false.
 *   - In private mode, only chats on the allowlist return true.
 *   - In public mode (default), any chat not on the blocklist returns true.
 */
export async function isGroupAllowed(
  sessionId: string,
  chatId: string | number,
): Promise<boolean> {
  const cfg = await getAccessConfigCached(sessionId);
  const id = String(chatId);
  if (cfg.groupBlocklist.has(id)) return false;
  if (cfg.mode === 'private') return cfg.groupAllowlist.has(id);
  return true;
}

/**
 * Should the bot respond to messages from this user?
 *
 *   - In public mode, always true.
 *   - In private mode with an empty user allowlist, true (group gating only).
 *   - In private mode with a non-empty user allowlist, only listed users.
 */
export async function isUserAllowed(
  sessionId: string,
  userId: string | number,
): Promise<boolean> {
  const cfg = await getAccessConfigCached(sessionId);
  if (cfg.mode === 'public') return true;
  if (cfg.userAllowlist.size === 0) return true;
  return cfg.userAllowlist.has(String(userId));
}

/**
 * Get a snapshot of the access config for dashboard / API use.
 */
export async function getAccessConfig(sessionId: string): Promise<{
  mode: AccessMode;
  groupAllowlist: string[];
  groupBlocklist: string[];
  userAllowlist: string[];
}> {
  const cfg = await getAccessConfigCached(sessionId);
  return {
    mode: cfg.mode,
    groupAllowlist: Array.from(cfg.groupAllowlist),
    groupBlocklist: Array.from(cfg.groupBlocklist),
    userAllowlist: Array.from(cfg.userAllowlist),
  };
}

// ── Allowlist/Blocklist CRUD ──────────────────────────────────────────────

async function _accessListAdd(
  table: 'telegram_group_allowlist' | 'telegram_group_blocklist',
  sessionId: string,
  chatId: string,
  chatTitle?: string,
  addedBy?: string,
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .upsert(
      {
        session_id: sessionId,
        chat_id: String(chatId),
        chat_title: chatTitle || null,
        added_by: addedBy || null,
      },
      { onConflict: 'session_id,chat_id' },
    );
  if (error) console.error(`[TG-DB] ${table} add error:`, error.message);
  invalidateAccessConfigCache(sessionId);
}

async function _accessListRemove(
  table: 'telegram_group_allowlist' | 'telegram_group_blocklist',
  sessionId: string,
  chatId: string,
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('session_id', sessionId)
    .eq('chat_id', String(chatId));
  if (error) console.error(`[TG-DB] ${table} remove error:`, error.message);
  invalidateAccessConfigCache(sessionId);
}

export function addGroupAllowlistEntry(
  sessionId: string,
  chatId: string,
  chatTitle?: string,
  addedBy?: string,
): Promise<void> {
  return _accessListAdd('telegram_group_allowlist', sessionId, chatId, chatTitle, addedBy);
}

export function removeGroupAllowlistEntry(
  sessionId: string,
  chatId: string,
): Promise<void> {
  return _accessListRemove('telegram_group_allowlist', sessionId, chatId);
}

export function addGroupBlocklistEntry(
  sessionId: string,
  chatId: string,
  chatTitle?: string,
  addedBy?: string,
): Promise<void> {
  return _accessListAdd('telegram_group_blocklist', sessionId, chatId, chatTitle, addedBy);
}

export function removeGroupBlocklistEntry(
  sessionId: string,
  chatId: string,
): Promise<void> {
  return _accessListRemove('telegram_group_blocklist', sessionId, chatId);
}

export async function addUserAllowlistEntry(
  sessionId: string,
  userId: string,
  userLabel?: string,
  addedBy?: string,
): Promise<void> {
  const { error } = await supabase
    .from('telegram_user_allowlist')
    .upsert(
      {
        session_id: sessionId,
        user_id: String(userId),
        user_label: userLabel || null,
        added_by: addedBy || null,
      },
      { onConflict: 'session_id,user_id' },
    );
  if (error) console.error('[TG-DB] telegram_user_allowlist add error:', error.message);
  invalidateAccessConfigCache(sessionId);
}

export async function removeUserAllowlistEntry(
  sessionId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('telegram_user_allowlist')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', String(userId));
  if (error) console.error('[TG-DB] telegram_user_allowlist remove error:', error.message);
  invalidateAccessConfigCache(sessionId);
}

export async function listGroupAllowlist(
  sessionId: string,
): Promise<Array<{ chat_id: string; chat_title: string | null; added_by: string | null; created_at: string }>> {
  const { data } = await supabase
    .from('telegram_group_allowlist')
    .select('chat_id, chat_title, added_by, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });
  return (data || []) as Array<{ chat_id: string; chat_title: string | null; added_by: string | null; created_at: string }>;
}

export async function listGroupBlocklist(
  sessionId: string,
): Promise<Array<{ chat_id: string; chat_title: string | null; added_by: string | null; created_at: string }>> {
  const { data } = await supabase
    .from('telegram_group_blocklist')
    .select('chat_id, chat_title, added_by, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });
  return (data || []) as Array<{ chat_id: string; chat_title: string | null; added_by: string | null; created_at: string }>;
}

export async function listUserAllowlist(
  sessionId: string,
): Promise<Array<{ user_id: string; user_label: string | null; added_by: string | null; created_at: string }>> {
  const { data } = await supabase
    .from('telegram_user_allowlist')
    .select('user_id, user_label, added_by, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });
  return (data || []) as Array<{ user_id: string; user_label: string | null; added_by: string | null; created_at: string }>;
}
