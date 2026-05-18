/**
 * Group lifecycle handler — detects when the bot is added to or removed from groups.
 * Inspired by Nexus bot's group_lifecycle.py pattern.
 *
 * Events handled via my_chat_member:
 *   - Bot added to group (left/kicked -> member/administrator)
 *   - Bot removed from group (member/administrator -> left/kicked)
 *
 * On ADD:
 *   - Register group in DB for multi-group tracking
 *   - DM the admin who added the bot with setup instructions
 *   - Send brief confirmation in the group
 *
 * On REMOVE:
 *   - Mark group as inactive in DB
 *   - Log the removal
 */

import { Bot, InlineKeyboard } from 'grammy';
import { getGroupConfig, registerGroup, unregisterGroup } from '../utils/db';
import { isOwner } from '../utils/permissions';

const POWERED_BY = '\n\n<b>Powered by Botwave</b>';

function isBotAdd(
  newStatus: string,
  oldStatus: string,
): boolean {
  return (
    (newStatus === 'member' || newStatus === 'administrator') &&
    (oldStatus === 'left' || oldStatus === 'kicked')
  );
}

function isBotRemove(
  newStatus: string,
  oldStatus: string,
): boolean {
  return (
    (newStatus === 'left' || newStatus === 'kicked') &&
    (oldStatus === 'member' || oldStatus === 'administrator')
  );
}

export function registerGroupLifecycleHandlers(bot: Bot, sessionId: string): void {
  bot.on('my_chat_member', async (ctx) => {
    const update = ctx.myChatMember;
    if (!update) return;

    const botId = ctx.me.id;
    const newMember = update.new_chat_member;
    const oldMember = update.old_chat_member;

    // Only handle events about the bot itself
    if (newMember.user.id !== botId) return;

    const chat = update.chat;
    const actor = update.from;

    // Only handle group/supergroup chats
    if (chat.type !== 'group' && chat.type !== 'supergroup') return;

    const chatId = chat.id.toString();
    const chatTitle = chat.title || 'Unknown Group';
    const chatType = chat.type;

    // ── BOT REMOVED ──────────────────────────────────────────────────
    if (isBotRemove(newMember.status, oldMember.status)) {
      console.log(`[TG-LIFECYCLE] Removed from "${chatTitle}" (${chatId}) by user ${actor.id}`);
      await unregisterGroup(sessionId, chatId);
      return;
    }

    // ── BOT ADDED ────────────────────────────────────────────────────
    if (!isBotAdd(newMember.status, oldMember.status)) return;

    console.log(`[TG-LIFECYCLE] Added to "${chatTitle}" (${chatId}) by user ${actor.id}`);

    // Register group in DB
    await registerGroup(sessionId, chatId, chatTitle, chatType, actor.id.toString());

    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    const botInfo = ctx.me;
    const botName = botInfo.first_name || botInfo.username || 'Botwave';
    const miniappUrl = config.miniapp_base_url || process.env.NEXT_PUBLIC_APP_URL || '';
    const actorIsOwner = await isOwner(sessionId, actor.id);

    // Build DM message for the admin who added the bot
    const dmText =
      `${actorIsOwner ? '✅' : '👋'} <b>${actorIsOwner ? 'Your bot was' : `Hey ${actor.first_name}! I've been`} added to ${chatTitle}!</b>\n\n` +
      `${actorIsOwner ? '⚡ <b>Quick Setup:</b>' : '⚡ <b>Getting Started:</b>'}\n` +
      `├ Open the panel below to configure everything\n` +
      `├ Set welcome messages, rules, and moderation\n` +
      `├ Enable anti-flood, anti-link, captcha\n` +
      `└ Configure XP, filters, and more\n\n` +
      `💡 Use /help in the group to see all commands.` +
      POWERED_BY;

    const dmKeyboard = new InlineKeyboard();
    if (miniappUrl) {
      const settingsUrl = `${miniappUrl}/miniapp/admin/index.html?sessionId=${sessionId}`;
      dmKeyboard.webApp('⚡ Open Settings', settingsUrl).row();
    }
    dmKeyboard
      .text('❓ Commands', 'help_main')
      .text('📖 Categories', 'help_categories');

    // Try to DM the admin
    try {
      await ctx.api.sendMessage(actor.id, dmText, {
        parse_mode: 'HTML',
        reply_markup: dmKeyboard,
      });
    } catch {
      console.log(`[TG-LIFECYCLE] Could not DM user ${actor.id} — they may not have started the bot`);
    }

    // Send brief confirmation in the group
    try {
      const groupMsg =
        `👋 <b>Hey! I'm ${botName}</b> — a powerful group management bot.\n\n` +
        `✅ I'm ready! Use /help to see all available commands.\n` +
        `📱 Use /panel to open the management dashboard.` +
        POWERED_BY;

      const groupKeyboard = new InlineKeyboard()
        .text('❓ Commands', 'help_main')
        .text('📖 Categories', 'help_categories');

      if (miniappUrl) {
        const panelUrl = `${miniappUrl}/miniapp/admin/index.html?sessionId=${sessionId}`;
        groupKeyboard.row().webApp('📱 Open Panel', panelUrl);
      }

      await ctx.api.sendMessage(chat.id, groupMsg, {
        parse_mode: 'HTML',
        reply_markup: groupKeyboard,
      });
    } catch (err) {
      console.warn(`[TG-LIFECYCLE] Could not send group welcome to ${chatId}:`, err);
    }
  });
}
