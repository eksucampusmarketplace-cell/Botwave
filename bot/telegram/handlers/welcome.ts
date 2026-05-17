/**
 * Welcome and goodbye message handlers.
 * All text is editable via per-session config.
 */

import { Bot } from 'grammy';
import { getTelegramConfig } from '../utils/db';
import { mentionUser } from '../utils/format';

export function registerWelcomeHandlers(bot: Bot, sessionId: string): void {
  bot.on(':new_chat_members', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
    if (!config.welcome_message) return;

    for (const member of ctx.message!.new_chat_members!) {
      if (member.is_bot) continue;

      let memberCount = 0;
      try {
        memberCount = await ctx.api.getChatMemberCount(ctx.chat.id);
      } catch { /* ignore */ }

      const text = config.welcome_message
        .replace(/{name}/g, member.first_name)
        .replace(/{username}/g, member.username ? `@${member.username}` : member.first_name)
        .replace(/{group}/g, ctx.chat.title || '')
        .replace(/{count}/g, String(memberCount))
        .replace(/{mention}/g, mentionUser(member));

      await ctx.reply(text, { parse_mode: 'HTML' });
    }
  });

  bot.on(':left_chat_member', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
    if (!config.goodbye_message) return;

    const member = ctx.message!.left_chat_member!;
    if (member.is_bot) return;

    const text = config.goodbye_message
      .replace(/{name}/g, member.first_name)
      .replace(/{username}/g, member.username ? `@${member.username}` : member.first_name)
      .replace(/{group}/g, ctx.chat.title || '');

    await ctx.reply(text, { parse_mode: 'HTML' });
  });

  bot.command('setwelcome', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim();
    if (!text) {
      await ctx.reply(
        'Usage: /setwelcome <message>\n\n' +
        'Variables: {name}, {username}, {group}, {count}, {mention}',
      );
      return;
    }
    const { updateTelegramConfig } = await import('../utils/db');
    await updateTelegramConfig(sessionId, { welcome_message: text });
    await ctx.reply('✅ Welcome message updated.');
  });

  bot.command('setgoodbye', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim();
    if (!text) {
      await ctx.reply(
        'Usage: /setgoodbye <message>\n\n' +
        'Variables: {name}, {username}, {group}',
      );
      return;
    }
    const { updateTelegramConfig } = await import('../utils/db');
    await updateTelegramConfig(sessionId, { goodbye_message: text });
    await ctx.reply('✅ Goodbye message updated.');
  });
}
