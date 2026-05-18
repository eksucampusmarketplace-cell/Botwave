/**
 * Channel Force Join - require users to join a channel before chatting.
 * /forcejoin <@channel>, /forcejoin off
 */

import { Bot, InlineKeyboard } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig } from '../utils/db';
import { escapeHtml } from '../utils/format';

export function registerChannelForceHandlers(bot: Bot, sessionId: string): void {
  bot.command('forcejoin', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const args = (ctx.message?.text || '').split(/\s+/).slice(1);
    const arg = args[0]?.toLowerCase();

    if (!arg) {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      const channel = (config as Record<string, unknown>).force_channel as string;
      if (channel) {
        await ctx.reply(`Currently forcing users to join: <b>${escapeHtml(channel)}</b>\nUse /forcejoin off to disable.`, { parse_mode: 'HTML' });
      } else {
        await ctx.reply('Usage: /forcejoin <@channel_username>\nUse /forcejoin off to disable.');
      }
      return;
    }

    if (arg === 'off') {
      await updateTelegramConfig(sessionId, { force_channel: null } as Record<string, unknown>);
      await ctx.reply('✅ Channel force-join disabled.');
      return;
    }

    const channel = arg.startsWith('@') ? arg : `@${arg}`;
    await updateTelegramConfig(sessionId, { force_channel: channel } as Record<string, unknown>);
    await ctx.reply(`✅ Users must now join ${escapeHtml(channel)} to chat here.`, { parse_mode: 'HTML' });
  });

  // Middleware to check channel membership
  bot.on('message', async (ctx, next) => {
    if (!ctx.from || !ctx.chat || ctx.chat.type === 'private') {
      await next();
      return;
    }

    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const channel = (config as Record<string, unknown>).force_channel as string;
    if (!channel) {
      await next();
      return;
    }

    try {
      const member = await ctx.api.getChatMember(channel, ctx.from.id);
      if (['member', 'administrator', 'creator'].includes(member.status)) {
        await next();
        return;
      }
    } catch {
      // If we can't check, let the message through
      await next();
      return;
    }

    try { await ctx.deleteMessage(); } catch { /* may lack perms */ }

    const keyboard = new InlineKeyboard()
      .url(`Join ${channel}`, `https://t.me/${channel.replace('@', '')}`);

    await ctx.reply(
      `${escapeHtml(ctx.from.first_name)}, you must join ${escapeHtml(channel)} to chat here.`,
      { parse_mode: 'HTML', reply_markup: keyboard },
    );
  });
}
