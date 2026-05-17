/**
 * Moderation handlers: ban, unban, tban, mute, unmute, tmute, kick,
 * warn, unwarn, warns, resetwarns.
 */

import { Bot, type Context, InlineKeyboard } from 'grammy';
import { checkPermissions, isSudoUser } from '../utils/permissions';
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

/**
 * Resolve target ID, handling @username async resolution.
 * Returns the resolved targetId or null (with error reply sent).
 */
async function resolveTargetId(
  ctx: Context,
  sessionId: string,
  usage: string,
): Promise<{ targetId: number; targetName: string; reason: string } | null> {
  const { user, userId, username, reason } = resolveTarget(ctx);
  let targetId = user?.id || userId;

  if (!targetId && username) {
    try {
      const chat = await ctx.api.getChat(username);
      targetId = (chat as { id: number }).id;
    } catch {
      await ctx.reply('Could not find that user. Make sure they have been in this group.');
      return null;
    }
  }

  if (!targetId) {
    await ctx.reply(usage);
    return null;
  }

  // Self-action protection
  if (targetId === ctx.from!.id) {
    await ctx.reply('You cannot do this to yourself.');
    return null;
  }
  // Bot self-protection
  if (targetId === ctx.me.id) {
    await ctx.reply("I won't do that to myself.");
    return null;
  }
  // Sudo user protection
  if (await isSudoUser(sessionId, targetId)) {
    await ctx.reply('Cannot act on sudo users.');
    return null;
  }

  const targetName = user ? mentionUser(user) : `User ${targetId}`;
  return { targetId, targetName, reason };
}

