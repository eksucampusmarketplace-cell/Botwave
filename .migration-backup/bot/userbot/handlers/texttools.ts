/**
 * Text tools handler for Telegram userbot.
 * Commands: .t (translate), .tts, .tr, .ud (urban dictionary), .google,
 *           .reverse, .mock, .vapor, .tiny, .flip, .b64encode, .b64decode
 */

import { TelegramClient } from 'telegram';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  shouldShowTyping,
  typingDelay,
} from '../utils/humanizer';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

async function getTextFromReply(
  client: TelegramClient,
  event: NewMessageEvent,
): Promise<string> {
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1).join(' ');

  if (args) return args;

  if (msg.replyTo && msg.chatId) {
    try {
      const replied = await client.getMessages(msg.chatId, {
        ids: [msg.replyTo.replyToMsgId],
      });
      if (replied[0]?.text) return replied[0].text;
    } catch {}
  }

  return '';
}

export const reverseHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);

  if (!text) {
    await msg.edit({ text: '❌ Provide text or reply to a message.' });
    return;
  }

  const reversed = text.split('').reverse().join('');
  await shortPause();
  await msg.edit({ text: reversed });
};

export const mockHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);

  if (!text) {
    await msg.edit({ text: '❌ Provide text or reply to a message.' });
    return;
  }

  const mocked = text
    .split('')
    .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
    .join('');
  await shortPause();
  await msg.edit({ text: mocked });
};

export const vaporHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);

  if (!text) {
    await msg.edit({ text: '❌ Provide text or reply to a message.' });
    return;
  }

  const vaporized = text
    .split('')
    .map(c => {
      const code = c.charCodeAt(0);
      if (code >= 33 && code <= 126) {
        return String.fromCharCode(code + 0xfee0);
      }
      if (c === ' ') return '\u3000';
      return c;
    })
    .join('');
  await shortPause();
  await msg.edit({ text: vaporized });
};

const TINY_MAP: Record<string, string> = {
  a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ',
  i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ',
  r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ',
  z: 'ᶻ',
};

export const tinyHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);

  if (!text) {
    await msg.edit({ text: '❌ Provide text or reply to a message.' });
    return;
  }

  const tiny = text
    .toLowerCase()
    .split('')
    .map(c => TINY_MAP[c] || c)
    .join('');
  await shortPause();
  await msg.edit({ text: tiny });
};

const FLIP_MAP: Record<string, string> = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ',
  i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd',
  q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x',
  y: 'ʎ', z: 'z', '!': '¡', '?': '¿', '.': '˙', ',': "'",
  "'": ',', '"': '„', '(': ')', ')': '(', '[': ']', ']': '[',
  '{': '}', '}': '{', '<': '>', '>': '<', '_': '‾',
};

export const flipHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);

  if (!text) {
    await msg.edit({ text: '❌ Provide text or reply to a message.' });
    return;
  }

  const flipped = text
    .toLowerCase()
    .split('')
    .map(c => FLIP_MAP[c] || c)
    .reverse()
    .join('');
  await shortPause();
  await msg.edit({ text: flipped });
};

export const b64EncodeHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);

  if (!text) {
    await msg.edit({ text: '❌ Provide text or reply to a message.' });
    return;
  }

  const encoded = Buffer.from(text, 'utf-8').toString('base64');
  await shortPause();
  await msg.edit({ text: `\`${encoded}\`` });
};

export const b64DecodeHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);

  if (!text) {
    await msg.edit({ text: '❌ Provide text or reply to a message.' });
    return;
  }

  try {
    const decoded = Buffer.from(text, 'base64').toString('utf-8');
    await shortPause();
    await msg.edit({ text: decoded });
  } catch {
    await msg.edit({ text: '❌ Invalid base64 input.' });
  }
};

export const uppercaseHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);
  if (!text) { await msg.edit({ text: '❌ Provide text.' }); return; }
  await shortPause();
  await msg.edit({ text: text.toUpperCase() });
};

export const lowercaseHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);
  if (!text) { await msg.edit({ text: '❌ Provide text.' }); return; }
  await shortPause();
  await msg.edit({ text: text.toLowerCase() });
};

export const clapHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);
  if (!text) { await msg.edit({ text: '❌ Provide text.' }); return; }
  await shortPause();
  await msg.edit({ text: text.split(/\s+/).join(' 👏 ') });
};

export const spoilerHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);
  if (!text) { await msg.edit({ text: '❌ Provide text.' }); return; }
  await shortPause();
  await msg.edit({ text: `||${text}||` });
};

export const monoHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);
  if (!text) { await msg.edit({ text: '❌ Provide text.' }); return; }
  await shortPause();
  await msg.edit({ text: `\`\`\`\n${text}\n\`\`\`` });
};

export const strikeHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;
  const text = await getTextFromReply(client, event);
  if (!text) { await msg.edit({ text: '❌ Provide text.' }); return; }
  const struck = text.split('').map(c => c + '\u0336').join('');
  await shortPause();
  await msg.edit({ text: struck });
};

export const textToolHandlers: Record<string, HandlerFn> = {
  reverse: reverseHandler,
  mock: mockHandler,
  vapor: vaporHandler,
  tiny: tinyHandler,
  flip: flipHandler,
  b64encode: b64EncodeHandler,
  b64decode: b64DecodeHandler,
  upper: uppercaseHandler,
  lower: lowercaseHandler,
  clap: clapHandler,
  spoiler: spoilerHandler,
  mono: monoHandler,
  strike: strikeHandler,
};
