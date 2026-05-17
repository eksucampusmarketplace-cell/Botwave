/**
 * Auto-Delete Messages — /autodelete command with duration parsing.
 * Uses Telegram's native message auto-delete timer.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { parseDuration } from '../utils/resolve';
import { formatDurationLong } from '../utils/format';

export function registerAutoDeleteHandlers(bot: Bot, sessionId: string): void {
  bot.command('autodelete', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const args = (ctx.message?.text || '').split(/\s+/).slice(1);
    const arg = args[0]?.toLowerCase();

    if (!arg || arg === 'off') {
      try {
        await ctx.api.setMessageAutoDeleteTime(ctx.chat!.id, 0);
        await ctx.reply('✅ Auto-delete disabled.');
      } catch {
        await ctx.reply('❌ Failed to disable auto-delete. Make sure I have admin permissions.');
      }
      return;
    }

    const seconds = parseDuration(arg);
    if (!seconds || seconds < 60) {
      await ctx.reply('Usage: /autodelete <duration|off>\nExamples: /autodelete 1h, /autodelete 1d, /autodelete off\nMinimum: 1m');
      return;
    }

    try {
      await ctx.api.setMessageAutoDeleteTime(ctx.chat!.id, seconds);
      await ctx.reply(`✅ Messages will auto-delete after ${formatDurationLong(seconds)}.`);
    } catch {
      await ctx.reply('❌ Failed to set auto-delete. Make sure I have admin permissions.');
    }
  });
}
