/**
 * Join Request Approval - /setapprove on/off, auto-approve or manual via log channel.
 */

import { Bot, InlineKeyboard } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig } from '../utils/db';
import { escapeHtml } from '../utils/format';

export function registerJoinApprovalHandlers(bot: Bot, sessionId: string): void {
  bot.command('setapprove', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const args = (ctx.message?.text || '').split(/\s+/).slice(1);
    const mode = args[0]?.toLowerCase();

    if (!mode || !['on', 'off', 'auto'].includes(mode)) {
      await ctx.reply('Usage: /setapprove <on|off|auto>\n\non = manual approval\nauto = auto-approve\noff = disabled');
      return;
    }

    await updateTelegramConfig(sessionId, { join_approval_enabled: mode !== 'off', join_approval_mode: mode === 'auto' ? 'auto' : 'manual' } as Record<string, unknown>);
    const label = mode === 'off' ? 'disabled' : mode === 'auto' ? 'auto-approve' : 'manual approval';
    await ctx.reply(`Join approval set to: <b>${label}</b>`, { parse_mode: 'HTML' });
  });

  bot.on('chat_join_request', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const cfg = config as Record<string, unknown>;
    if (!cfg.join_approval_enabled) return;

    const user = ctx.chatJoinRequest.from;
    const chatId = ctx.chatJoinRequest.chat.id;

    if (cfg.join_approval_mode === 'auto') {
      try {
        await ctx.approveChatJoinRequest(user.id);
      } catch { /* may fail if already approved */ }
      return;
    }

    // Manual mode - send to log channel or group
    const logChannelId = config.log_channel_id;
    const targetChat = logChannelId ? Number(logChannelId) : chatId;

    const keyboard = new InlineKeyboard()
      .text('✅ Approve', `joinapprove:${chatId}:${user.id}`)
      .text('❌ Decline', `joindecline:${chatId}:${user.id}`);

    const text = `📋 <b>Join Request</b>\n\n` +
      `User: ${escapeHtml(user.first_name)} ${user.last_name ? escapeHtml(user.last_name) : ''}\n` +
      `ID: <code>${user.id}</code>\n` +
      `Username: ${user.username ? '@' + escapeHtml(user.username) : 'none'}`;

    try {
      await bot.api.sendMessage(targetChat, text, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch { /* channel may not exist */ }
  });

  bot.callbackQuery(/^joinapprove:(-?\d+):(\d+)$/, async (ctx) => {
    const chatId = parseInt(ctx.match![1]);
    const userId = parseInt(ctx.match![2]);
    try {
      await bot.api.approveChatJoinRequest(chatId, userId);
      await ctx.editMessageText(`✅ Approved user ${userId}`, { parse_mode: 'HTML' });
    } catch {
      await ctx.answerCallbackQuery({ text: 'Failed to approve - request may have expired.' });
    }
  });

  bot.callbackQuery(/^joindecline:(-?\d+):(\d+)$/, async (ctx) => {
    const chatId = parseInt(ctx.match![1]);
    const userId = parseInt(ctx.match![2]);
    try {
      await bot.api.declineChatJoinRequest(chatId, userId);
      await ctx.editMessageText(`❌ Declined user ${userId}`, { parse_mode: 'HTML' });
    } catch {
      await ctx.answerCallbackQuery({ text: 'Failed to decline - request may have expired.' });
    }
  });
}
