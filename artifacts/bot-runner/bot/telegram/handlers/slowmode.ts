/**
 * Slow mode control: /slowmode <seconds>, /slowoff
 * Admins can set Telegram's native slow mode from bot commands.
 */

import { Bot } from 'grammy';
import { requireAdmin, requireBotAdmin } from '../utils/permissions';

export function registerSlowModeHandlers(bot: Bot, sessionId: string): void {
  bot.command('slowmode', async (ctx) => {
    if (!ctx.chat || ctx.chat.type === 'private') {
      await ctx.reply('Use this command in a group chat.');
      return;
    }
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;

    const arg = (ctx.match?.toString() || '').trim();
    const seconds = parseInt(arg, 10);

    if (!arg || isNaN(seconds) || seconds < 0 || seconds > 86400) {
      await ctx.reply(
        '⏱️ <b>Slow Mode</b>\n\n' +
        'Usage: /slowmode &lt;seconds&gt;\n\n' +
        'Valid values: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60 (up to 86400)\n\n' +
        'Use /slowoff to disable.',
        { parse_mode: 'HTML' },
      );
      return;
    }

    try {
      await (ctx.api as any).setChatSlowModeDelay(ctx.chat.id, seconds);
      if (seconds === 0) {
        await ctx.reply('⏱️ Slow mode <b>disabled</b>.', { parse_mode: 'HTML' });
      } else {
        const display = seconds >= 3600
          ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
          : seconds >= 60
            ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
            : `${seconds}s`;
        await ctx.reply(`⏱️ Slow mode set to <b>${display}</b>.`, { parse_mode: 'HTML' });
      }
    } catch (err) {
      await ctx.reply('❌ Failed to set slow mode. Make sure I have the right permissions.');
    }
  });

  bot.command('slowoff', async (ctx) => {
    if (!ctx.chat || ctx.chat.type === 'private') {
      await ctx.reply('Use this command in a group chat.');
      return;
    }
    if (!(await requireAdmin(ctx, sessionId))) return;
    if (!(await requireBotAdmin(ctx))) return;

    try {
      await (ctx.api as any).setChatSlowModeDelay(ctx.chat.id, 0);
      await ctx.reply('⏱️ Slow mode <b>disabled</b>.', { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Failed to disable slow mode.');
    }
  });
}
