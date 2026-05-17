/**
 * Purge handler: bulk-delete messages in a group.
 */

import { Bot } from 'grammy';
import { requireAdmin, requireBotAdmin } from '../utils/permissions';
import { logModAction } from '../utils/db';

export function registerPurgeHandlers(bot: Bot, sessionId: string): void {
  bot.command('purge', async (ctx) => {
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
}
