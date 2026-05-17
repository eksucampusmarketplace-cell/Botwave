/**
 * Telegram Bot Group Management Commands
 * 
 * Welcome/goodbye, anti-spam, anti-flood, CAPTCHA, night mode, locks, filters, notes.
 */

import type { PlatformMessage, PlatformAdapter, TelegramBotConfig } from '../../../../core/types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ─── Anti-Flood Tracking ────────────────────────────────────────────────────

const floodTracker = new Map<string, { count: number; firstAt: number }>();

export function checkAntiFlood(chatId: string, userId: string, maxPerMin: number): boolean {
  const key = `${chatId}:${userId}`;
  const now = Date.now();
  const entry = floodTracker.get(key);

  if (!entry || now - entry.firstAt > 60_000) {
    floodTracker.set(key, { count: 1, firstAt: now });
    return false;
  }

  entry.count++;
  if (entry.count > maxPerMin) {
    return true;
  }
  return false;
}

// ─── Anti-Spam Detection ────────────────────────────────────────────────────

const spamPatterns = [
  /earn\s+\$?\d+/i,
  /click\s+here/i,
  /free\s+(money|bitcoin|crypto)/i,
  /join\s+(my|our)\s+(channel|group)/i,
  /t\.me\/\S+/i,
  /bit\.ly\//i,
  /\b(invest|trading)\s+(opportunity|signal)/i,
];

export function isSpamMessage(text: string): boolean {
  return spamPatterns.some(pattern => pattern.test(text));
}

// ─── Anti-Link Detection ────────────────────────────────────────────────────

const urlRegex = /https?:\/\/[^\s]+|t\.me\/[^\s]+|wa\.me\/[^\s]+/gi;

export function containsLink(text: string, whitelist: string[] = []): boolean {
  const urls = text.match(urlRegex);
  if (!urls) return false;
  return urls.some(url => {
    return !whitelist.some(domain => url.includes(domain));
  });
}

// ─── Night Mode Check ───────────────────────────────────────────────────────

export function isNightModeActive(config: TelegramBotConfig): boolean {
  if (!config.nightModeEnabled || !config.nightModeStart || !config.nightModeEnd) return false;

  const now = new Date();
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const [startH, startM] = config.nightModeStart.split(':').map(Number);
  const [endH, endM] = config.nightModeEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  // Overnight range (e.g., 23:00 - 06:00)
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

// ─── Locked Media Types ─────────────────────────────────────────────────────

export function isLockedMediaType(msg: PlatformMessage, lockedTypes: string[]): boolean {
  if (lockedTypes.length === 0) return false;
  if (msg.mediaType && lockedTypes.includes(msg.mediaType)) return true;

  const raw = msg.rawMessage as any;
  if (raw?.sticker && lockedTypes.includes('sticker')) return true;
  if (raw?.forward_from || raw?.forward_from_chat) {
    if (lockedTypes.includes('forward')) return true;
  }
  return false;
}

// ─── CAPTCHA System ─────────────────────────────────────────────────────────

const pendingCaptchas = new Map<string, {
  userId: string;
  chatId: string;
  answer: string;
  expiresAt: number;
}>();

export function generateCaptcha(): { question: string; answer: string } {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let answer: number;
  switch (op) {
    case '+': answer = a + b; break;
    case '-': answer = a - b; break;
    case '*': answer = a * b; break;
    default: answer = a + b;
  }
  return {
    question: `What is ${a} ${op} ${b}?`,
    answer: String(answer),
  };
}

export function setCaptchaForUser(chatId: string, userId: string, answer: string): void {
  const key = `${chatId}:${userId}`;
  pendingCaptchas.set(key, {
    userId,
    chatId,
    answer,
    expiresAt: Date.now() + 120_000, // 2 minutes
  });
}

export function checkCaptchaAnswer(chatId: string, userId: string, answer: string): boolean {
  const key = `${chatId}:${userId}`;
  const entry = pendingCaptchas.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    pendingCaptchas.delete(key);
    return false;
  }
  if (entry.answer === answer.trim()) {
    pendingCaptchas.delete(key);
    return true;
  }
  return false;
}

export function hasPendingCaptcha(chatId: string, userId: string): boolean {
  const key = `${chatId}:${userId}`;
  const entry = pendingCaptchas.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    pendingCaptchas.delete(key);
    return false;
  }
  return true;
}

// ─── Welcome / Goodbye Handlers ─────────────────────────────────────────────

