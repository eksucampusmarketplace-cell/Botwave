/**
 * Translation commands for Telegram bot.
 * /tr, /translate — auto-detect source language, target English (or specified lang).
 * Auto-replies to non-English messages in the support group with a translation.
 */

import { Bot } from 'grammy';
import translate from '@vitalets/google-translate-api';

const SUPPORT_GROUP_ID = '-1003986594255';

// ISO 639-1 language names for display
const LANG_NAMES: Record<string, string> = {
  af: 'Afrikaans', am: 'Amharic', ar: 'Arabic', az: 'Azerbaijani', be: 'Belarusian',
  bg: 'Bulgarian', bn: 'Bengali', bs: 'Bosnian', ca: 'Catalan', ceb: 'Cebuano',
  co: 'Corsican', cs: 'Czech', cy: 'Welsh', da: 'Danish', de: 'German', el: 'Greek',
  en: 'English', eo: 'Esperanto', es: 'Spanish', et: 'Estonian', eu: 'Basque',
  fa: 'Persian', fi: 'Finnish', fr: 'French', fy: 'Frisian', ga: 'Irish', gd: 'Scots Gaelic',
  gl: 'Galician', gu: 'Gujarati', ha: 'Hausa', haw: 'Hawaiian', he: 'Hebrew', hi: 'Hindi',
  hmn: 'Hmong', hr: 'Croatian', ht: 'Haitian Creole', hu: 'Hungarian', hy: 'Armenian',
  id: 'Indonesian', ig: 'Igbo', is: 'Icelandic', it: 'Italian', iw: 'Hebrew', ja: 'Japanese',
  jw: 'Javanese', ka: 'Georgian', kk: 'Kazakh', km: 'Khmer', kn: 'Kannada', ko: 'Korean',
  ku: 'Kurdish', ky: 'Kyrgyz', la: 'Latin', lb: 'Luxembourgish', lo: 'Lao', lt: 'Lithuanian',
  lv: 'Latvian', mg: 'Malagasy', mi: 'Maori', mk: 'Macedonian', ml: 'Malayalam',
  mn: 'Mongolian', mr: 'Marathi', ms: 'Malay', mt: 'Maltese', my: 'Myanmar', ne: 'Nepali',
  nl: 'Dutch', no: 'Norwegian', ny: 'Chichewa', or: 'Odia', pa: 'Punjabi', pl: 'Polish',
  ps: 'Pashto', pt: 'Portuguese', ro: 'Romanian', ru: 'Russian', rw: 'Kinyarwanda',
  sd: 'Sindhi', si: 'Sinhala', sk: 'Slovak', sl: 'Slovenian', sm: 'Samoan', sn: 'Shona',
  so: 'Somali', sq: 'Albanian', sr: 'Serbian', st: 'Sesotho', su: 'Sundanese', sv: 'Swedish',
  sw: 'Swahili', ta: 'Tamil', te: 'Telugu', tg: 'Tajik', th: 'Thai', tl: 'Filipino',
  tr: 'Turkish', tt: 'Tatar', ug: 'Uyghur', uk: 'Ukrainian', ur: 'Urdu', uz: 'Uzbek',
  vi: 'Vietnamese', xh: 'Xhosa', yi: 'Yiddish', yo: 'Yoruba', zh: 'Chinese',
  'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)', zu: 'Zulu',
};

function langName(iso: string): string {
  return LANG_NAMES[iso] || iso;
}

export function registerTranslateHandlers(bot: Bot, _sessionId: string): void {
  // /tr [lang] <text> or /translate [lang] <text>
  // If first arg is a 2-3 letter lang code, use it as target. Otherwise default to 'en'.
  bot.command(['tr', 'translate'], async (ctx) => {
    let text = ctx.match?.toString().trim() || '';

    // Also support replying to a message
    if (!text && ctx.message?.reply_to_message?.text) {
      text = ctx.message.reply_to_message.text;
    }

    if (!text) {
      await ctx.reply(
        '<b>Usage:</b>\n' +
        '<code>/tr hello world</code> \u2014 translate to English\n' +
        '<code>/tr es hello world</code> \u2014 translate to Spanish\n' +
        'Or reply to a message with <code>/tr</code>',
        { parse_mode: 'HTML' },
      );
      return;
    }

    // Check if first word is a language code
    const parts = text.split(/\s+/);
    let targetLang = 'en';
    if (parts.length > 1 && parts[0].length <= 5 && LANG_NAMES[parts[0].toLowerCase()]) {
      targetLang = parts[0].toLowerCase();
      text = parts.slice(1).join(' ');
    }

    try {
      const res = await translate(text, { to: targetLang });
      const srcLang = res.from.language.iso || 'auto';
      await ctx.reply(
        `\u{1F30D} <b>${langName(srcLang)}</b> \u2192 <b>${langName(targetLang)}</b>\n\n` +
        `${res.text}`,
        { parse_mode: 'HTML' },
      );
    } catch (err) {
      console.error('[TRANSLATE] Error:', err);
      await ctx.reply('\u274C Translation failed. Try a shorter text or check the language code.');
    }
  });

  // Auto-translate non-English messages in the support group
  bot.on('message:text', async (ctx, next) => {
    const chatId = ctx.chat.id.toString();
    // Only auto-translate in the support group
    if (chatId !== SUPPORT_GROUP_ID && chatId !== SUPPORT_GROUP_ID.replace('-100', '')) {
      await next();
      return;
    }

    const text = ctx.message.text || '';
    // Skip short messages, commands, URLs
    if (text.length < 15 || text.startsWith('/') || text.startsWith('!') || /^https?:\/\//.test(text)) {
      await next();
      return;
    }

    // Quick heuristic: if the text is mostly ASCII, it's likely English
    const nonAscii = text.replace(/[\x00-\x7F]/g, '').length;
    const ratio = nonAscii / text.length;
    if (ratio < 0.3) {
      await next();
      return;
    }

    // Auto-translate
    try {
      const res = await translate(text, { to: 'en' });
      const srcLang = res.from.language.iso || 'auto';
      // Don't re-translate English
      if (srcLang === 'en') { await next(); return; }

      await ctx.reply(
        `\u{1F30D} <b>Auto-translation (${langName(srcLang)} \u2192 English):</b>\n` +
        `${res.text}\n\n` +
        `<i>Please use English in this group for better support. You can also use /tr to translate.</i>`,
        { parse_mode: 'HTML', reply_parameters: { message_id: ctx.message.message_id } },
      );
    } catch {
      // Silently fail - translation is a courtesy, not critical
    }

    await next();
  });
}
