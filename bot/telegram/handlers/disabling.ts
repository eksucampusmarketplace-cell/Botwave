/**
 * Disabling handler: disable/enable specific bot commands per group.
 * /disable, /enable, /disableable, /disabledel, /disableadmin, /disabled
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { , updateTelegramConfig } from '../utils/db';
import { escapeHtml } from '../utils/format';

const DISABLEABLE_COMMANDS = [
  'admins', 'adminlist', 'id', 'info', 'chatinfo', 'rules', 'notes', 'saved',
  'joke', 'quote', 'dice', 'coin', '8ball', 'choose', 'roll', 'afk',
  'purge', 'pin', 'unpin', 'locks', 'warns', 'kick', 'ban', 'mute',
  'flood', 'blacklist', 'report', 'speed', 'ping',
] as const;

export function registerDisablingHandlers(bot: Bot, sessionId: string): void {
  // /disable <command> — Disable a command in this chat
  bot.command('disable', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const cmd = (ctx.match?.toString() || '').trim().toLowerCase().replace(/^\//, '');
    if (!cmd) {
      await ctx.reply('Usage: /disable <command>\nSee /disableable for available commands.');
      return;
    }
    if (!DISABLEABLE_COMMANDS.includes(cmd as typeof DISABLEABLE_COMMANDS[number])) {
      await ctx.reply(`❌ "${cmd}" cannot be disabled. See /disableable.`);
      return;
    }
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const disabled: string[] = (config as Record<string, unknown>).disabled_commands as string[] || [];
    if (!disabled.includes(cmd)) {
      disabled.push(cmd);
      await updateTelegramConfig(sessionId, { disabled_commands: disabled } as Record<string, unknown>);
    }
    await ctx.reply(`✅ /${cmd} has been disabled in this chat.`);
  });

  // /enable <command> — Re-enable a disabled command
  bot.command('enable', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const cmd = (ctx.match?.toString() || '').trim().toLowerCase().replace(/^\//, '');
    if (!cmd) {
      await ctx.reply('Usage: /enable <command>');
      return;
    }
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const disabled: string[] = (config as Record<string, unknown>).disabled_commands as string[] || [];
    const filtered = disabled.filter(c => c !== cmd);
    await updateTelegramConfig(sessionId, { disabled_commands: filtered } as Record<string, unknown>);
    await ctx.reply(`✅ /${cmd} has been re-enabled.`);
  });

  // /disableable — List all commands that can be disabled
  bot.command('disableable', async (ctx) => {
    const list = DISABLEABLE_COMMANDS.map(c => `• <code>/${c}</code>`).join('\n');
    await ctx.reply(`<b>Disableable Commands</b>\n\n${list}`, { parse_mode: 'HTML' });
  });

  // /disabledel <yes/no> — Delete disabled command messages
  bot.command('disabledel', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { disabled_del: true } as Record<string, unknown>);
      await ctx.reply('✅ Disabled command messages will be deleted.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { disabled_del: false } as Record<string, unknown>);
      await ctx.reply('✅ Disabled command messages will not be deleted.');
    } else {
      await ctx.reply('Usage: /disabledel <yes/no/on/off>');
    }
  });

  // /disableadmin <yes/no> — Whether disabled commands also apply to admins
  bot.command('disableadmin', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { disable_admin: true } as Record<string, unknown>);
      await ctx.reply('✅ Disabled commands now also apply to admins.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { disable_admin: false } as Record<string, unknown>);
      await ctx.reply('✅ Admins can still use disabled commands.');
    } else {
      await ctx.reply('Usage: /disableadmin <yes/no/on/off>');
    }
  });

  // /disabled — List all currently disabled commands
  bot.command('disabled', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const disabled: string[] = (config as Record<string, unknown>).disabled_commands as string[] || [];
    if (disabled.length === 0) {
      await ctx.reply('No commands are currently disabled.');
      return;
    }
    const list = disabled.map(c => `• <code>/${escapeHtml(c)}</code>`).join('\n');
    await ctx.reply(`<b>Disabled Commands</b>\n\n${list}`, { parse_mode: 'HTML' });
  });
}
