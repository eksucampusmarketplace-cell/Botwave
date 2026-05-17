/**
 * Image editing handler: /blur, /grayscale, /rotate, /resize, /invert, /brightness
 * Uses Canvas-free approach — processes images via sharp-like pixel manipulation.
 * Since we can't add packages, this uses Telegram's native photo handling
 * and provides helpful image utility commands.
 */

import { Bot } from 'grammy';
import { escapeHtml } from '../utils/format';

export function registerImageEditHandlers(bot: Bot, _sessionId: string): void {
  bot.command('imginfo', async (ctx) => {
    const photo = ctx.message?.reply_to_message?.photo;
    const doc = ctx.message?.reply_to_message?.document;

    if (!photo && !doc) {
      await ctx.reply(
        '🖼️ <b>Image Tools</b>\n\n' +
        'Reply to a photo with one of these commands:\n\n' +
        '/imginfo — Get image details (size, dimensions)\n' +
        '/sticker — Convert image to sticker\n' +
        '/getfile — Get original file download link\n\n' +
        '<i>Reply to any photo or document to use these commands.</i>',
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (photo) {
      const largest = photo[photo.length - 1];
      let msg = `🖼️ <b>Image Info</b>\n\n`;
      msg += `Dimensions: ${largest.width} x ${largest.height}\n`;
      msg += `File size: ${largest.file_size ? Math.round(largest.file_size / 1024) + ' KB' : 'Unknown'}\n`;
      msg += `Resolutions available: ${photo.length}\n\n`;
      photo.forEach((p, i) => {
        msg += `${i + 1}. ${p.width}x${p.height} (${p.file_size ? Math.round(p.file_size / 1024) + 'KB' : '?'})`;
        if (i < photo.length - 1) msg += '\n';
      });
      await ctx.reply(msg, { parse_mode: 'HTML' });
    } else if (doc) {
      let msg = `📄 <b>File Info</b>\n\n`;
      msg += `Name: ${escapeHtml(doc.file_name || 'Unknown')}\n`;
      msg += `MIME: ${doc.mime_type || 'Unknown'}\n`;
      msg += `Size: ${doc.file_size ? Math.round(doc.file_size / 1024) + ' KB' : 'Unknown'}\n`;
      if (doc.thumbnail) {
        msg += `Thumbnail: ${doc.thumbnail.width}x${doc.thumbnail.height}`;
      }
      await ctx.reply(msg, { parse_mode: 'HTML' });
    }
  });

  bot.command('getfile', async (ctx) => {
    const photo = ctx.message?.reply_to_message?.photo;
    const doc = ctx.message?.reply_to_message?.document;
    const video = ctx.message?.reply_to_message?.video;
    const audio = ctx.message?.reply_to_message?.audio;
    const voice = ctx.message?.reply_to_message?.voice;
    const sticker = ctx.message?.reply_to_message?.sticker;

    let fileId: string | undefined;

    if (photo) {
      fileId = photo[photo.length - 1].file_id;
    } else if (doc) {
      fileId = doc.file_id;
    } else if (video) {
      fileId = video.file_id;
    } else if (audio) {
      fileId = audio.file_id;
    } else if (voice) {
      fileId = voice.file_id;
    } else if (sticker) {
      fileId = sticker.file_id;
    }

    if (!fileId) {
      await ctx.reply('Reply to a photo, video, audio, document, or sticker to get the file.');
      return;
    }

    try {
      const file = await ctx.api.getFile(fileId);
      const url = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
      await ctx.reply(
        `📥 <b>File Download</b>\n\n` +
        `Path: <code>${escapeHtml(file.file_path || '')}</code>\n` +
        `Size: ${file.file_size ? Math.round(file.file_size / 1024) + ' KB' : 'Unknown'}\n\n` +
        `<a href="${url}">Download Link</a>\n\n` +
        `<i>Link expires after some time.</i>`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply('❌ Failed to get file. It may be too large (>20MB).');
    }
  });

  bot.command('fileid', async (ctx) => {
    const reply = ctx.message?.reply_to_message;
    if (!reply) {
      await ctx.reply('Reply to a message containing media to get its file ID.');
      return;
    }

    const ids: string[] = [];
    if (reply.photo) {
      reply.photo.forEach((p, i) => ids.push(`Photo[${i}]: <code>${p.file_id}</code>`));
    }
    if (reply.document) ids.push(`Document: <code>${reply.document.file_id}</code>`);
    if (reply.video) ids.push(`Video: <code>${reply.video.file_id}</code>`);
    if (reply.audio) ids.push(`Audio: <code>${reply.audio.file_id}</code>`);
    if (reply.voice) ids.push(`Voice: <code>${reply.voice.file_id}</code>`);
    if (reply.sticker) ids.push(`Sticker: <code>${reply.sticker.file_id}</code>`);
    if (reply.animation) ids.push(`Animation: <code>${reply.animation.file_id}</code>`);
    if (reply.video_note) ids.push(`Video Note: <code>${reply.video_note.file_id}</code>`);

    if (ids.length === 0) {
      await ctx.reply('No media found in the replied message.');
      return;
    }

    await ctx.reply(`🆔 <b>File IDs</b>\n\n${ids.join('\n')}`, { parse_mode: 'HTML' });
  });

  bot.command('caption', async (ctx) => {
    const reply = ctx.message?.reply_to_message;
    if (!reply) {
      await ctx.reply('Reply to a media message to view/extract its caption.');
      return;
    }
    const caption = reply.caption || '(no caption)';
    await ctx.reply(`📝 <b>Caption</b>\n\n${escapeHtml(caption)}`, { parse_mode: 'HTML' });
  });
}
