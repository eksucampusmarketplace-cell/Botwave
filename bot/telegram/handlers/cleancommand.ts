/**
 * Clean Command handler: auto-delete bot command messages.
 * /cleancommand, /keepcommand, /cleancommandtypes
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig } from '../utils/db';

export function registerCleanCommandHandlers(bot: Bot, sessionId: string): void {
  // /cleancommand <yes/no> — Auto-delete command messages after processing
  bot.command('cleancommand', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { clean_commands: true } as Record<string, unknown>);
      await ctx.reply('✅ Command messages will be auto-deleted.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { clean_commands: false } as Record<string, unknown>);
      await ctx.reply('✅ Command messages will no longer be auto-deleted.');
    } else {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      const enabled = (config as Record<string, unknown>).clean_commands;
      await ctx.reply(
        `🧹 <b>Clean Commands</b>\n\n` +
        `Status: ${enabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
        `Usage: /cleancommand <yes/no/on/off>`,
        { parse_mode: 'HTML' },
      );
    }
  });

  // /keepcommand <command> — Exclude a command from auto-deletion
  bot.command('keepcommand', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const cmd = (ctx.match?.toString() || '').trim().toLowerCase().replace(/^\//, '');
    if (!cmd) {
      await ctx.reply('Usage: /keepcommand <command>\nExample: /keepcommand rules');
      return;
    }
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const kept: string[] = (config as Record<string, unknown>).kept_commands as string[] || [];
    if (!kept.includes(cmd)) {
      kept.push(cmd);
      await updateTelegramConfig(sessionId, { kept_commands: kept } as Record<string, unknown>);
    }
    await ctx.reply(`✅ /${cmd} will not be auto-deleted.`);
  });

  // /cleancommandtypes — Show which commands are kept/cleaned
  bot.command('cleancommandtypes', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const kept: string[] = (config as Record<string, unknown>).kept_commands as string[] || [];
    if (kept.length === 0) {
      await ctx.reply('No commands are excluded from auto-deletion.');
      return;
    }
    const list = kept.map(c => `• /${c}`).join('\n');
    await ctx.reply(`<b>Kept Commands</b> (not auto-deleted)\n\n${list}`, { parse_mode: 'HTML' });
  });
}
