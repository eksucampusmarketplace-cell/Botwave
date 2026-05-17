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
  start_text: string | null;
  help_text: string | null;
  owner_user_id: string | null;
  miniapp_base_url: string | null;
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
  start_text: null,
  help_text: null,
  owner_user_id: null,
  miniapp_base_url: null,
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
    const fallback: TelegramConfig = { ...DEFAULT_CONFIG, session_id: sessionId };
    return fallback;
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

// ─── XP ────────────────────────────────────────────────────────────────────

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
}

export async function createScheduledMessage(
  sessionId: string,
  chatId: string,
  content: string,
  scheduleType: string,
  nextSendAt: Date,
  createdBy: string,
  timeOfDay?: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('telegram_scheduled_messages')
    .insert({
      session_id: sessionId,
      chat_id: chatId,
      content,
      schedule_type: scheduleType,
      next_send_at: nextSendAt.toISOString(),
      time_of_day: timeOfDay || null,
      is_active: true,
      created_by: createdBy,
    })
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
