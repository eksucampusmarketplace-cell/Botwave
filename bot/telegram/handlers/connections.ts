/**
 * Connections handler: connect groups to PM for remote management.
 * /connect, /disconnect, /reconnect, /connection
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig } from '../utils/db';
import { escapeHtml } from '../utils/format';

export function registerConnectionsHandlers(bot: Bot, sessionId: string): void {
  // /connect - Connect this group to your PM for remote management
  bot.command('connect', async (ctx) => {
    if (!ctx.from || !ctx.chat) return;
    if (ctx.chat.type === 'private') {
      await ctx.reply('Use this command in a group to connect it to your PM.');
      return;
    }
    if (!(await requireAdmin(ctx, sessionId))) return;

    const chatId = ctx.chat.id.toString();
    const chatTitle = ctx.chat.title || 'Unknown';
    await updateTelegramConfig(sessionId, {
      connected_chat_id: chatId,
      connected_chat_title: chatTitle,
    } as Record<string, unknown>);

    await ctx.reply(
      `✅ Connected! You can now manage this group from PM.\n` +
      `Chat: <b>${escapeHtml(chatTitle)}</b>`,
      { parse_mode: 'HTML' },
    );
  });

  // /disconnect - Disconnect current group from PM
  bot.command('disconnect', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await updateTelegramConfig(sessionId, {
      connected_chat_id: null,
      connected_chat_title: null,
    } as Record<string, unknown>);
    await ctx.reply('✅ Disconnected from PM management.');
  });

  // /reconnect - Reconnect to previously connected group
  bot.command('reconnect', async (ctx) => {
    if (!ctx.from) return;
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const connectedId = (config as Record<string, unknown>).connected_chat_id as string | null;
    const connectedTitle = (config as Record<string, unknown>).connected_chat_title as string | null;
    if (connectedId) {
      await ctx.reply(
        `✅ Reconnected to <b>${escapeHtml(connectedTitle || connectedId)}</b>.`,
        { parse_mode: 'HTML' },
      );
    } else {
      await ctx.reply('❌ No previously connected group found. Use /connect in a group first.');
    }
  });

  // /connection - Show current connection status
  bot.command('connection', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const connectedId = (config as Record<string, unknown>).connected_chat_id as string | null;
    const connectedTitle = (config as Record<string, unknown>).connected_chat_title as string | null;
    if (connectedId) {
      await ctx.reply(
        `🔗 <b>Connection Status</b>\n\n` +
        `Connected to: <b>${escapeHtml(connectedTitle || 'Unknown')}</b>\n` +
        `Chat ID: <code>${connectedId}</code>`,
        { parse_mode: 'HTML' },
      );
    } else {
      await ctx.reply('🔗 Not connected to any group. Use /connect in a group.');
    }
  });
}
