/**
 * Pin/unpin message handlers.
 */

import { Bot } from 'grammy';
import { requireAdmin, requireBotAdmin } from '../utils/permissions';

export function registerPinsHandlers(bot: Bot, sessionId: string): void {
  bot.command('pin', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;

    if (!ctx.message?.reply_to_message) {
      await ctx.reply('Reply to a message to pin it.');
      return;
    }

    const silent = (ctx.match?.toString() || '').trim().toLowerCase() === 'silent';

    try {
      await ctx.pinChatMessage(ctx.message.reply_to_message.message_id, {
        disable_notification: silent,
      });
      await ctx.reply('📌 Message pinned.');
    } catch {
      await ctx.reply('❌ Could not pin message.');
    }
  });

  bot.command('unpin', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;

    const arg = (ctx.match?.toString() || '').trim().toLowerCase();

    if (arg === 'all') {
      try {
        await ctx.unpinAllChatMessages();
        await ctx.reply('📌 All messages unpinned.');
      } catch {
        await ctx.reply('❌ Could not unpin messages.');
      }
      return;
    }

    if (ctx.message?.reply_to_message) {
      try {
        await ctx.unpinChatMessage(ctx.message.reply_to_message.message_id);
        await ctx.reply('📌 Message unpinned.');
      } catch {
        await ctx.reply('❌ Could not unpin message.');
      }
    } else {
      try {
        await ctx.unpinChatMessage();
        await ctx.reply('📌 Latest pinned message unpinned.');
      } catch {
        await ctx.reply('❌ Could not unpin message.');
      }
    }
  });
}
