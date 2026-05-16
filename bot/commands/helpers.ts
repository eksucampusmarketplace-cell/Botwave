import { delay } from '../../lib/utils';
import axios from 'axios';
import { downloadMediaMessage as baileysDownloadMedia } from '@whiskeysockets/baileys';
import { getBase64FromMediaMessage } from '../evolutionClient';
import {
  humanSend,
  pickResponse,
  currentTimeStr,
  currentDateStr,
  getTimeTone,
  timeGreeting,
} from '../utils/antiban';
import {
  addMessageJitter,
  getActivityConfig,
  shortenForQuietHours,
} from '../utils/advancedAntiban';
import { shouldShowPromo, getPromoMessage } from '../utils/promo';
import { MessageQueue } from '../utils/MessageQueue';
import { translateText } from '../utils/translate';
import type { MessageContext, TemplateVars } from './registry';

// ─── Per-request Language Context ─────────────────────────────────────────────
// Set by MessageHandler before executing a command, read by sendReply to auto-translate.
const requestLangMap = new Map<string, string>();

// Persistent in-memory fallback: userId -> language code.
// Survives DB/Redis failures within the same bot process lifetime.
const userLangFallback = new Map<string, string>();

export function setUserLangFallback(userId: string, lang: string): void {
  if (lang && lang !== 'en') {
    userLangFallback.set(userId, lang);
  } else {
    userLangFallback.delete(userId);
  }
}

export function getUserLangFallback(userId: string): string | undefined {
  return userLangFallback.get(userId);
}

export function setRequestLanguage(chatJid: string, lang: string): void {
  if (lang && lang !== 'en') {
    requestLangMap.set(chatJid, lang);
  } else {
    requestLangMap.delete(chatJid);
  }
}

export function clearRequestLanguage(chatJid: string): void {
  requestLangMap.delete(chatJid);
}

// ─── Shared Constants ────────────────────────────────────────────────────────

export const botStartTime = Date.now();

// ─── Help Hints ──────────────────────────────────────────────────────────────

export const helpHints: Record<string, string[]> = {
  currency: [
    'hey! for currency conversion do it like this:\n\n!currency 100 USD NGN\n\nor\n!currency 50 EUR GBP\n\njust send it again with the amount and currencies \u{1F642}',
    'ooh you need the amount and currency codes!\n\ntry: *!currency 100 USD NGN*\n\nor: *!currency 1000 NGN USD*\n\nsend it again with those details',
    'currency converter needs 3 things \u2014 amount, from, to\n\nlike: !currency 100 USD NGN\n\ntry again with that format!',
  ],
  weather: [
    'need a city name for weather!\n\ntry: *!weather Lagos* or *!weather London*\n\nsend it again with the city',
    'which city? just add it after the command\n\nlike: *!weather Lagos*\n\ntry again!',
    'hey drop the city name too\n\nexample: *!weather New York*\n\nresend with the city \u{1F324}',
  ],
  define: [
    'what word do you want defined?\n\ntry: *!define serendipity*\n\nsend again with the word!',
    'drop the word after the command\n\nlike: *!define philosophy*\n\ntry again \u{1F4D6}',
  ],
  horoscope: [
    'which zodiac sign?\n\ntry: *!horoscope aries*\n\nor any of: aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces',
    'add your zodiac sign!\n\nlike: *!horoscope leo*\n\ntry again \u{2728}',
  ],
  translate: [
    'need a language code and text!\n\ntry: *!translate es Hello friend*\n\nor: *!translate fr Good morning*\n\nuse 2-letter language codes (es, fr, de, ar, etc.)',
    'format: !translate [lang] [text]\n\nexample: *!translate de I love coding*\n\ntry again!',
  ],
  doc: [
    'need a title and content!\n\ntry: *!doc My Notes | Here is the content*\n\nseparate title and content with |',
    'format: !doc [title] | [content]\n\nexample: *!doc Meeting Notes | Discussed project timeline*\n\ntry again!',
  ],
  download: [
    'need a URL to download!\n\ntry: *!download https://example.com/video*\n\nsend the link after the command',
    'drop the URL after !download\n\nlike: *!download https://youtube.com/...*\n\ntry again!',
  ],
  lyrics: [
    'need a song name!\n\ntry: *!lyrics Shape of You* or *!lyrics Ed Sheeran - Shape of You*\n\nfor best results include the artist too',
    'need a song title\n\nlike: *!lyrics Shape of You*\n\ntry again! \u{1F3B5}',
  ],
};

export function getHelpHint(command: string): string {
  const hints = helpHints[command];
  if (!hints || hints.length === 0) return '';
  return hints[Math.floor(Math.random() * hints.length)];
}

// ─── Send Reply ──────────────────────────────────────────────────────────────

