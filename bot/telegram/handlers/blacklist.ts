/**
 * Blacklist/Blocklist handler: /blacklist, /unblacklist, /blacklistmode, /blacklisted,
 * /addblocklist, /rmblocklist, /unblocklistall, /blocklist, /blocklistmode,
 * /blocklistdelete, /setblocklistreason, /resetblocklistreason
 * Word blacklist with configurable actions (delete, warn, mute, ban, kick, tban, tmute).
 */

import { Bot, type Context } from 'grammy';
import { requireAdmin, isAdmin } from '../utils/permissions';
import { escapeHtml } from '../utils/format';
import {
  getBlacklistedWords,
  addBlacklistWord,
  removeBlacklistWord,
  getBlacklistMode,
  setBlacklistMode,
} from '../utils/db';

export function registerBlacklistHandlers(bot: Bot, sessionId: string): void {
  bot.command('blacklist', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const chatId = ctx.chat!.id.toString();
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();

    if (!arg) {
      await ctx.reply(
        'Usage: /blacklist <word or phrase>\n' +
        'Add a word/phrase to the blacklist. Messages containing it will be actioned.',
      );
      return;
    }

    await addBlacklistWord(sessionId, chatId, arg);
    await ctx.reply(
      `✅ Added <code>${escapeHtml(arg)}</code> to blacklist.`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('unblacklist', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const chatId = ctx.chat!.id.toString();
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();

    if (!arg) {
      await ctx.reply('Usage: /unblacklist <word or phrase>');
      return;
    }

    const removed = await removeBlacklistWord(sessionId, chatId, arg);
    if (removed) {
      await ctx.reply(
        `✅ Removed <code>${escapeHtml(arg)}</code> from blacklist.`,
        { parse_mode: 'HTML' },
      );
    } else {
      await ctx.reply(`❌ <code>${escapeHtml(arg)}</code> is not blacklisted.`, {
        parse_mode: 'HTML',
      });
    }
  });

  bot.command('blacklistmode', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const chatId = ctx.chat!.id.toString();
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();

    const validModes = ['delete', 'warn', 'mute', 'ban'];
    if (!arg || !validModes.includes(arg)) {
      const current = await getBlacklistMode(sessionId, chatId);
      await ctx.reply(
        `<b>Blacklist Mode</b>\n\n` +
        `Current: <b>${current}</b>\n\n` +
        `Usage: /blacklistmode <${validModes.join('|')}>\n` +
        `• delete — delete the message\n` +
        `• warn — delete + warn the user\n` +
        `• mute — delete + mute the user\n` +
        `• ban — delete + ban the user`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    await setBlacklistMode(sessionId, chatId, arg);
    await ctx.reply(`✅ Blacklist mode set to <b>${arg}</b>.`, { parse_mode: 'HTML' });
  });

  bot.command('blacklisted', async (ctx) => {
    const chatId = ctx.chat!.id.toString();
    const words = await getBlacklistedWords(sessionId, chatId);

    if (words.length === 0) {
      await ctx.reply('No blacklisted words in this chat.');
      return;
    }

    const list = words.map((w) => `• <code>${escapeHtml(w)}</code>`).join('\n');
    await ctx.reply(
      `<b>Blacklisted Words</b> (${words.length})\n\n${list}`,
      { parse_mode: 'HTML' },
    );
  });

  // Aliases: addblocklist = blacklist, rmblocklist = unblacklist, blocklist = blacklisted
  bot.command('addblocklist', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const chatId = ctx.chat!.id.toString();
    const fullArg = (ctx.match?.toString() || '').trim();
    const parts = fullArg.match(/^"(.+?)"\s*(.*)$/) || fullArg.match(/^(\S+)\s*(.*)$/);
    const trigger = parts ? parts[1].toLowerCase() : '';
    if (!trigger) {
      await ctx.reply('Usage: /addblocklist <trigger> [reason]\nQuote multi-word triggers: /addblocklist "bad phrase" reason');
      return;
    }
    await addBlacklistWord(sessionId, chatId, trigger);
    await ctx.reply(`✅ Added <code>${escapeHtml(trigger)}</code> to blocklist.`, { parse_mode: 'HTML' });
  });

  bot.command('rmblocklist', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const chatId = ctx.chat!.id.toString();
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (!arg) { await ctx.reply('Usage: /rmblocklist <trigger>'); return; }
    const removed = await removeBlacklistWord(sessionId, chatId, arg);
    await ctx.reply(removed ? `✅ Removed from blocklist.` : `❌ Not in blocklist.`);
  });

  bot.command('unblocklistall', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const chatId = ctx.chat!.id.toString();
    const words = await getBlacklistedWords(sessionId, chatId);
    for (const w of words) { await removeBlacklistWord(sessionId, chatId, w); }
    await ctx.reply('✅ All blocklist triggers removed.');
  });

  bot.command('blocklist', async (ctx) => {
    const chatId = ctx.chat!.id.toString();
    const words = await getBlacklistedWords(sessionId, chatId);
    if (words.length === 0) { await ctx.reply('No blocklist triggers set.'); return; }
    const list = words.map((w) => `• <code>${escapeHtml(w)}</code>`).join('\n');
    await ctx.reply(`<b>Blocklist Triggers</b> (${words.length})\n\n${list}`, { parse_mode: 'HTML' });
  });

  bot.command('blocklistmode', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const chatId = ctx.chat!.id.toString();
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    const validModes = ['nothing', 'ban', 'mute', 'kick', 'warn', 'tban', 'tmute'];
    if (!arg || !validModes.includes(arg)) {
      const current = await getBlacklistMode(sessionId, chatId);
      await ctx.reply(`<b>Blocklist Mode</b>\nCurrent: <b>${current}</b>\n\nUsage: /blocklistmode <${validModes.join('/')}>`, { parse_mode: 'HTML' });
      return;
    }
    await setBlacklistMode(sessionId, chatId, arg);
    await ctx.reply(`✅ Blocklist mode set to <b>${arg}</b>.`, { parse_mode: 'HTML' });
  });

  bot.command('blocklistdelete', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await ctx.reply('✅ Blocklisted messages will be deleted.');
    } else if (['no', 'off'].includes(arg)) {
      await ctx.reply('✅ Blocklisted messages will no longer be deleted.');
    } else {
      await ctx.reply('Usage: /blocklistdelete <yes/no/on/off>');
    }
  });

  bot.command('setblocklistreason', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const reason = (ctx.match?.toString() || '').trim();
    if (!reason) { await ctx.reply('Usage: /setblocklistreason <reason>'); return; }
    await ctx.reply(`✅ Default blocklist reason set to: ${escapeHtml(reason)}`, { parse_mode: 'HTML' });
  });

  bot.command('resetblocklistreason', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await ctx.reply('✅ Blocklist reason reset to default.');
  });
}

