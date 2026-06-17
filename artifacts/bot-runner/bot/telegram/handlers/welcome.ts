/**
 * Welcome and goodbye message handlers.
 * All text is editable via per-session config.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig } from '../utils/db';
import { mentionUser } from '../utils/format';

export function registerWelcomeHandlers(bot: Bot, sessionId: string): void {
  bot.on(':new_chat_members', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!config.welcome_message) return;

    for (const member of ctx.message!.new_chat_members!) {
      if (member.is_bot) continue;

      let memberCount = 0;
      try {
        memberCount = await ctx.api.getChatMemberCount(ctx.chat.id);
      } catch { /* ignore */ }

      const text = config.welcome_message
        .replace(/{name}/g, member.first_name)
        .replace(/{user}/g, member.first_name)
        .replace(/{username}/g, member.username ? `@${member.username}` : member.first_name)
        .replace(/{group}/g, ctx.chat.title || '')
        .replace(/{count}/g, String(memberCount))
        .replace(/{mention}/g, mentionUser(member));

      const imageUrl = (config as Record<string, unknown>).welcome_image_url as string | undefined;
      if (imageUrl) {
        try {
          await ctx.replyWithPhoto(imageUrl, { caption: text, parse_mode: 'HTML' });
        } catch {
          await ctx.reply(text, { parse_mode: 'HTML' });
        }
      } else {
        await ctx.reply(text, { parse_mode: 'HTML' });
      }
    }
  });

  bot.on(':left_chat_member', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!config.goodbye_message) return;

    const member = ctx.message!.left_chat_member!;
    if (member.is_bot) return;

    const text = config.goodbye_message
      .replace(/{name}/g, member.first_name)
      .replace(/{user}/g, member.first_name)
      .replace(/{username}/g, member.username ? `@${member.username}` : member.first_name)
      .replace(/{group}/g, ctx.chat.title || '');

    const goodbyeImgUrl = (config as Record<string, unknown>).goodbye_image_url as string | undefined;
    if (goodbyeImgUrl) {
      try {
        await ctx.replyWithPhoto(goodbyeImgUrl, { caption: text, parse_mode: 'HTML' });
      } catch {
        await ctx.reply(text, { parse_mode: 'HTML' });
      }
    } else {
      await ctx.reply(text, { parse_mode: 'HTML' });
    }
  });

  bot.command('welcome', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!config.welcome_message) {
      await ctx.reply('No welcome message set. Use /setwelcome <message> to set one.');
      return;
    }
    await ctx.reply(
      `👋 <b>Current Welcome Message:</b>\n\n${config.welcome_message}`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('goodbye', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!config.goodbye_message) {
      await ctx.reply('No goodbye message set. Use /setgoodbye <message> to set one.');
      return;
    }
    await ctx.reply(
      `👋 <b>Current Goodbye Message:</b>\n\n${config.goodbye_message}`,
      { parse_mode: 'HTML' },
    );
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
    await updateTelegramConfig(sessionId, { goodbye_message: text });
    await ctx.reply('✅ Goodbye message updated.');
  });

  // /resetwelcome - Reset welcome message to default
  bot.command('resetwelcome', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await updateTelegramConfig(sessionId, { welcome_message: 'Welcome {name} to {group}!' });
    await ctx.reply('✅ Welcome message reset to default.');
  });

  // /resetgoodbye - Reset goodbye message to default
  bot.command('resetgoodbye', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await updateTelegramConfig(sessionId, { goodbye_message: '' });
    await ctx.reply('✅ Goodbye message reset to default.');
  });

  // /cleanwelcome - Auto-delete old welcome messages
  bot.command('cleanwelcome', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { clean_welcome: true } as Record<string, unknown>);
      await ctx.reply('✅ Old welcome messages will be auto-deleted.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { clean_welcome: false } as Record<string, unknown>);
      await ctx.reply('✅ Welcome messages will no longer be auto-deleted.');
    } else {
      await ctx.reply('Usage: /cleanwelcome <yes/no/on/off>');
    }
  });
}
