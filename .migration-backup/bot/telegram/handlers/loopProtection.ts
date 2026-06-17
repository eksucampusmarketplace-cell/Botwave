/**
 * Bot-to-bot communication loop protection.
 * Prevents infinite message loops when bots communicate with each other.
 *
 * Three layers of protection:
 * 1. Self-loop: ignore messages from our own bot
 * 2. Dedup: ignore identical bot messages in the same chat within 5 seconds
 * 3. Rate limit: max 1 reply to bot messages per chat per minute
 */

import { Bot, Context } from 'grammy';
import { createHash } from 'crypto';

interface DedupEntry {
  hash: string;
  expiresAt: number;
}

interface RateLimitEntry {
  lastReply: number;
}

const dedupStore = new Map<string, DedupEntry[]>();
const rateLimitStore = new Map<string, RateLimitEntry>();

const DEDUP_WINDOW_MS = 3_000;
const RATE_LIMIT_MS = 10_000;
const CLEANUP_INTERVAL_MS = 30_000;

function hashMessage(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entries] of dedupStore) {
    const valid = entries.filter(e => e.expiresAt > now);
    if (valid.length === 0) {
      dedupStore.delete(key);
    } else {
      dedupStore.set(key, valid);
    }
  }
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.lastReply > RATE_LIMIT_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);

export function isSelfMessage(ctx: Context, botId: number): boolean {
  const fromId = ctx.from?.id;
  return fromId === botId;
}

export function isDuplicateBotMessage(chatId: string, text: string): boolean {
  if (!text) return false;
  const hash = hashMessage(text);
  const now = Date.now();

  const entries = dedupStore.get(chatId) || [];
  const validEntries = entries.filter(e => e.expiresAt > now);

  if (validEntries.some(e => e.hash === hash)) {
    return true;
  }

  validEntries.push({ hash, expiresAt: now + DEDUP_WINDOW_MS });
  dedupStore.set(chatId, validEntries);
  return false;
}

export function isBotRateLimited(chatId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(chatId);

  if (entry && now - entry.lastReply < RATE_LIMIT_MS) {
    return true;
  }

  rateLimitStore.set(chatId, { lastReply: now });
  return false;
}

export function shouldIgnoreBotMessage(ctx: Context, botId: number): boolean {
  if (!ctx.from?.is_bot) return false;

  if (isSelfMessage(ctx, botId)) return true;

  const chatId = ctx.chat?.id?.toString();
  const text = ctx.message?.text || '';
  if (!chatId) return true;

  if (isDuplicateBotMessage(chatId, text)) return true;

  if (isBotRateLimited(chatId)) return true;

  return false;
}

export function registerLoopProtection(bot: Bot, sessionId: string): void {
  bot.on('message', async (ctx, next) => {
    const botInfo = await bot.api.getMe();
    if (shouldIgnoreBotMessage(ctx, botInfo.id)) {
      return;
    }
    await next();
  });
}
