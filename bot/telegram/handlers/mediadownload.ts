/**
 * Media download handler: /download, /ytdl, /igdl, /ttdl
 * Uses free public APIs for extracting media from social platforms.
 */

import { Bot } from 'grammy';
import { escapeHtml } from '../utils/format';
import { getGroupConfig } from '../utils/db';

const URL_REGEX = /https?:\/\/[^\s]+/;

function detectPlatform(url: string): 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'unknown' {
  if (/youtu\.?be|youtube\.com/i.test(url)) return 'youtube';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  return 'unknown';
}

async function fetchMediaInfo(url: string): Promise<{ title: string; downloadUrl?: string; thumbnail?: string; platform: string } | null> {
  const platform = detectPlatform(url);

  try {
    // Use a generic approach via noembed for metadata
    const metaRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    if (metaRes.ok) {
      const meta = await metaRes.json() as Record<string, string>;
      return {
        title: meta.title || 'Unknown',
        thumbnail: meta.thumbnail_url || undefined,
        platform: platform,
      };
    }
  } catch {}

  return { title: 'Media', platform };
}

export function registerMediaDownloadHandlers(bot: Bot, sessionId: string): void {
  const handleDownload = async (ctx: any, urlOverride?: string) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!(config as any).mediadownload_enabled) {
      await ctx.reply('Media downloads are disabled. An admin can enable them from the Mini App.');
      return;
    }

    const text = urlOverride || (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text || '';
    const urlMatch = text.match(URL_REGEX);
    if (!urlMatch) {
      await ctx.reply(
        '📥 <b>Media Download</b>\n\n' +
        'Usage: /download <url>\n\n' +
        'Supported platforms:\n' +
        '• YouTube (/ytdl)\n' +
        '• Instagram (/igdl)\n' +
        '• TikTok (/ttdl)\n' +
        '• Twitter/X\n\n' +
        'Or reply to a message containing a link.',
        { parse_mode: 'HTML' },
      );
      return;
    }

    const url = urlMatch[0];
    const platform = detectPlatform(url);
    const platformEmoji: Record<string, string> = {
      youtube: '🎬',
      instagram: '📸',
      tiktok: '🎵',
      twitter: '🐦',
      unknown: '🔗',
    };

    await ctx.reply(`${platformEmoji[platform]} Fetching media info...`);

    try {
      const info = await fetchMediaInfo(url);
      if (!info) {
        await ctx.reply('❌ Could not fetch media information.');
        return;
      }

      let msg = `${platformEmoji[platform]} <b>${escapeHtml(info.title)}</b>\n\n`;
      msg += `Platform: ${platform.charAt(0).toUpperCase() + platform.slice(1)}\n`;
      msg += `Link: ${escapeHtml(url)}\n\n`;

      if (info.thumbnail) {
        try {
          await ctx.replyWithPhoto(info.thumbnail, {
            caption: `${platformEmoji[platform]} ${info.title}\n\nUse the link above to access the media directly.`,
          });
          return;
        } catch {}
      }

      msg += '<i>Direct download requires a premium API. Use the link to access the media.</i>';
      await ctx.reply(msg, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Failed to process media. The URL may be invalid or the platform may be unsupported.');
    }
  };

  bot.command('download', (ctx) => handleDownload(ctx));
  bot.command('ytdl', (ctx) => handleDownload(ctx));
  bot.command('igdl', (ctx) => handleDownload(ctx));
  bot.command('ttdl', (ctx) => handleDownload(ctx));

  bot.command('mediainfo', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text || '';
    const urlMatch = text.match(URL_REGEX);
    if (!urlMatch) {
      await ctx.reply('Usage: /mediainfo <url>\nGet info about a media link.');
      return;
    }

    const url = urlMatch[0];
    const platform = detectPlatform(url);

    try {
      const info = await fetchMediaInfo(url);
      await ctx.reply(
        `ℹ️ <b>Media Info</b>\n\n` +
        `Title: ${escapeHtml(info?.title || 'Unknown')}\n` +
        `Platform: ${platform}\n` +
        `URL: ${escapeHtml(url)}`,
        { parse_mode: 'HTML' },
      );
    } catch {
      await ctx.reply('❌ Could not fetch media info.');
    }
  });
}