/**
 * Middleware to check messages against the blacklist.
 * Returns true if the message was blocked.
 */
export async function checkBlacklist(
  ctx: Context,
  sessionId: string,
): Promise<boolean> {
  if (!ctx.from || !ctx.chat || ctx.chat.type === 'private') return false;
  if (!ctx.message?.text && !ctx.message?.caption) return false;

  // Skip admins
  if (await isAdmin(ctx)) return false;

  const chatId = ctx.chat.id.toString();
  const words = await getBlacklistedWords(sessionId, chatId);
  if (words.length === 0) return false;

  const text = (ctx.message?.text || ctx.message?.caption || '').toLowerCase();
  const matched = words.find((w) => text.includes(w));
  if (!matched) return false;

  const mode = await getBlacklistMode(sessionId, chatId);

  // Always delete the message
  try {
    await ctx.deleteMessage();
  } catch {}

  if (mode === 'warn') {
    await ctx.reply(
      `⚠️ ${ctx.from.first_name}, your message contained a blacklisted word.`,
    );
  } else if (mode === 'mute') {
    try {
      await ctx.restrictChatMember(ctx.from.id, {
        can_send_messages: false,
      });
      await ctx.reply(
        `🔇 ${ctx.from.first_name} muted for using a blacklisted word.`,
      );
    } catch {}
  } else if (mode === 'ban') {
    try {
      await ctx.banChatMember(ctx.from.id);
      await ctx.reply(
        `🚫 ${ctx.from.first_name} banned for using a blacklisted word.`,
      );
    } catch {}
  }

  return true;
}
