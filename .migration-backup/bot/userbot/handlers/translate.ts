/**
 * Translate handler for Telegram userbot.
 * Commands: .tr <lang> <text>, .tr <lang> (reply), .tts <lang> <text>
 * Uses free translation API with humanized delays.
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  mediumPause,
  shouldShowTyping,
  typingDelay,
} from '../utils/humanizer';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

// ─── MyMemory Email Rotation ──────────────────────────────────────────────
// MyMemory's free tier gives 50,000 words/day per email (de= param).
// Without it, anonymous IPs are capped at ~5,000 chars/day and start returning
// 403 / "QUERY LENGTH LIMIT EXCEEDED" once you cross it.
// Set MYMEMORY_EMAILS in the env to a comma-separated list to rotate.
const DEFAULT_API_EMAILS = [
  'eksucampusmarketplace@gmail.com',
  'edwardblake0900@gmail.com',
  'botwave.translate1@gmail.com',
  'botwave.translate2@gmail.com',
  'botwave.translate3@gmail.com',
];

let cachedEmails: string[] | null = null;
function loadEmails(): string[] {
  if (cachedEmails) return cachedEmails;
  const raw = (process.env.MYMEMORY_EMAILS || process.env.MYMEMORY_API_EMAILS || '').trim();
  if (raw) {
    const parsed = raw
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));
    if (parsed.length > 0) {
      cachedEmails = parsed;
      return parsed;
    }
  }
  cachedEmails = DEFAULT_API_EMAILS;
  return cachedEmails;
}

let emailIndex = 0;
function getNextEmail(): string {
  const emails = loadEmails();
  const email = emails[emailIndex % emails.length];
  emailIndex++;
  return email;
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const https = await import('https');
  const encoded = encodeURIComponent(text);
  const email = getNextEmail();
  const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=auto|${targetLang}&de=${encodeURIComponent(email)}`;

  const data = await new Promise<string>((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      res.on('end', () => resolve(body));
      res.on('error', reject);
    }).on('error', reject);
  });

  const result = JSON.parse(data);
  if (result.responseStatus === 403 || result.responseData?.translatedText?.toUpperCase?.().includes('QUERY LENGTH LIMIT')) {
    throw new Error(`MyMemory quota exhausted for ${email}`);
  }
  if (result.responseData?.translatedText) {
    return result.responseData.translatedText;
  }
  throw new Error('Translation failed');
}

export const translateHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;
  const parts = (msg.text || '').split(/\s+/).slice(1);

  if (!parts[0]) {
    await msg.edit({
      text: '❌ Usage: .tr <lang_code> [text]\nOr reply to a message.\nExamples: .tr en, .tr fr Hello world, .tr yo',
    });
    return;
  }

  const targetLang = parts[0].toLowerCase();
  let textToTranslate = parts.slice(1).join(' ');

  if (!textToTranslate && msg.replyTo && msg.chatId) {
    try {
      const replied = await client.getMessages(msg.chatId, {
        ids: [msg.replyTo.replyToMsgId],
      });
      if (replied[0]?.text) textToTranslate = replied[0].text;
    } catch {}
  }

  if (!textToTranslate) {
    await msg.edit({ text: '❌ Provide text or reply to a message.' });
    return;
  }

  await msg.edit({ text: `🌐 Translating to ${targetLang}...` });

  try {
    await mediumPause();
    const translated = await translateText(textToTranslate, targetLang);

    if (shouldShowTyping() && msg.chatId) {
      try {
        const peer = await client.getInputEntity(msg.chatId);
        await client.invoke(
          new Api.messages.SetTyping({
            peer,
            action: new Api.SendMessageTypingAction(),
          }),
        );
        await typingDelay(translated.length);
      } catch {}
    }

    await msg.edit({
      text: `🌐 **Translation** (→ ${targetLang}):\n\n${translated}`,
    });
  } catch {
    await msg.edit({ text: '❌ Translation failed. Check language code.' });
  }
};

const LANG_LIST: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  ar: 'Arabic', hi: 'Hindi', tr: 'Turkish', nl: 'Dutch', pl: 'Polish',
  sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', el: 'Greek',
  he: 'Hebrew', th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay',
  yo: 'Yoruba', ig: 'Igbo', ha: 'Hausa', sw: 'Swahili', zu: 'Zulu',
  am: 'Amharic', uk: 'Ukrainian', cs: 'Czech', ro: 'Romanian', hu: 'Hungarian',
  bg: 'Bulgarian', ca: 'Catalan', hr: 'Croatian', sk: 'Slovak', sl: 'Slovenian',
  sr: 'Serbian', lt: 'Lithuanian', lv: 'Latvian', et: 'Estonian',
  af: 'Afrikaans', bn: 'Bengali', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam',
  mr: 'Marathi', pa: 'Punjabi', ta: 'Tamil', te: 'Telugu', ur: 'Urdu',
};

export const langListHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('message_send');
  const msg = event.message;

  const lines = ['🌐 **Supported Languages**\n'];
  const entries = Object.entries(LANG_LIST);
  for (let i = 0; i < entries.length; i += 3) {
    const row = entries.slice(i, i + 3)
      .map(([code, name]) => `\`${code}\` ${name}`)
      .join(' | ');
    lines.push(row);
  }
  lines.push('\nUsage: .tr <code> <text>');

  await shortPause();
  await msg.edit({ text: lines.join('\n') });
};

export const translateHandlers: Record<string, HandlerFn> = {
  tr: translateHandler,
  translate: translateHandler,
  langs: langListHandler,
};