export async function sendReply(
  jid: string,
  content: any,
  sock: any,
  msgKey: any,
  queue?: MessageQueue,
): Promise<void> {
  let processedContent = content;

  // Auto-translate text responses based on user's language preference
  const targetLang = requestLangMap.get(jid);
  if (targetLang && targetLang !== 'en') {
    try {
      if (typeof processedContent === 'string') {
        const translated = await translateText(processedContent, targetLang);
        if (translated !== processedContent) {
          console.log(`[LANG] Translated reply for ${jid} to ${targetLang}`);
        }
        processedContent = translated;
      } else if (processedContent?.text && typeof processedContent.text === 'string') {
        const translated = await translateText(processedContent.text, targetLang);
        processedContent = { ...processedContent, text: translated };
      }
    } catch (err: any) {
      console.error(`[LANG] Translation to ${targetLang} failed for ${jid}:`, err?.message || err);
    }
  }

  if (typeof processedContent === 'string') {
    const config = getActivityConfig();
    if (config.shortenResponses) {
      processedContent = shortenForQuietHours(processedContent);
    }
    processedContent = addMessageJitter(processedContent);
  } else if (processedContent?.text && typeof processedContent.text === 'string') {
    const config = getActivityConfig();
    if (config.shortenResponses) {
      processedContent = { ...processedContent, text: shortenForQuietHours(processedContent.text) };
    }
    processedContent = { ...processedContent, text: addMessageJitter(processedContent.text) };
  }

  // Edit-in-place: if the original message is fromMe (bot owner), edit it
  // with the result text instead of sending a new message. This transforms
  // "!stats" → result seamlessly. For media content or non-fromMe, send new.
  const isTextOnly = typeof processedContent === 'string' ||
    (processedContent && typeof processedContent === 'object' && processedContent.text &&
     !processedContent.image && !processedContent.sticker && !processedContent.video &&
     !processedContent.audio && !processedContent.document);

  if (isTextOnly && msgKey?.fromMe) {
    const textContent = typeof processedContent === 'string'
      ? processedContent
      : processedContent.text;

    await delay(300 + Math.random() * 700);

    try {
      await sock.sendMessage(jid, { text: textContent, edit: msgKey });
      return;
    } catch (editErr: any) {
      console.error(`[EDIT] Edit failed for ${jid}, falling back to normal send:`, editErr?.message || editErr);
    }
  }

  const isAudioContent = processedContent?.audio || processedContent?.mimetype?.includes('audio');
  try {
    await sock.sendPresenceUpdate(isAudioContent ? 'recording' : 'composing', jid);
  } catch { /* non-critical */ }

  if (queue) {
    const messageContent = typeof processedContent === 'string' ? { text: processedContent } : processedContent;
    await queue.enqueue(jid, messageContent);
  } else {
    await humanSend(sock, jid, msgKey, processedContent);
  }

  try {
    await sock.sendPresenceUpdate('paused', jid);
  } catch { /* non-critical */ }
}

// ─── Media Download ──────────────────────────────────────────────────────────

export async function downloadMedia(message: any, sock: any): Promise<Buffer | null> {
  // Primary: Evolution API socket adapter (uses getBase64FromMediaMessage internally)
  try {
    if (typeof (sock as any).downloadMediaMessage === 'function') {
      const buffer = await (sock as any).downloadMediaMessage(message, 'buffer');
      if (buffer && buffer.length > 0) return buffer;
      console.warn('[MEDIA-DL] Evolution API returned empty buffer');
    }
  } catch (e1: any) {
    console.warn('[MEDIA-DL] Evolution API download failed:', e1?.message || e1);
  }

  // Fallback: direct Baileys download (works when using native Baileys connection)
  try {
    const buffer = await baileysDownloadMedia(message, 'buffer', {});
    if (buffer) return Buffer.from(buffer);
    console.warn('[MEDIA-DL] Baileys download returned empty');
  } catch (e2: any) {
    console.warn('[MEDIA-DL] Baileys download failed:', e2?.message || e2);
  }

  // Fallback: Evolution API getBase64FromMediaMessage endpoint
  try {
    const sessionId = (sock as any).sessionId;
    if (sessionId && message?.key && message?.message) {
      const buffer = await getBase64FromMediaMessage(sessionId, message);
      if (buffer && buffer.length > 0) return buffer;
    }
  } catch (e3: any) {
    console.warn('[MEDIA-DL] Evolution getBase64 failed:', e3?.message || e3);
  }

  // Last resort: direct URL download
  try {
    const msg = message?.message;
    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'];
    for (const type of mediaTypes) {
      const mediaMsg = msg?.[type];
      if (mediaMsg?.url && typeof mediaMsg.url === 'string') {
        const res = await axios.get(mediaMsg.url, { responseType: 'arraybuffer', timeout: 15000 });
        return Buffer.from(res.data);
      }
    }
  } catch (e4: any) {
    console.warn('[MEDIA-DL] Direct URL download failed:', e4?.message || e4);
  }

  console.error('[MEDIA-DL] All download methods failed for message', message?.key?.id);
  return null;
}

// ─── Quoted Message Extraction ───────────────────────────────────────────────

export function getQuotedMessage(rawMessage: any): any {
  if (rawMessage?.contextInfo?.quotedMessage) {
    return rawMessage.contextInfo.quotedMessage;
  }
  const msg = rawMessage?.message;
  if (!msg) return null;
  return msg.extendedTextMessage?.contextInfo?.quotedMessage
    || msg.imageMessage?.contextInfo?.quotedMessage
    || msg.videoMessage?.contextInfo?.quotedMessage
    || msg.audioMessage?.contextInfo?.quotedMessage
    || msg.documentMessage?.contextInfo?.quotedMessage
    || msg.stickerMessage?.contextInfo?.quotedMessage
    || msg.contactMessage?.contextInfo?.quotedMessage
    || msg.locationMessage?.contextInfo?.quotedMessage
    || msg.protocolMessage?.contextInfo?.quotedMessage
    || null;
}

// ─── Image Extraction from Context ───────────────────────────────────────────

export async function getImageFromContext(context: MessageContext, sock: any): Promise<Buffer | null> {
  const msg = context.rawMessage?.message;
  if (msg?.imageMessage) {
    return downloadMedia(context.rawMessage, sock);
  }

  const quoted = getQuotedMessage(context.rawMessage);
  if (quoted?.imageMessage) {
    const fakeMsg = { message: quoted, key: context.rawMessage.key };
    return downloadMedia(fakeMsg, sock);
  }

  return null;
}

// ─── Re-exports for convenience ──────────────────────────────────────────────

export { pickResponse, currentTimeStr, currentDateStr, getTimeTone, timeGreeting };
export { shouldShowPromo, getPromoMessage };
export { delay };
export { axios };
