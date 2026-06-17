/**
 * Clean Service handler: auto-delete service messages (join/leave notifications).
 * /cleanservice, /keepservice, /nocleanservice, /cleanservicetypes
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig } from '../utils/db';

const SERVICE_TYPES = ['join', 'leave', 'pin', 'photo_change', 'title_change', 'video_chat'] as const;

export function registerCleanServiceHandlers(bot: Bot, sessionId: string): void {
  // /cleanservice <type/yes/no> - Enable auto-deletion of service messages
  bot.command('cleanservice', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on', 'all'].includes(arg)) {
      await updateTelegramConfig(sessionId, { clean_service: true } as Record<string, unknown>);
      await ctx.reply('✅ All service messages will be auto-deleted.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { clean_service: false } as Record<string, unknown>);
      await ctx.reply('✅ Service message cleanup disabled.');
    } else {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      const enabled = (config as Record<string, unknown>).clean_service;
      await ctx.reply(
        `🧹 <b>Clean Service Messages</b>\n\n` +
        `Status: ${enabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
        `Usage: /cleanservice <yes/no/on/off>`,
        { parse_mode: 'HTML' },
      );
    }
  });

  // /keepservice <type> - Exclude a service type from auto-deletion
  bot.command('keepservice', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (!arg || !SERVICE_TYPES.includes(arg as typeof SERVICE_TYPES[number])) {
      await ctx.reply(`Usage: /keepservice <${SERVICE_TYPES.join('/')}>`);
      return;
    }
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const kept: string[] = (config as Record<string, unknown>).kept_services as string[] || [];
    if (!kept.includes(arg)) {
      kept.push(arg);
      await updateTelegramConfig(sessionId, { kept_services: kept } as Record<string, unknown>);
    }
    await ctx.reply(`✅ "${arg}" service messages will not be deleted.`);
  });

  // /nocleanservice - Alias for /cleanservice off
  bot.command('nocleanservice', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await updateTelegramConfig(sessionId, { clean_service: false } as Record<string, unknown>);
    await ctx.reply('✅ Service message cleanup disabled.');
  });

  // /cleanservicetypes - Show available service types
  bot.command('cleanservicetypes', async (ctx) => {
    const list = SERVICE_TYPES.map(t => `• <code>${t}</code>`).join('\n');
    await ctx.reply(`<b>Service Message Types</b>\n\n${list}`, { parse_mode: 'HTML' });
  });
}
