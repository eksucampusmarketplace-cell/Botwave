/**
 * Channel management handler for Telegram bots.
 * - /announce <message> — sends a message to the configured announcement channel
 * - /setchannel <channel_id> — sets the announcement channel
 * - /channels — lists channels where the bot is admin
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getConfig, updateConfig } from '../utils/db';

export function registerChannelHandlers(bot: Bot, sessionId: string): void {
  // Set announcement channel
  bot.command('setchannel', async (ctx) => {
    if (!ctx.chat || ctx.chat.type === 'private') {
      await ctx.reply('This command can only be used to set a channel for this bot.');
      return;
    }

    const isAdmin = await requireAdmin(ctx);
    if (!isAdmin) return;

    const args = ctx.message?.text?.split(' ').slice(1).join(' ').trim();
    if (!args) {
      await ctx.reply('Usage: /setchannel <channel_id_or_username>\nExample: /setchannel @mychannel or /setchannel -1001234567890');
      return;
    }

    try {
      // Verify we have access to the channel
      const chat = await ctx.api.getChat(args);
      if (chat.type !== 'channel') {
        await ctx.reply('The provided ID/username is not a channel.');
        return;
      }

      await updateConfig(sessionId, { announce_channel_id: chat.id.toString() });
      await ctx.reply(`Announcement channel set to: ${chat.title || args}`);
    } catch (err) {
      await ctx.reply('Could not access that channel. Make sure the bot is an admin there.');
    }
  });

  // Announce to channel
  bot.command('announce', async (ctx) => {
    const isAdmin = await requireAdmin(ctx);
    if (!isAdmin) return;

    const message = ctx.message?.text?.split(' ').slice(1).join(' ').trim();
    if (!message) {
      await ctx.reply('Usage: /announce <message>\nSends the message to the configured announcement channel.');
      return;
    }

    const config = await getConfig(sessionId);
    const channelId = (config as Record<string, unknown>)?.announce_channel_id as string | undefined;

    if (!channelId) {
      await ctx.reply('No announcement channel configured. Use /setchannel first.');
      return;
    }

    try {
      await ctx.api.sendMessage(channelId, message, { parse_mode: 'HTML' });
      await ctx.reply('Announcement sent successfully!');
    } catch (err) {
      console.error(`[TG-CHANNELS] Announce failed for session ${sessionId}:`, err);
      await ctx.reply('Failed to send announcement. Check that the bot is still an admin in the channel.');
    }
  });

  // List channels
  bot.command('channels', async (ctx) => {
    const isAdmin = await requireAdmin(ctx);
    if (!isAdmin) return;

    const config = await getConfig(sessionId);
    const channelId = (config as Record<string, unknown>)?.announce_channel_id as string | undefined;

    let text = '<b>Channel Management</b>\n\n';

    if (channelId) {
      try {
        const chat = await ctx.api.getChat(channelId);
        text += `<b>Announcement Channel:</b> ${chat.title || channelId}\n`;
        text += `<b>ID:</b> <code>${channelId}</code>\n\n`;
      } catch {
        text += `<b>Announcement Channel:</b> ${channelId} (unreachable)\n\n`;
      }
    } else {
      text += 'No announcement channel configured.\n';
      text += 'Use /setchannel to set one.\n\n';
    }

    text += '<b>Commands:</b>\n';
    text += '/setchannel &lt;id&gt; — Set announcement channel\n';
    text += '/announce &lt;text&gt; — Send to announcement channel\n';

    await ctx.reply(text, { parse_mode: 'HTML' });
  });
}
