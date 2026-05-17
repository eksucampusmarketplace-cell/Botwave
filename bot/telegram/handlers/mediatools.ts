/**
 * Media tools: /qr (generate QR text), /encode, /decode, /charinfo.
 */

import { Bot } from 'grammy';
import { escapeHtml } from '../utils/format';

function textToQRBlock(text: string): string {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
  return url;
}

function getCharInfo(char: string): string {
  const code = char.codePointAt(0);
  if (code === undefined) return '';
  const hex = code.toString(16).toUpperCase().padStart(4, '0');
  const name = `U+${hex}`;
  return `${char} → ${name} (${code})`;
}

export function registerMediaToolsHandlers(bot: Bot, _sessionId: string): void {
  bot.command('qr', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim();
    if (!text) {
      await ctx.reply('Usage: /qr <text or URL>\nGenerates a QR code image.');
      return;
    }
    if (text.length > 500) {
      await ctx.reply('❌ Text too long. Max 500 characters for QR code.');
      return;
    }
    const url = textToQRBlock(text);
    try {
      await ctx.replyWithPhoto(url, {
        caption: `📱 QR Code for: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`,
      });
    } catch {
      await ctx.reply(`📱 QR Code: ${url}`);
    }
  });

  bot.command('charinfo', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) {
      await ctx.reply('Usage: /charinfo <text> or reply to a message\nShows Unicode info for each character.');
      return;
    }
    const chars = [...text].slice(0, 30);
    const info = chars.map(c => getCharInfo(c)).filter(Boolean).join('\n');
    await ctx.reply(
      `🔤 <b>Character Info</b>\n\n<code>${escapeHtml(info)}</code>`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('encode', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim();
    if (!text) { await ctx.reply('Usage: /encode <text>\nURL-encodes the text.'); return; }
    await ctx.reply(`📦 <code>${escapeHtml(encodeURIComponent(text))}</code>`, { parse_mode: 'HTML' });
  });

  bot.command('decode', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim();
    if (!text) { await ctx.reply('Usage: /decode <encoded_text>\nURL-decodes the text.'); return; }
    try {
      const decoded = decodeURIComponent(text);
      await ctx.reply(`📦 <code>${escapeHtml(decoded)}</code>`, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply('❌ Invalid encoded text.');
    }
  });

  bot.command('timestamp', async (ctx) => {
    const arg = (ctx.match?.toString() || '').trim();
    if (arg) {
      const ts = parseInt(arg, 10);
      if (isNaN(ts)) {
        const d = new Date(arg);
        if (isNaN(d.getTime())) {
          await ctx.reply('❌ Invalid date or timestamp.');
          return;
        }
        await ctx.reply(
          `🕐 <b>Timestamp</b>\n\nDate: ${d.toISOString()}\nUnix: <code>${Math.floor(d.getTime() / 1000)}</code>`,
          { parse_mode: 'HTML' },
        );
      } else {
        const d = new Date(ts * 1000);
        await ctx.reply(
          `🕐 <b>Date from Timestamp</b>\n\nUnix: <code>${ts}</code>\nDate: ${d.toISOString()}\nLocal: ${d.toUTCString()}`,
          { parse_mode: 'HTML' },
        );
      }
    } else {
      const now = Math.floor(Date.now() / 1000);
      await ctx.reply(
        `🕐 <b>Current Timestamp</b>\n\nUnix: <code>${now}</code>\nISO: ${new Date().toISOString()}`,
        { parse_mode: 'HTML' },
      );
    }
  });

  bot.command('length', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /length <text> or reply to a message'); return; }
    const bytes = Buffer.byteLength(text, 'utf-8');
    const codePoints = [...text].length;
    await ctx.reply(
      `📏 <b>Length</b>\n\nCharacters: ${text.length}\nCode points: ${codePoints}\nBytes (UTF-8): ${bytes}`,
      { parse_mode: 'HTML' },
    );
  });
}
