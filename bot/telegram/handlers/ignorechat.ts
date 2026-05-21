/**
 * Ignored chats handler for Telegram bot.
 * /ignorechat — bot stops responding in the current group.
 * /unignorechat — bot resumes responding.
 * /ignoredchats — list all ignored chats.
 * Only the bot owner (session owner) can use these commands.
 */

import { Bot, Context } from 'grammy';
import { isOwner } from '../utils/permissions';
import {
  getIgnoredChats,
  addIgnoredChat,
  removeIgnoredChat,
} from '../utils/db';

export function registerIgnoreChatHandlers(bot: Bot, sessionId: string): void {
  bot.command('ignorechat', async (ctx: Context) => {
    if (!ctx.from || !ctx.chat) return;
    const owner = await isOwner(sessionId, ctx.from.id);
    if (!owner) {
      await ctx.reply('Only the bot owner can use this command.');
      return;
    }

    const chatId = ctx.chat.id.toString();
    if (ctx.chat.type === 'private') {
      await ctx.reply('This command can only be used in groups.');
      return;
    }

    await addIgnoredChat(sessionId, chatId);
    await ctx.reply(
      '✅ This chat is now ignored. The bot will not respond to commands here.\n' +
      'Use /unignorechat to reverse.',
    );
  });

  bot.command('unignorechat', async (ctx: Context) => {
    if (!ctx.from || !ctx.chat) return;
    const owner = await isOwner(sessionId, ctx.from.id);
    if (!owner) {
      await ctx.reply('Only the bot owner can use this command.');
      return;
    }

    const chatId = ctx.chat.id.toString();
    await removeIgnoredChat(sessionId, chatId);
    await ctx.reply('✅ This chat is no longer ignored.');
  });

  bot.command(['ignoredchats', 'ignorelist'], async (ctx: Context) => {
    if (!ctx.from) return;
    const owner = await isOwner(sessionId, ctx.from.id);
    if (!owner) {
      await ctx.reply('Only the bot owner can use this command.');
      return;
    }

    const ignored = await getIgnoredChats(sessionId);
    if (ignored.length === 0) {
      await ctx.reply('📋 No chats are being ignored.');
      return;
    }

    const list = ignored.map((entry, i) => `${i + 1}. <code>${entry.chat_id}</code>${entry.chat_title ? ` — ${entry.chat_title}` : ''}`).join('\n');
    await ctx.reply(
      `📋 <b>Ignored Chats</b> (${ignored.length}):\n\n${list}`,
      { parse_mode: 'HTML' },
    );
  });
}
