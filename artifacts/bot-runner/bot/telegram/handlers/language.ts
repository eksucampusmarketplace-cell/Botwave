/**
 * Multi-level language system:
 *   1. Bot-level default (set by bot owner in dashboard)
 *   2. Group-level override (set by group admin via /setlang)
 *   3. User-level preference (set via /mylang for DMs)
 *   4. Auto-detection from group chat, bio, name, admin info
 *
 * All lookups are in-memory via the i18n module - zero DB hits per message.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig } from '../utils/db';
import { escapeHtml } from '../utils/format';
import {
  SUPPORTED_LOCALES,
  isValidLocale,
  setGroupLang,
  setUserLang,
  setBotDefaultLang,
  resolveLocale,
  getGroupLang,
  getUserLang,
  getBotDefaultLang,
  t,
  type SupportedLocale,
} from '../../../lib/i18n';

/** Detect language from Unicode script patterns */
function detectLanguage(text: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  if (/[\u1200-\u137F]/.test(text)) return 'am';
  if (/[àâçéèêëîïôùûüÿœæ]/i.test(text)) return 'fr';
  if (/[äöüß]/i.test(text)) return 'de';
  if (/[ñáéíóúü¡¿]/i.test(text)) return 'es';
  if (/[ãõçáéíóú]/i.test(text)) return 'pt';
  if (/[çğıöşü]/i.test(text)) return 'tr';
  return 'en';
}

/** Track recent messages per chat for auto-detection */
const chatLangSamples = new Map<string, string[]>();
const MAX_SAMPLES = 50;
const AUTO_DETECT_THRESHOLD = 0.6;

function recordSample(chatId: string, text: string): void {
  let samples = chatLangSamples.get(chatId);
  if (!samples) {
    samples = [];
    chatLangSamples.set(chatId, samples);
  }
  samples.push(detectLanguage(text));
  if (samples.length > MAX_SAMPLES) samples.shift();
}

function getDominantLang(chatId: string): string | null {
  const samples = chatLangSamples.get(chatId);
  if (!samples || samples.length < 10) return null;

  const counts: Record<string, number> = {};
  for (const lang of samples) {
    counts[lang] = (counts[lang] || 0) + 1;
  }

  let maxLang = 'en';
  let maxCount = 0;
  for (const [lang, count] of Object.entries(counts)) {
    if (count > maxCount) { maxCount = count; maxLang = lang; }
  }

  if (maxCount / samples.length >= AUTO_DETECT_THRESHOLD && maxLang !== 'en') {
    return maxLang;
  }
  return null;
}

/** Only suggest once per chat */
const suggestedChats = new Set<string>();

