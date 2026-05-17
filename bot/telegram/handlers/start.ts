/**
 * /start and /help command handlers.
 * All text is editable via per-session config.
 */

import { Bot } from 'grammy';
import { getTelegramConfig } from '../utils/db';

const DEFAULT_START_TEXT =
  `👋 <b>Welcome to Botwave!</b>\n\n` +
  `I'm your Telegram group management bot.\n\n` +
  `<b>Getting started:</b>\n` +
  `1. Add me to your group\n` +
  `2. Make me an admin\n` +
  `3. Configure me on your Botwave dashboard\n\n` +
  `Use /help to see all commands.`;

const DEFAULT_HELP_TEXT =
  `<b>⚡ Botwave Commands</b>\n\n` +
  `<b>Moderation</b>\n` +
  `/ban /unban /tban\n` +
  `/mute /unmute /tmute\n` +
  `/kick /warn /unwarn /warns /resetwarns\n` +
  `/purge /del\n\n` +
  `<b>Group</b>\n` +
  `/rules /setrules\n` +
  `/pin /unpin\n` +
  `/admins /id /info\n\n` +
  `<b>Notes</b>\n` +
  `/savenote /note /delnote /notes\n\n` +
  `<b>Filters</b>\n` +
  `/addfilter /delfilter /filters\n\n` +
  `<b>Fun</b>\n` +
  `/joke /quote /dice /coin /8ball\n` +
  `/afk /back /choose /roll\n\n` +
  `<b>Games</b>\n` +
  `/games — Open mini app games\n\n` +
  `<b>XP</b>\n` +
  `/xp /leaderboard\n\n` +
  `⚙️ Configure everything at botwave.online`;

export function registerStartHandlers(bot: Bot, sessionId: string): void {
  bot.command('start', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
    if (ctx.chat.type === 'private') {
      const text = config.start_text || DEFAULT_START_TEXT;
      await ctx.reply(text, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`👋 Hi! Use /help to see available commands.`);
    }
  });

  bot.command('help', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
    const text = config.help_text || DEFAULT_HELP_TEXT;
    await ctx.reply(text, { parse_mode: 'HTML' });
  });
}
