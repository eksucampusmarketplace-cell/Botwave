/**
 * Log channel handler: /setlog, /unsetlog, /logchannel
 * Sends moderation actions to a designated channel.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getTelegramConfig, updateTelegramConfig } from '../utils/db';
import { escapeHtml } from '../utils/format';

export function registerLogChannelHandlers(bot: Bot, sessionId: string): void {
  bot.command('setlog', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) {
      await ctx.reply(
        'Usage: /setlog <channel_id>\n\n' +
        'Send a message in the target channel and forward it here, ' +
        'or pass the channel ID directly (e.g. -1001234567890).',
      );
      return;
    }

    const channelId = arg;

    // Verify bot can post to the channel
    try {
      const testMsg = await ctx.api.sendMessage(
        Number(channelId),
        'Log channel linked successfully.',
      );
      await ctx.api.deleteMessage(Number(channelId), testMsg.message_id);
    } catch {
      await ctx.reply(
        '❌ I cannot post to that channel. Make sure I am an admin there.',
      );
      return;
    }

    await updateTelegramConfig(sessionId, { log_channel_id: channelId });
    await ctx.reply(`✅ Log channel set to <code>${escapeHtml(channelId)}</code>.`, {
      parse_mode: 'HTML',
    });
  });

  bot.command('unsetlog', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await updateTelegramConfig(sessionId, { log_channel_id: null });
    await ctx.reply('✅ Log channel removed.');
  });

  bot.command('logchannel', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
    if (config.log_channel_id) {
      await ctx.reply(
        `📋 Log channel: <code>${escapeHtml(config.log_channel_id)}</code>`,
        { parse_mode: 'HTML' },
      );
    } else {
      await ctx.reply('📋 No log channel set. Use /setlog <channel_id> to set one.');
    }
  });
}

/**
 * Post a moderation event to the configured log channel.
 */
export async function postToLogChannel(
  bot: Bot,
  sessionId: string,
  logChannelId: string,
  action: string,
  chatTitle: string,
  targetName: string,
  moderatorName: string,
  reason: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  const detailLines = Object.entries(details)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const text =
    `<b>[MOD LOG]</b>\n` +
    `Action: <b>${escapeHtml(action.toUpperCase())}</b>\n` +
    `Chat: ${escapeHtml(chatTitle)}\n` +
    `Target: ${escapeHtml(targetName)}\n` +
    `By: ${escapeHtml(moderatorName)}\n` +
    (reason ? `Reason: ${escapeHtml(reason)}\n` : '') +
    (detailLines ? `\n${escapeHtml(detailLines)}` : '');

  try {
    await bot.api.sendMessage(Number(logChannelId), text, {
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error(`[TG-LOG] Failed to post to log channel ${logChannelId}:`, err);
  }
}
