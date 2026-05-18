/**
 * Database utilities for Telegram userbot sessions.
 * Uses the same Supabase instance as the rest of BotWave.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface UserbotConfig {
  session_id: string;
  prefix: string;
  anti_pm: boolean;
  anti_pm_block: boolean;
  anti_pm_report: boolean;
  pm_permit_enabled: boolean;
  pm_permit_limit: number;
  pm_permit_message: string;
  afk_enabled: boolean;
  afk_reason: string;
  afk_since: string | null;
  alive_message: string;
  log_chat_id: string | null;
  sudo_users: string[];
  disabled_modules: string[];
  auto_read_enabled: boolean;
  presence_simulation: boolean;
  timezone_offset: number;
}

const DEFAULT_CONFIG: Omit<UserbotConfig, 'session_id'> = {
  prefix: '.',
  anti_pm: false,
  anti_pm_block: false,
  anti_pm_report: false,
  pm_permit_enabled: false,
  pm_permit_limit: 3,
  pm_permit_message: 'This is an automated message. My owner will get back to you soon. Please wait.',
  afk_enabled: false,
  afk_reason: '',
  afk_since: null,
  alive_message: '🤖 BotWave Userbot is alive!',
  log_chat_id: null,
  sudo_users: [],
  disabled_modules: [],
  auto_read_enabled: true,
  presence_simulation: true,
  timezone_offset: 1,
};

export async function ensureUserbotConfig(sessionId: string): Promise<UserbotConfig> {
  const { data } = await supabase
    .from('userbot_config')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (data) return data as UserbotConfig;

  const config = { session_id: sessionId, ...DEFAULT_CONFIG };
  const { error } = await supabase
    .from('userbot_config')
    .upsert(config, { onConflict: 'session_id' });

  if (error) {
    console.warn(`[USERBOT-DB] Failed to create config for ${sessionId}:`, error.message);
  }

  return config;
}

export async function getUserbotConfig(sessionId: string): Promise<UserbotConfig> {
  const { data } = await supabase
    .from('userbot_config')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  return (data as UserbotConfig) || { session_id: sessionId, ...DEFAULT_CONFIG };
}

export async function updateUserbotConfig(
  sessionId: string,
  updates: Partial<UserbotConfig>,
): Promise<void> {
  const { error } = await supabase
    .from('userbot_config')
    .update(updates)
    .eq('session_id', sessionId);

  if (error) {
    console.error(`[USERBOT-DB] Failed to update config for ${sessionId}:`, error.message);
  }
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export interface UserbotNote {
  id: string;
  session_id: string;
  name: string;
  content: string;
  media_type: string | null;
  media_file_id: string | null;
  created_at: string;
}

export async function saveNote(sessionId: string, name: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('userbot_notes')
    .upsert(
      { session_id: sessionId, name: name.toLowerCase(), content },
      { onConflict: 'session_id,name' },
    );
  if (error) console.error(`[USERBOT-DB] saveNote error:`, error.message);
}

export async function getNote(sessionId: string, name: string): Promise<UserbotNote | null> {
  const { data } = await supabase
    .from('userbot_notes')
    .select('*')
    .eq('session_id', sessionId)
    .eq('name', name.toLowerCase())
    .single();
  return data as UserbotNote | null;
}

export async function deleteNote(sessionId: string, name: string): Promise<boolean> {
  const { error } = await supabase
    .from('userbot_notes')
    .delete()
    .eq('session_id', sessionId)
    .eq('name', name.toLowerCase());
  return !error;
}

export async function listNotes(sessionId: string): Promise<UserbotNote[]> {
  const { data } = await supabase
    .from('userbot_notes')
    .select('*')
    .eq('session_id', sessionId)
    .order('name');
  return (data as UserbotNote[]) || [];
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface UserbotFilter {
  id: string;
  session_id: string;
  chat_id: string;
  keyword: string;
  response: string;
  created_at: string;
}

export async function addFilter(
  sessionId: string,
  chatId: string,
  keyword: string,
  response: string,
): Promise<void> {
  const { error } = await supabase
    .from('userbot_filters')
    .upsert(
      { session_id: sessionId, chat_id: chatId, keyword: keyword.toLowerCase(), response },
      { onConflict: 'session_id,chat_id,keyword' },
    );
  if (error) console.error(`[USERBOT-DB] addFilter error:`, error.message);
}

export async function getFilters(sessionId: string, chatId: string): Promise<UserbotFilter[]> {
  const { data } = await supabase
    .from('userbot_filters')
    .select('*')
    .eq('session_id', sessionId)
    .eq('chat_id', chatId);
  return (data as UserbotFilter[]) || [];
}

export async function deleteFilter(
  sessionId: string,
  chatId: string,
  keyword: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('userbot_filters')
    .delete()
    .eq('session_id', sessionId)
    .eq('chat_id', chatId)
    .eq('keyword', keyword.toLowerCase());
  return !error;
}

// ─── PM Permit ────────────────────────────────────────────────────────────────

export async function getPmPermitApproved(sessionId: string): Promise<string[]> {
  const { data } = await supabase
    .from('userbot_pm_permit')
    .select('user_id')
    .eq('session_id', sessionId)
    .eq('approved', true);
  return (data || []).map((r: { user_id: string }) => r.user_id);
}

export async function approvePmUser(sessionId: string, userId: string): Promise<void> {
  await supabase
    .from('userbot_pm_permit')
    .upsert(
      { session_id: sessionId, user_id: userId, approved: true, warn_count: 0 },
      { onConflict: 'session_id,user_id' },
    );
}

export async function disapprovePmUser(sessionId: string, userId: string): Promise<void> {
  await supabase
    .from('userbot_pm_permit')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId);
}

export async function incrementPmWarn(
  sessionId: string,
  userId: string,
): Promise<number> {
  // Get current count
  const { data } = await supabase
    .from('userbot_pm_permit')
    .select('warn_count')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single();

  const newCount = ((data as { warn_count: number } | null)?.warn_count || 0) + 1;

  await supabase
    .from('userbot_pm_permit')
    .upsert(
      { session_id: sessionId, user_id: userId, approved: false, warn_count: newCount },
      { onConflict: 'session_id,user_id' },
    );

  return newCount;
}

// ─── GBan (Global Ban) ───────────────────────────────────────────────────────

export async function addGban(sessionId: string, userId: string, reason: string): Promise<void> {
  await supabase
    .from('userbot_gbans')
    .upsert(
      { session_id: sessionId, user_id: userId, reason },
      { onConflict: 'session_id,user_id' },
    );
}

export async function removeGban(sessionId: string, userId: string): Promise<void> {
  await supabase
    .from('userbot_gbans')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId);
}

export async function isGbanned(sessionId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('userbot_gbans')
    .select('user_id')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single();
  return !!data;
}

export async function getGbanList(sessionId: string): Promise<{ user_id: string; reason: string }[]> {
  const { data } = await supabase
    .from('userbot_gbans')
    .select('user_id, reason')
    .eq('session_id', sessionId);
  return (data || []) as { user_id: string; reason: string }[];
}

// ─── Session state ────────────────────────────────────────────────────────────

export async function updateSessionState(
  sessionId: string,
  state: string,
): Promise<void> {
  await supabase
    .from('bot_sessions')
    .update({ state, last_active: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}

export async function updateSessionLastActive(sessionId: string): Promise<void> {
  await supabase
    .from('bot_sessions')
    .update({ last_active: new Date().toISOString() })
    .eq('id', sessionId);
}

export { supabase };
