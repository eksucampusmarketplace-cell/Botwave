/**
 * Text utility commands: reverse, mock, morse, uppercase, lowercase, flip, leetspeak.
 */

import { Bot } from 'grammy';
import { escapeHtml } from '../utils/format';

const MORSE_MAP: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', ' ': '/',
};

const MORSE_REVERSE: Record<string, string> = {};
for (const [k, v] of Object.entries(MORSE_MAP)) {
  MORSE_REVERSE[v] = k;
}

const LEET_MAP: Record<string, string> = {
  A: '4', B: '8', E: '3', G: '6', I: '1', L: '|', O: '0', S: '5', T: '7', Z: '2',
};

const FLIP_MAP: Record<string, string> = {
  a: '\u0250', b: 'q', c: '\u0254', d: 'p', e: '\u01DD', f: '\u025F', g: '\u0183',
  h: '\u0265', i: '\u0131', j: '\u027E', k: '\u029E', l: 'l', m: '\u026F', n: 'u',
  o: 'o', p: 'd', q: 'b', r: '\u0279', s: 's', t: '\u0287', u: 'n', v: '\u028C',
  w: '\u028D', x: 'x', y: '\u028E', z: 'z', '!': '\u00A1', '?': '\u00BF',
  '.': '\u02D9', ',': '\u2018', "'": ',',
};

function toMorse(text: string): string {
  return text.toUpperCase().split('').map(c => MORSE_MAP[c] || c).join(' ');
}

function fromMorse(text: string): string {
  return text.split(' ').map(code => {
    if (code === '/') return ' ';
    return MORSE_REVERSE[code] || code;
  }).join('');
}

function mockText(text: string): string {
  return text.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
}

function flipText(text: string): string {
  return text.toLowerCase().split('').reverse().map(c => FLIP_MAP[c] || c).join('');
}

function leetSpeak(text: string): string {
  return text.toUpperCase().split('').map(c => LEET_MAP[c] || c).join('');
}

function vaporwave(text: string): string {
  return text.split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 33 && code <= 126) return String.fromCharCode(code + 0xFEE0);
    if (c === ' ') return '\u3000';
    return c;
  }).join('');
}

export function registerTextToolsHandlers(bot: Bot, _sessionId: string): void {
  bot.command('reverse', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /reverse <text> or reply to a message'); return; }
    await ctx.reply(`🔄 ${escapeHtml(text.split('').reverse().join(''))}`, { parse_mode: 'HTML' });
  });

  bot.command('mock', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /mock <text> or reply to a message'); return; }
    await ctx.reply(`🤪 ${escapeHtml(mockText(text))}`, { parse_mode: 'HTML' });
  });

  bot.command('morse', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /morse <text> or reply to decode'); return; }
    const isMorse = /^[.\-/ ]+$/.test(text.trim());
    if (isMorse) {
      await ctx.reply(`📡 <b>Decoded:</b>\n<code>${escapeHtml(fromMorse(text))}</code>`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`📡 <b>Morse:</b>\n<code>${escapeHtml(toMorse(text))}</code>`, { parse_mode: 'HTML' });
    }
  });

  bot.command('upper', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /upper <text>'); return; }
    await ctx.reply(`🔠 ${escapeHtml(text.toUpperCase())}`, { parse_mode: 'HTML' });
  });

  bot.command('lower', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /lower <text>'); return; }
    await ctx.reply(`🔡 ${escapeHtml(text.toLowerCase())}`, { parse_mode: 'HTML' });
  });

  bot.command('flip', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /flip <text>'); return; }
    await ctx.reply(`🙃 ${escapeHtml(flipText(text))}`, { parse_mode: 'HTML' });
  });

  bot.command('leet', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /leet <text>'); return; }
    await ctx.reply(`💻 ${escapeHtml(leetSpeak(text))}`, { parse_mode: 'HTML' });
  });

  bot.command('vaporwave', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /vaporwave <text>'); return; }
    await ctx.reply(`🌊 ${vaporwave(text)}`);
  });

  bot.command('count', async (ctx) => {
    const text = (ctx.match?.toString() || '').trim() || ctx.message?.reply_to_message?.text;
    if (!text) { await ctx.reply('Usage: /count <text> or reply to a message'); return; }
    const chars = text.length;
    const words = text.split(/\s+/).filter(Boolean).length;
    const lines = text.split('\n').length;
    await ctx.reply(
      `📝 <b>Text Stats</b>\n\nCharacters: ${chars}\nWords: ${words}\nLines: ${lines}`,
      { parse_mode: 'HTML' },
    );
  });
}
