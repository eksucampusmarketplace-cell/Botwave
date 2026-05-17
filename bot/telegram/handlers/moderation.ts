/**
 * Moderation handlers: ban, unban, tban, mute, unmute, tmute, kick,
 * warn, unwarn, warns, resetwarns.
 */

import { Bot, type Context, InlineKeyboard } from 'grammy';
import { checkPermissions } from '../utils/permissions';
import { resolveTarget, parseDuration } from '../utils/resolve';
import { mentionUser, mentionById, formatDurationLong, escapeHtml } from '../utils/format';
import {
  getTelegramConfig,
  addWarning,
  removeWarning,
  getWarnings,
  getWarningCount,
  resetWarnings,
  logModAction,
} from '../utils/db';

export function registerModerationHandlers(bot: Bot, sessionId: string): void {
  // ─── Ban ───────────────────────────────────────────────────────────
  bot.command('ban', async (ctx) => {
    const { user, userId, reason } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /ban [reply/@user/id] [reason]');
      return;
    }
    if (!(await checkPermissions(ctx, targetId))) return;

    await ctx.banChatMember(targetId);

    const targetName = user ? mentionUser(user) : `User ${targetId}`;
    const invokerName = ctx.from ? mentionUser(ctx.from) : 'Unknown';

    const keyboard = new InlineKeyboard()
      .text('✅ Unban', `unban:${targetId}`)
      .text('❌ Keep Banned', 'dismiss');

    await ctx.reply(
      `🚫 ${targetName} has been banned.\n` +
      `👮 By: ${invokerName}\n` +
      `📝 Reason: ${escapeHtml(reason || 'No reason given')}`,
      { parse_mode: 'HTML', reply_markup: keyboard },
    );

    logModAction(sessionId, ctx.chat!.id.toString(), 'ban', targetId.toString(), ctx.from?.id.toString() || null, reason || null);
  });

  // ─── Unban ─────────────────────────────────────────────────────────
  bot.command('unban', async (ctx) => {
    const { user, userId } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /unban [reply/@user/id]');
      return;
    }
    if (!(await checkPermissions(ctx, targetId))) return;

    await ctx.unbanChatMember(targetId);
    const targetName = user ? mentionUser(user) : `User ${targetId}`;
    await ctx.reply(`✅ ${targetName} has been unbanned.`, { parse_mode: 'HTML' });
    logModAction(sessionId, ctx.chat!.id.toString(), 'unban', targetId.toString(), ctx.from?.id.toString() || null, null);
  });

  // Inline unban callback
  bot.callbackQuery(/^unban:(\d+)$/, async (ctx) => {
    const targetId = parseInt(ctx.match![1], 10);
    if (!ctx.from || !ctx.chat) return;

    try {
      const invoker = await ctx.getChatMember(ctx.from.id);
      if (!['administrator', 'creator'].includes(invoker.status)) {
        await ctx.answerCallbackQuery({ text: 'Only admins can do this.', show_alert: true });
        return;
      }
      await ctx.api.unbanChatMember(ctx.chat.id, targetId);
      await ctx.answerCallbackQuery({ text: '✅ User unbanned.' });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch {
      await ctx.answerCallbackQuery({ text: 'Failed to unban.', show_alert: true });
    }
  });

  bot.callbackQuery('dismiss', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  });

  // ─── Temp Ban ──────────────────────────────────────────────────────
  bot.command('tban', async (ctx) => {
    const { user, userId, reason } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /tban [reply/@user/id] [duration] [reason]');
      return;
    }
    if (!(await checkPermissions(ctx, targetId))) return;

    const parts = reason.split(/\s+/);
    const duration = parseDuration(parts[0] || '');
    if (!duration) {
      await ctx.reply('Usage: /tban @user 1h reason\nDuration: s/m/h/d/w');
      return;
    }
    const actualReason = parts.slice(1).join(' ');
    const untilDate = Math.floor(Date.now() / 1000) + duration;

    await ctx.banChatMember(targetId, { until_date: untilDate });

    const targetName = user ? mentionUser(user) : `User ${targetId}`;
    await ctx.reply(
      `🚫 ${targetName} has been banned for ${formatDurationLong(duration)}.\n` +
      `📝 Reason: ${escapeHtml(actualReason || 'No reason given')}`,
      { parse_mode: 'HTML' },
    );
    logModAction(sessionId, ctx.chat!.id.toString(), 'tban', targetId.toString(), ctx.from?.id.toString() || null, actualReason || null, { duration });
  });

  // ─── Mute ──────────────────────────────────────────────────────────
  bot.command('mute', async (ctx) => {
    const { user, userId, reason } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /mute [reply/@user/id] [reason]');
      return;
    }
    if (!(await checkPermissions(ctx, targetId))) return;

    await ctx.restrictChatMember(targetId, { can_send_messages: false });

    const targetName = user ? mentionUser(user) : `User ${targetId}`;
    await ctx.reply(
      `🔇 ${targetName} has been muted.\n` +
      `📝 Reason: ${escapeHtml(reason || 'No reason given')}`,
      { parse_mode: 'HTML' },
    );
    logModAction(sessionId, ctx.chat!.id.toString(), 'mute', targetId.toString(), ctx.from?.id.toString() || null, reason || null);
  });

  // ─── Unmute ────────────────────────────────────────────────────────
  bot.command('unmute', async (ctx) => {
    const { user, userId } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /unmute [reply/@user/id]');
      return;
    }
    if (!(await checkPermissions(ctx, targetId))) return;

    await ctx.restrictChatMember(targetId, {
      can_send_messages: true,
      can_send_audios: true,
      can_send_documents: true,
      can_send_photos: true,
      can_send_videos: true,
      can_send_video_notes: true,
      can_send_voice_notes: true,
      can_send_polls: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
    });

    const targetName = user ? mentionUser(user) : `User ${targetId}`;
    await ctx.reply(`🔊 ${targetName} has been unmuted.`, { parse_mode: 'HTML' });
    logModAction(sessionId, ctx.chat!.id.toString(), 'unmute', targetId.toString(), ctx.from?.id.toString() || null, null);
  });

  // ─── Temp Mute ─────────────────────────────────────────────────────
  bot.command('tmute', async (ctx) => {
    const { user, userId, reason } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /tmute [reply/@user/id] [duration] [reason]');
      return;
    }
    if (!(await checkPermissions(ctx, targetId))) return;

    const parts = reason.split(/\s+/);
    const duration = parseDuration(parts[0] || '');
    if (!duration) {
      await ctx.reply('Usage: /tmute @user 1h reason\nDuration: s/m/h/d/w');
      return;
    }
    const actualReason = parts.slice(1).join(' ');
    const untilDate = Math.floor(Date.now() / 1000) + duration;

    await ctx.restrictChatMember(targetId, { can_send_messages: false }, { until_date: untilDate });

    const targetName = user ? mentionUser(user) : `User ${targetId}`;
    await ctx.reply(
      `🔇 ${targetName} has been muted for ${formatDurationLong(duration)}.\n` +
      `📝 Reason: ${escapeHtml(actualReason || 'No reason given')}`,
      { parse_mode: 'HTML' },
    );
    logModAction(sessionId, ctx.chat!.id.toString(), 'tmute', targetId.toString(), ctx.from?.id.toString() || null, actualReason || null, { duration });
  });

  // ─── Kick ──────────────────────────────────────────────────────────
  bot.command('kick', async (ctx) => {
    const { user, userId, reason } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /kick [reply/@user/id] [reason]');
      return;
    }
    if (!(await checkPermissions(ctx, targetId))) return;

    await ctx.banChatMember(targetId);
    await ctx.unbanChatMember(targetId);

    const targetName = user ? mentionUser(user) : `User ${targetId}`;
    await ctx.reply(
      `👢 ${targetName} has been kicked.\n` +
      `📝 Reason: ${escapeHtml(reason || 'No reason given')}`,
      { parse_mode: 'HTML' },
    );
    logModAction(sessionId, ctx.chat!.id.toString(), 'kick', targetId.toString(), ctx.from?.id.toString() || null, reason || null);
  });

  // ─── Warn ──────────────────────────────────────────────────────────
  bot.command('warn', async (ctx) => {
    const { user, userId, reason } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /warn [reply/@user/id] [reason]');
      return;
    }
    if (!(await checkPermissions(ctx, targetId))) return;

    const config = await getTelegramConfig(sessionId);
    const chatId = ctx.chat!.id.toString();
    const count = await addWarning(
      sessionId,
      chatId,
      targetId.toString(),
      ctx.from!.id.toString(),
      reason || null,
    );

    const targetName = user ? mentionUser(user) : `User ${targetId}`;
    await ctx.reply(
      `⚠️ ${targetName} warned.\n` +
      `Count: ${count}/${config.warn_limit}\n` +
      `Reason: ${escapeHtml(reason || 'No reason given')}`,
      { parse_mode: 'HTML' },
    );

    if (count >= config.warn_limit) {
      if (config.warn_action === 'ban') {
        await ctx.banChatMember(targetId);
        await ctx.reply(`🚫 ${targetName} has been banned (warn limit reached).`, { parse_mode: 'HTML' });
        logModAction(sessionId, chatId, 'ban', targetId.toString(), 'system', 'Warn limit reached');
      } else {
        await ctx.restrictChatMember(targetId, { can_send_messages: false });
        await ctx.reply(`🔇 ${targetName} has been muted (warn limit reached).`, { parse_mode: 'HTML' });
        logModAction(sessionId, chatId, 'mute', targetId.toString(), 'system', 'Warn limit reached');
      }
      await resetWarnings(sessionId, chatId, targetId.toString());
    }

    logModAction(sessionId, chatId, 'warn', targetId.toString(), ctx.from?.id.toString() || null, reason || null, { count });
  });

  // ─── Unwarn ────────────────────────────────────────────────────────
  bot.command('unwarn', async (ctx) => {
    const { user, userId } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /unwarn [reply/@user/id]');
      return;
    }
    if (!(await checkPermissions(ctx, targetId))) return;

    const chatId = ctx.chat!.id.toString();
    const remaining = await removeWarning(sessionId, chatId, targetId.toString());
    const targetName = user ? mentionUser(user) : `User ${targetId}`;
    await ctx.reply(`✅ Removed one warning from ${targetName}. Remaining: ${remaining}`, { parse_mode: 'HTML' });
  });

  // ─── Warns ─────────────────────────────────────────────────────────
  bot.command('warns', async (ctx) => {
    const { user, userId } = resolveTarget(ctx);
    const targetId = user?.id || userId || ctx.from?.id;
    if (!targetId) {
      await ctx.reply('Usage: /warns [reply/@user/id]');
      return;
    }

    const chatId = ctx.chat!.id.toString();
    const warnings = await getWarnings(sessionId, chatId, targetId.toString());
    const config = await getTelegramConfig(sessionId);

    if (warnings.length === 0) {
      await ctx.reply('✅ No warnings found for this user.');
      return;
    }

    const targetName = user ? mentionUser(user) : `User ${targetId}`;
    let text = `⚠️ Warnings for ${targetName}: ${warnings.length}/${config.warn_limit}\n\n`;
    for (const w of warnings.slice(0, 10)) {
      const date = new Date(w.created_at).toLocaleDateString();
      text += `• ${escapeHtml(w.reason || 'No reason')} (${date})\n`;
    }

    await ctx.reply(text, { parse_mode: 'HTML' });
  });

  // ─── Reset Warns ───────────────────────────────────────────────────
  bot.command('resetwarns', async (ctx) => {
    const { user, userId } = resolveTarget(ctx);
    const targetId = user?.id || userId;
    if (!targetId) {
      await ctx.reply('Usage: /resetwarns [reply/@user/id]');
      return;
    }
    if (!(await checkPermissions(ctx, targetId))) return;

    const chatId = ctx.chat!.id.toString();
    await resetWarnings(sessionId, chatId, targetId.toString());
    const targetName = user ? mentionUser(user) : `User ${targetId}`;
    await ctx.reply(`✅ All warnings cleared for ${targetName}.`, { parse_mode: 'HTML' });
  });
}
