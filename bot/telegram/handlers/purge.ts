/**
 * Purge handler: bulk-delete messages in a group.
 */

import { Bot } from 'grammy';
import { requireAdmin, requireBotAdmin } from '../utils/permissions';
import { logModAction } from '../utils/db';

const purgeFromCache = new Map<string, number>();

export function registerPurgeHandlers(bot: Bot, sessionId: string): void {
  bot.command(['purge', 'del'], async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;

    const countArg = parseInt(ctx.match?.toString() || '', 10);
    if (!countArg || countArg < 1 || countArg > 200) {
      await ctx.reply('Usage: /purge <1-200>');
      return;
    }

    if (!ctx.message?.reply_to_message) {
      try {
        const chatId = ctx.chat!.id;
        const msgId = ctx.message!.message_id;
        let deleted = 0;

        for (let i = 0; i < countArg; i++) {
          try {
            await ctx.api.deleteMessage(chatId, msgId - i);
            deleted++;
          } catch { /* message may already be deleted */ }
        }

        const notice = await ctx.reply(`🗑️ Purged ${deleted} messages.`);
        setTimeout(async () => {
          try { await ctx.api.deleteMessage(chatId, notice.message_id); } catch {}
        }, 3000);

        await logModAction(
          sessionId,
          chatId.toString(),
          'purge',
          '',
          ctx.from!.id.toString(),
          `Purged ${deleted} messages`,
        );
      } catch {
        await ctx.reply('❌ Failed to purge messages.');
      }
      return;
    }

    // Purge from reply to current message
    const startId = ctx.message.reply_to_message.message_id;
    const endId = ctx.message.message_id;
    const chatId = ctx.chat!.id;
    let deleted = 0;

    for (let id = startId; id <= endId; id++) {
      try {
        await ctx.api.deleteMessage(chatId, id);
        deleted++;
      } catch { /* message may already be deleted */ }
    }

    const notice = await ctx.reply(`🗑️ Purged ${deleted} messages.`);
    setTimeout(async () => {
      try { await ctx.api.deleteMessage(chatId, notice.message_id); } catch {}
    }, 3000);

    await logModAction(
      sessionId,
      chatId.toString(),
      'purge',
      '',
      ctx.from!.id.toString(),
      `Purged ${deleted} messages from reply`,
    );
  });

  // /spurge — Silent purge (delete command message too)
  bot.command('spurge', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;

    if (!ctx.message?.reply_to_message) {
      await ctx.reply('Reply to a message to purge from that point.');
      return;
    }

    const startId = ctx.message.reply_to_message.message_id;
    const endId = ctx.message.message_id;
    const chatId = ctx.chat!.id;
    let deleted = 0;

    for (let id = startId; id <= endId; id++) {
      try {
        await ctx.api.deleteMessage(chatId, id);
        deleted++;
      } catch {}
    }

    await logModAction(sessionId, chatId.toString(), 'spurge', '', ctx.from!.id.toString(), `Silent purged ${deleted} messages`);
  });

  // /purgefrom — Mark start of purge range
  bot.command('purgefrom', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!ctx.message?.reply_to_message) {
      await ctx.reply('Reply to a message to mark the start of the purge range.');
      return;
    }
    const chatId = ctx.chat!.id.toString();
    purgeFromCache.set(chatId, ctx.message.reply_to_message.message_id);
    await ctx.reply(`Purge start marked at message ${ctx.message.reply_to_message.message_id}. Now reply to the end message with /purgeto.`);
  });

  // /purgeto — Mark end of purge range and delete
  bot.command('purgeto', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;

    const chatId = ctx.chat!.id;
    const startId = purgeFromCache.get(chatId.toString());
    if (!startId) {
      await ctx.reply('Use /purgefrom first to mark the start of the range.');
      return;
    }

    const endId = ctx.message?.reply_to_message?.message_id || ctx.message!.message_id;
    let deleted = 0;
    const lo = Math.min(startId, endId);
    const hi = Math.max(startId, endId);

    for (let id = lo; id <= hi; id++) {
      try {
        await ctx.api.deleteMessage(chatId, id);
        deleted++;
      } catch {}
    }

    purgeFromCache.delete(chatId.toString());
    try { await ctx.deleteMessage(); } catch {}

    const notice = await ctx.reply(`\uD83D\uDDD1\uFE0F Purged ${deleted} messages.`);
    setTimeout(async () => {
      try { await ctx.api.deleteMessage(chatId, notice.message_id); } catch {}
    }, 3000);

    await logModAction(sessionId, chatId.toString(), 'purgeto', '', ctx.from!.id.toString(), `Range-purged ${deleted} messages`);
  });
}
