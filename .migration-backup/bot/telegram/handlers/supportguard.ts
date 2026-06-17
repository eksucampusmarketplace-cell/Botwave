/**
 * Support Group Guard — detects and deletes userbot-style commands from
 * non-admin users in the BotWave support group.
 *
 * The Telegram bot (with admin powers) monitors messages for patterns
 * like .ban, !kick, ~purge etc. from non-admins, deletes them, and warns.
 */

import { Bot, Context } from 'grammy';
import { isAdmin } from '../utils/permissions';

const SUPPORT_GROUP_ID = -1003986594255;

// Common userbot command prefixes
const USERBOT_PREFIXES = ['.', '!', '~', '>', '-', ';', '#', '$'];

// Known userbot command names (lowercase, without prefix)
const USERBOT_COMMANDS = new Set([
  // Admin
  'ban', 'unban', 'kick', 'mute', 'unmute', 'promote', 'demote',
  'pin', 'unpin', 'purge', 'purgeme', 'del',
  // Moderation
  'gban', 'ungban', 'gbanlist', 'warn', 'unwarn',
  'antiflood', 'setflood',
  // Settings
  'setprefix', 'setalive', 'alive', 'ping', 'help',
  'setlog', 'addsudo', 'rmsudo', 'sudolist',
  // PM Permit
  'approve', 'disapprove', 'block', 'unblock', 'pmguard',
  // AFK
  'afk', 'unafk',
  // Notes & Filters
  'save', 'get', 'clear', 'notes', 'filter', 'stop', 'filters',
  // Text tools
  'upper', 'lower', 'reverse', 'mock', 'vapor', 'tiny', 'flip',
  'b64encode', 'b64decode', 'clap', 'spoiler', 'mono', 'strike',
  // Chat tools
  'chatinfo', 'admins', 'invite', 'leave', 'setname', 'setbio',
  'zombies', 'groupname', 'groupbio',
  // Search
  'google', 'wiki', 'calc', 'currency', 'time',
  // Translate
  'tr', 'translate', 'langs', 'tts',
  // Fun
  'dice', 'dart', 'slot', 'basketball', 'football', 'bowling',
  'coinflip', 'rng', '8ball', 'rate', 'decide', 'roll',
  // Stickers
  'kang', 'stickerid', 'getsticker', 'stickers',
  // Media
  'download', 'forward', 'copy', 'mediainfo',
  // Reminders
  'remind', 'reminders', 'cancelremind',
  // Misc
  'info', 'id', 'stats', 'support',
  // Welcome/Goodbye
  'setwelcome', 'setgoodbye', 'welcome', 'goodbye',
  // Ignore
  'ignorechat', 'unignorechat', 'ignoredchats', 'ignorelist',
]);

// Recent warnings — avoid spamming the same user within 60s
const recentWarnings = new Map<number, number>();

function isUserbotCommand(text: string): boolean {
  if (text.length < 2 || text.length > 80) return false;
  const firstChar = text[0];
  if (!USERBOT_PREFIXES.includes(firstChar)) return false;

  // Extract the "command" part (first word without prefix)
  const firstWord = text.slice(1).split(/\s+/)[0]?.toLowerCase();
  if (!firstWord) return false;

  // Check known commands
  if (USERBOT_COMMANDS.has(firstWord)) return true;

  // Heuristic: short single-word prefixed messages (e.g. ".alive", "!ping")
  // that look like commands (all alphanumeric, 2-20 chars)
  if (/^[a-z0-9]{2,20}$/.test(firstWord) && text.split(/\s+/).length <= 4) {
    return true;
  }

  return false;
}

export function registerSupportGuardHandlers(bot: Bot, _sessionId: string): void {
  bot.on('message:text', async (ctx: Context, next) => {
    const chatId = ctx.chat?.id;
    if (!chatId || chatId !== SUPPORT_GROUP_ID) {
      await next();
      return;
    }

    const text = ctx.message?.text || '';
    if (!isUserbotCommand(text)) {
      await next();
      return;
    }

    // Check if user is admin — admins can use userbot commands
    const admin = await isAdmin(ctx);
    if (admin) {
      await next();
      return;
    }

    const userId = ctx.from?.id;
    if (!userId) { await next(); return; }

    // Delete the message
    try {
      await ctx.deleteMessage();
    } catch (err) {
      console.error('[SUPPORT-GUARD] Failed to delete message:', err);
    }

    // Warn user (rate-limited: once per 60s per user)
    const now = Date.now();
    const lastWarned = recentWarnings.get(userId) || 0;
    if (now - lastWarned < 60_000) return;

    recentWarnings.set(userId, now);

    try {
      const firstName = ctx.from?.first_name || 'User';
      const warning = await ctx.reply(
        `⚠️ <b>${firstName}</b>, userbot commands are not allowed in the support group.\n` +
        `Please use <code>/help</code> for bot commands instead.\n\n` +
        `If you need admin assistance, ask in plain text.`,
        { parse_mode: 'HTML' },
      );

      // Auto-delete warning after 15 seconds
      setTimeout(async () => {
        try { await bot.api.deleteMessage(chatId, warning.message_id); } catch {}
      }, 15_000);
    } catch {}

    // Cleanup old entries from recentWarnings
    if (recentWarnings.size > 200) {
      for (const [uid, ts] of recentWarnings) {
        if (now - ts > 120_000) recentWarnings.delete(uid);
      }
    }
  });
}