export function registerLanguageHandlers(bot: Bot, sessionId: string): void {
  // Load bot default lang from config on startup
  getGroupConfig(sessionId, 'global').then(config => {
    const lang = (config as Record<string, unknown>).bot_language as string;
    if (lang && isValidLocale(lang)) {
      setBotDefaultLang(lang);
    }
  }).catch(() => {});

  // ── /setlang - Group admin sets group language ──
  bot.command('setlang', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const args = (ctx.message?.text || '').split(/\s+/).slice(1);
    const lang = args[0]?.toLowerCase();

    if (!lang) {
      let text = '<b>Available Languages</b>\n\n';
      for (const [code, name] of Object.entries(SUPPORTED_LOCALES)) {
        text += `<code>${code}</code> - ${name}\n`;
      }
      text += '\nUsage: /setlang <code>';
      await ctx.reply(text, { parse_mode: 'HTML' });
      return;
    }

    if (!isValidLocale(lang)) {
      await ctx.reply(`Unknown language: ${escapeHtml(lang)}\nUse /setlang to see available languages.`, { parse_mode: 'HTML' });
      return;
    }

    const chatId = ctx.chat!.id.toString();
    setGroupLang(chatId, lang);
    await updateTelegramConfig(sessionId, { bot_language: lang } as Record<string, unknown>);

    const name = SUPPORTED_LOCALES[lang];
    await ctx.reply(t('lang.set', lang, { lang: name }), { parse_mode: 'HTML' });
  });

  // ── /mylang - User sets personal language preference ──
  bot.command('mylang', async (ctx) => {
    const args = (ctx.message?.text || '').split(/\s+/).slice(1);
    const lang = args[0]?.toLowerCase();

    if (!lang) {
      const userId = ctx.from!.id.toString();
      const current = getUserLang(userId) || resolveLocale(userId, ctx.chat?.id.toString());
      const name = SUPPORTED_LOCALES[current] || 'English';
      await ctx.reply(`Your language: <b>${name}</b> (${current})\n\nUsage: /mylang <code>`, { parse_mode: 'HTML' });
      return;
    }

    if (!isValidLocale(lang)) {
      await ctx.reply(`Unknown language: ${escapeHtml(lang)}\nUse /setlang to see all codes.`, { parse_mode: 'HTML' });
      return;
    }

    const userId = ctx.from!.id.toString();
    setUserLang(userId, lang);
    const locale = resolveLocale(userId, ctx.chat?.id.toString());
    await ctx.reply(t('lang.user_set', locale, { lang: SUPPORTED_LOCALES[lang] }), { parse_mode: 'HTML' });
  });

  // ── /lang - Show current language info ──
  bot.command('lang', async (ctx) => {
    const userId = ctx.from?.id.toString();
    const chatId = ctx.chat?.id.toString();
    const locale = resolveLocale(userId, chatId);
    const name = SUPPORTED_LOCALES[locale] || 'English';

    let text = `<b>Language Info</b>\n\n`;
    text += `Bot default: <b>${SUPPORTED_LOCALES[getBotDefaultLang()]}</b>\n`;
    if (chatId) {
      const gl = getGroupLang(chatId);
      text += `Group: <b>${gl ? SUPPORTED_LOCALES[gl] : 'Not set (using bot default)'}</b>\n`;
    }
    if (userId) {
      const ul = getUserLang(userId);
      text += `Your preference: <b>${ul ? SUPPORTED_LOCALES[ul] : 'Not set'}</b>\n`;
    }
    text += `\nEffective: <b>${name}</b> (${locale})`;
    await ctx.reply(text, { parse_mode: 'HTML' });
  });

  // ── /detectlang - Detect language of text/reply ──
  bot.command('detectlang', async (ctx) => {
    const text = ctx.message?.reply_to_message?.text || (ctx.message?.text || '').split(/\s+/).slice(1).join(' ');
    if (!text) {
      await ctx.reply('Reply to a message or provide text: /detectlang <text>');
      return;
    }
    const detected = detectLanguage(text);
    const name = SUPPORTED_LOCALES[detected as SupportedLocale] || detected;
    const locale = resolveLocale(ctx.from?.id.toString(), ctx.chat?.id.toString());
    await ctx.reply(t('lang.detected', locale, { lang: name }), { parse_mode: 'HTML' });
  });

  // ── Auto-detection middleware - sample group messages ──
  bot.on('message:text', async (ctx, next) => {
    if (ctx.chat?.type === 'private') return next();
    const chatId = ctx.chat!.id.toString();
    const text = ctx.message?.text;

    if (text && text.length > 5 && !text.startsWith('/')) {
      recordSample(chatId, text);

      if (!suggestedChats.has(chatId) && !getGroupLang(chatId)) {
        const dominant = getDominantLang(chatId);
        if (dominant && isValidLocale(dominant)) {
          suggestedChats.add(chatId);
          const name = SUPPORTED_LOCALES[dominant];
          await ctx.reply(
            t('lang.suggest', 'en', { lang: name, code: dominant }),
            { parse_mode: 'HTML' },
          ).catch(() => {});
        }
      }
    }

    return next();
  });

  // ── Auto-detect from new member bio/name ──
  bot.on('chat_member', async (ctx, next) => {
    try {
      const member = ctx.chatMember?.new_chat_member;
      if (!member?.user) return next();

      const chatId = ctx.chat?.id.toString();
      if (!chatId || getGroupLang(chatId)) return next();

      const nameText = [member.user.first_name, member.user.last_name].filter(Boolean).join(' ');
      if (nameText.length > 2) {
        recordSample(chatId, nameText);
      }
    } catch { /* ignore */ }
    return next();
  });
}