export function registerModerationHandlers(bot: Bot, sessionId: string): void {
  // ─── Ban ───────────────────────────────────────────────────────────
  bot.command('ban', async (ctx) => {
    const resolved = await resolveTargetId(ctx, sessionId, 'Usage: /ban [reply/@user/id] [reason]');
    if (!resolved) return;
    const { targetId, targetName, reason } = resolved;
    if (!(await checkPermissions(ctx, targetId, sessionId))) return;

    await ctx.banChatMember(targetId);

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
    const resolved = await resolveTargetId(ctx, sessionId, 'Usage: /unban [reply/@user/id]');
    if (!resolved) return;
    const { targetId, targetName } = resolved;
    if (!(await checkPermissions(ctx, targetId, sessionId))) return;

    await ctx.unbanChatMember(targetId);
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
    const resolved = await resolveTargetId(ctx, sessionId, 'Usage: /tban [reply/@user/id] [duration] [reason]');
    if (!resolved) return;
    const { targetId, targetName, reason } = resolved;
    if (!(await checkPermissions(ctx, targetId, sessionId))) return;

    const parts = reason.split(/\s+/);
    const duration = parseDuration(parts[0] || '');
    if (!duration) {
      await ctx.reply('Usage: /tban @user 1h reason\nDuration: s/m/h/d/w');
      return;
    }
    const actualReason = parts.slice(1).join(' ');
    const untilDate = Math.floor(Date.now() / 1000) + duration;

    await ctx.banChatMember(targetId, { until_date: untilDate });

    await ctx.reply(
      `🚫 ${targetName} has been banned for ${formatDurationLong(duration)}.\n` +
      `📝 Reason: ${escapeHtml(actualReason || 'No reason given')}`,
      { parse_mode: 'HTML' },
    );
    logModAction(sessionId, ctx.chat!.id.toString(), 'tban', targetId.toString(), ctx.from?.id.toString() || null, actualReason || null, { duration });
  });

  // ─── Mute ──────────────────────────────────────────────────────────
  bot.command('mute', async (ctx) => {
    const resolved = await resolveTargetId(ctx, sessionId, 'Usage: /mute [reply/@user/id] [reason]');
    if (!resolved) return;
    const { targetId, targetName, reason } = resolved;
    if (!(await checkPermissions(ctx, targetId, sessionId))) return;

    await ctx.restrictChatMember(targetId, { can_send_messages: false });

    await ctx.reply(
      `🔇 ${targetName} has been muted.\n` +
      `📝 Reason: ${escapeHtml(reason || 'No reason given')}`,
      { parse_mode: 'HTML' },
    );
    logModAction(sessionId, ctx.chat!.id.toString(), 'mute', targetId.toString(), ctx.from?.id.toString() || null, reason || null);
  });

  // ─── Unmute ────────────────────────────────────────────────────────
  bot.command('unmute', async (ctx) => {
    const resolved = await resolveTargetId(ctx, sessionId, 'Usage: /unmute [reply/@user/id]');
    if (!resolved) return;
    const { targetId, targetName } = resolved;
    if (!(await checkPermissions(ctx, targetId, sessionId))) return;

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

    await ctx.reply(`🔊 ${targetName} has been unmuted.`, { parse_mode: 'HTML' });
    logModAction(sessionId, ctx.chat!.id.toString(), 'unmute', targetId.toString(), ctx.from?.id.toString() || null, null);
  });

  // ─── Temp Mute ─────────────────────────────────────────────────────
  bot.command('tmute', async (ctx) => {
    const resolved = await resolveTargetId(ctx, sessionId, 'Usage: /tmute [reply/@user/id] [duration] [reason]');
    if (!resolved) return;
    const { targetId, targetName, reason } = resolved;
    if (!(await checkPermissions(ctx, targetId, sessionId))) return;

    const parts = reason.split(/\s+/);
    const duration = parseDuration(parts[0] || '');
    if (!duration) {
      await ctx.reply('Usage: /tmute @user 1h reason\nDuration: s/m/h/d/w');
      return;
    }
    const actualReason = parts.slice(1).join(' ');
    const untilDate = Math.floor(Date.now() / 1000) + duration;

    await ctx.restrictChatMember(targetId, { can_send_messages: false }, { until_date: untilDate });

    await ctx.reply(
      `🔇 ${targetName} has been muted for ${formatDurationLong(duration)}.\n` +
      `📝 Reason: ${escapeHtml(actualReason || 'No reason given')}`,
      { parse_mode: 'HTML' },
    );
    logModAction(sessionId, ctx.chat!.id.toString(), 'tmute', targetId.toString(), ctx.from?.id.toString() || null, actualReason || null, { duration });
  });

  // ─── Kick ──────────────────────────────────────────────────────────
  bot.command('kick', async (ctx) => {
    const resolved = await resolveTargetId(ctx, sessionId, 'Usage: /kick [reply/@user/id] [reason]');
    if (!resolved) return;
    const { targetId, targetName, reason } = resolved;
    if (!(await checkPermissions(ctx, targetId, sessionId))) return;

    await ctx.banChatMember(targetId);
    await ctx.unbanChatMember(targetId);

    await ctx.reply(
      `👢 ${targetName} has been kicked.\n` +
      `📝 Reason: ${escapeHtml(reason || 'No reason given')}`,
      { parse_mode: 'HTML' },
    );
    logModAction(sessionId, ctx.chat!.id.toString(), 'kick', targetId.toString(), ctx.from?.id.toString() || null, reason || null);
  });

  // ─── Warn ──────────────────────────────────────────────────────────
  bot.command('warn', async (ctx) => {
    const resolved = await resolveTargetId(ctx, sessionId, 'Usage: /warn [reply/@user/id] [reason]');
    if (!resolved) return;
    const { targetId, targetName, reason } = resolved;
    if (!(await checkPermissions(ctx, targetId, sessionId))) return;

    const config = await getTelegramConfig(sessionId);
    const chatId = ctx.chat!.id.toString();
    const count = await addWarning(
      sessionId,
      chatId,
      targetId.toString(),
      ctx.from!.id.toString(),
      reason || null,
    );

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
    const resolved = await resolveTargetId(ctx, sessionId, 'Usage: /unwarn [reply/@user/id]');
    if (!resolved) return;
    const { targetId, targetName } = resolved;
    if (!(await checkPermissions(ctx, targetId, sessionId))) return;

    const chatId = ctx.chat!.id.toString();
    const remaining = await removeWarning(sessionId, chatId, targetId.toString());
    await ctx.reply(`✅ Removed one warning from ${targetName}. Remaining: ${remaining}`, { parse_mode: 'HTML' });
  });

  // ─── Warns ─────────────────────────────────────────────────────────
  bot.command('warns', async (ctx) => {
    const { user, userId, username } = resolveTarget(ctx);
    let targetId = user?.id || userId || ctx.from?.id;
    if (!targetId && username) {
      try {
        const chat = await ctx.api.getChat(username);
        targetId = (chat as { id: number }).id;
      } catch { /* ignore */ }
    }
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
    const resolved = await resolveTargetId(ctx, sessionId, 'Usage: /resetwarns [reply/@user/id]');
    if (!resolved) return;
    const { targetId, targetName } = resolved;
    if (!(await checkPermissions(ctx, targetId, sessionId))) return;

    const chatId = ctx.chat!.id.toString();
    await resetWarnings(sessionId, chatId, targetId.toString());
    await ctx.reply(`✅ All warnings cleared for ${targetName}.`, { parse_mode: 'HTML' });
  });
}