export function formatWelcomeMessage(template: string, vars: {
  name: string;
  username?: string;
  groupTitle?: string;
  memberCount?: number;
}): string {
  return template
    .replace(/\{name\}/gi, vars.name)
    .replace(/\{username\}/gi, vars.username ? `@${vars.username}` : vars.name)
    .replace(/\{group\}/gi, vars.groupTitle || 'the group')
    .replace(/\{count\}/gi, String(vars.memberCount || ''));
}

// ─── Filters (Custom Keyword Responses) ─────────────────────────────────────

export async function handleFilterCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup || !supabase) return;

  const args = msg.commandArgs || [];
  if (args.length < 2) {
    await adapter.sendText(msg.chatId, 'Usage: /filter <keyword> <response>');
    return;
  }

  const keyword = args[0].toLowerCase();
  const response = args.slice(1).join(' ');

  await supabase.from('telegram_filters').upsert({
    session_id: msg.sessionId,
    chat_id: msg.chatId,
    keyword,
    response,
  }, { onConflict: 'session_id,chat_id,keyword' });

  await adapter.sendText(msg.chatId, `Filter set: "${keyword}" will reply with the configured response.`);
}

export async function handleFiltersCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup || !supabase) return;

  const { data: filters } = await supabase
    .from('telegram_filters')
    .select('keyword')
    .eq('session_id', msg.sessionId)
    .eq('chat_id', msg.chatId);

  if (!filters || filters.length === 0) {
    await adapter.sendText(msg.chatId, 'No filters set in this group.');
    return;
  }

  const list = filters.map(f => `• ${f.keyword}`).join('\n');
  await adapter.sendText(msg.chatId, `Active filters:\n\n${list}`);
}

export async function checkFilters(msg: PlatformMessage, adapter: PlatformAdapter): Promise<boolean> {
  if (!msg.text || !supabase) return false;

  const { data: filters } = await supabase
    .from('telegram_filters')
    .select('keyword, response, is_regex')
    .eq('session_id', msg.sessionId)
    .eq('chat_id', msg.chatId);

  if (!filters || filters.length === 0) return false;

  const text = msg.text.toLowerCase();
  for (const filter of filters) {
    const matches = filter.is_regex
      ? new RegExp(filter.keyword, 'i').test(text)
      : text.includes(filter.keyword.toLowerCase());

    if (matches) {
      await adapter.sendText(msg.chatId, filter.response, { replyToMessageId: msg.id });
      return true;
    }
  }
  return false;
}

// ─── Notes System ───────────────────────────────────────────────────────────

export async function handleSaveNoteCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!msg.isGroup || !supabase) return;

  const args = msg.commandArgs || [];
  if (args.length < 2) {
    await adapter.sendText(msg.chatId, 'Usage: /savenote <name> <content>');
    return;
  }

  const noteName = args[0].toLowerCase();
  const content = args.slice(1).join(' ');

  await supabase.from('telegram_notes').upsert({
    session_id: msg.sessionId,
    chat_id: msg.chatId,
    note_name: noteName,
    content,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'session_id,chat_id,note_name' });

  await adapter.sendText(msg.chatId, `Note "${noteName}" saved. Use /note ${noteName} to recall it.`);
}

export async function handleNoteCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!supabase) return;

  const noteName = msg.commandArgs?.[0]?.toLowerCase();
  if (!noteName) {
    await adapter.sendText(msg.chatId, 'Usage: /note <name>');
    return;
  }

  const { data: note } = await supabase
    .from('telegram_notes')
    .select('content')
    .eq('session_id', msg.sessionId)
    .eq('chat_id', msg.chatId)
    .eq('note_name', noteName)
    .single();

  if (note) {
    await adapter.sendText(msg.chatId, note.content);
  } else {
    await adapter.sendText(msg.chatId, `Note "${noteName}" not found.`);
  }
}

export async function handleNotesCommand(msg: PlatformMessage, adapter: PlatformAdapter): Promise<void> {
  if (!supabase) return;

  const { data: notes } = await supabase
    .from('telegram_notes')
    .select('note_name')
    .eq('session_id', msg.sessionId)
    .eq('chat_id', msg.chatId);

  if (!notes || notes.length === 0) {
    await adapter.sendText(msg.chatId, 'No notes saved in this chat.');
    return;
  }

  const list = notes.map(n => `• ${n.note_name}`).join('\n');
  await adapter.sendText(msg.chatId, `Saved notes:\n\n${list}`);
}

// ─── Periodic Cleanup ───────────────────────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of pendingCaptchas) {
    if (now > entry.expiresAt) pendingCaptchas.delete(key);
  }
  for (const [key, entry] of floodTracker) {
    if (now - entry.firstAt > 120_000) floodTracker.delete(key);
  }
}, 60_000);
