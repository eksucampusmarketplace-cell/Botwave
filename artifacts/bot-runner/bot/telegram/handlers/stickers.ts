/**
 * Sticker management - steal/kang stickers, get sticker info.
 */

import { Bot } from 'grammy';
import { InputFile } from 'grammy';

export function registerStickerHandlers(bot: Bot, sessionId: string): void {
  // /kang - reply to a sticker to steal it to your personal pack
  bot.command('kang', async (ctx) => {
    if (!ctx.from || !ctx.message?.reply_to_message?.sticker) {
      await ctx.reply('Reply to a sticker with /kang to steal it to your personal pack.');
      return;
    }

    const sticker = ctx.message.reply_to_message.sticker;
    const userId = ctx.from.id;
    const botUsername = ctx.me.username;
    const packName = `botwave_${userId}_by_${botUsername}`;
    const packTitle = `${ctx.from.first_name}'s BotWave Pack`;

    try {
      // Get sticker file
      const file = await ctx.api.getFile(sticker.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

      // Download sticker data
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      const inputSticker = {
        sticker: new InputFile(buffer, 'sticker.webp'),
        emoji_list: [sticker.emoji || '😀'],
        format: 'static' as const,
      };

      // Try to add to existing pack first
      try {
        await ctx.api.addStickerToSet(userId, packName, inputSticker);
        await ctx.reply(
          `✅ Sticker added to your pack!\n\n` +
          `<a href="https://t.me/addstickers/${packName}">Open pack</a>`,
          { parse_mode: 'HTML' },
        );
      } catch {
        // Pack doesn't exist, create it
        try {
          await ctx.api.createNewStickerSet(userId, packName, packTitle, [inputSticker]);
          await ctx.reply(
            `✅ New sticker pack created!\n\n` +
            `<a href="https://t.me/addstickers/${packName}">Open pack</a>`,
            { parse_mode: 'HTML' },
          );
        } catch (createErr) {
          await ctx.reply('❌ Failed to create sticker pack. Make sure you\'ve started a DM with the bot first.');
        }
      }
    } catch (err) {
      await ctx.reply('❌ Failed to process sticker.');
    }
  });

  // /stickerinfo - reply to sticker to get info
  bot.command('stickerinfo', async (ctx) => {
    if (!ctx.message?.reply_to_message?.sticker) {
      await ctx.reply('Reply to a sticker with /stickerinfo to get its details.');
      return;
    }

    const s = ctx.message.reply_to_message.sticker;
    await ctx.reply(
      `📋 <b>Sticker Info</b>\n\n` +
      `🎨 Emoji: ${s.emoji || 'N/A'}\n` +
      `📦 Pack: ${s.set_name || 'N/A'}\n` +
      `📐 Size: ${s.width}x${s.height}\n` +
      `🆔 File ID: <code>${s.file_id}</code>\n` +
      `📎 Unique ID: <code>${s.file_unique_id}</code>\n` +
      `🎭 Type: ${s.is_animated ? 'Animated' : s.is_video ? 'Video' : 'Static'}`,
      { parse_mode: 'HTML' },
    );
  });

  // /getsticker - reply to sticker to get it as PNG
  bot.command('getsticker', async (ctx) => {
    if (!ctx.message?.reply_to_message?.sticker) {
      await ctx.reply('Reply to a sticker with /getsticker to get it as a file.');
      return;
    }

    const sticker = ctx.message.reply_to_message.sticker;

    try {
      const file = await ctx.api.getFile(sticker.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      await ctx.replyWithDocument(new InputFile(buffer, `sticker_${sticker.file_unique_id}.webp`), {
        caption: `Sticker from pack: ${sticker.set_name || 'unknown'}`,
      });
    } catch {
      await ctx.reply('❌ Failed to download sticker.');
    }
  });
}
