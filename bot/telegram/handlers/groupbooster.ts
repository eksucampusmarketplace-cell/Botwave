/**
 * Group Booster — /boost, /boostinfo, engagement tracking and reminders.
 */

import { Bot, InlineKeyboard } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { escapeHtml } from '../utils/format';
import { getTelegramConfig, updateTelegramConfig } from '../utils/db';

export function registerGroupBoosterHandlers(bot: Bot, sessionId: string): void {
  bot.command('boost', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const args = (ctx.message?.text || '').split(/\s+/).slice(1);
    const mode = args[0]?.toLowerCase();

    if (!mode || !['on', 'off'].includes(mode)) {
      await ctx.reply('Usage: /boost <on|off>\n\nWhen enabled, the bot will periodically send engagement prompts.');
      return;
    }

    await updateTelegramConfig(sessionId, { booster_enabled: mode === 'on' } as Record<string, unknown>);
    await ctx.reply(`✅ Group booster ${mode === 'on' ? 'enabled' : 'disabled'}.`);
  });

  bot.command('boostinfo', async (ctx) => {
    const chatId = ctx.chat!.id;
    try {
      const count = await bot.api.getChatMemberCount(chatId);
      const chat = await bot.api.getChat(chatId);
      const chatData = chat as Record<string, unknown>;
      const title = chatData.title as string || 'Unknown';
      const desc = chatData.description as string || 'No description';
      const inviteLink = chatData.invite_link as string;

      let text = `📊 <b>Group Info</b>\n\n`;
      text += `📛 Title: <b>${escapeHtml(title)}</b>\n`;
      text += `📝 Description: ${escapeHtml(desc.slice(0, 200))}\n`;
      text += `👥 Members: <b>${count}</b>\n`;
      if (inviteLink) {
        text += `🔗 Invite: ${inviteLink}\n`;
      }

      await ctx.reply(text, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Could not fetch group info.');
    }
  });

  bot.command('invite', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    try {
      const link = await ctx.exportChatInviteLink();
      await ctx.reply(`🔗 Invite link:\n${link}`);
    } catch {
      await ctx.reply('❌ Could not create invite link. Make sure I have admin permissions.');
    }
  });
}
