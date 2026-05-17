/**
 * Profile tools: /profile, /whois — user profile lookup with detailed info.
 */

import { Bot } from 'grammy';
import { escapeHtml, mentionUser } from '../utils/format';
import { getXp } from '../utils/db';

export function registerProfileToolsHandlers(bot: Bot, sessionId: string): void {
  bot.command(['profile', 'whois'], async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    let targetUser = ctx.from;
    let targetId = ctx.from.id;

    if (ctx.message?.reply_to_message?.from) {
      targetUser = ctx.message.reply_to_message.from;
      targetId = targetUser.id;
    } else {
      const arg = (ctx.match?.toString() || '').trim();
      if (arg) {
        const numId = parseInt(arg, 10);
        if (!isNaN(numId)) {
          try {
            const member = await ctx.getChatMember(numId);
            targetUser = member.user;
            targetId = member.user.id;
          } catch {
            await ctx.reply('❌ User not found.');
            return;
          }
        }
      }
    }

    let memberStatus = 'Unknown';
    try {
      const member = await ctx.getChatMember(targetId);
      const statusMap: Record<string, string> = {
        creator: '👑 Creator',
        administrator: '⭐ Admin',
        member: '👤 Member',
        restricted: '🔇 Restricted',
        left: '🚪 Left',
        kicked: '🚫 Banned',
      };
      memberStatus = statusMap[member.status] || member.status;
    } catch {}

    const xpData = ctx.chat.type !== 'private'
      ? await getXp(sessionId, ctx.chat.id.toString(), targetId.toString())
      : null;

    const name = escapeHtml(targetUser.first_name + (targetUser.last_name ? ' ' + targetUser.last_name : ''));
    const username = targetUser.username ? '@' + targetUser.username : 'N/A';
    const isBot = targetUser.is_bot ? 'Yes 🤖' : 'No';
    const premium = (targetUser as any).is_premium ? 'Yes ⭐' : 'No';
    const langCode = targetUser.language_code || 'Unknown';

    let msg = `👤 <b>Profile</b>\n\n` +
      `Name: ${name}\n` +
      `Username: ${username}\n` +
      `ID: <code>${targetId}</code>\n` +
      `Bot: ${isBot}\n` +
      `Premium: ${premium}\n` +
      `Language: ${langCode}\n` +
      `Status: ${memberStatus}`;

    if (xpData) {
      msg += `\n\n⭐ <b>XP Stats</b>\nLevel: ${xpData.level}\nXP: ${xpData.xp}\nStreak: ${xpData.streak_days} days`;
    }

    const link = mentionUser(targetUser);
    msg += `\n\nLink: ${link}`;

    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  bot.command('membercount', async (ctx) => {
    if (!ctx.chat || ctx.chat.type === 'private') {
      await ctx.reply('Use this command in a group chat.');
      return;
    }
    try {
      const count = await ctx.getChatMemberCount();
      await ctx.reply(`👥 This group has <b>${count}</b> members.`, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Could not fetch member count.');
    }
  });
}
