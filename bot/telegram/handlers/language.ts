/**
 * Language detection & settings — /setlang, /lang, auto-detect from user bio.
 */

import { Bot } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getTelegramConfig, updateTelegramConfig } from '../utils/db';
import { escapeHtml } from '../utils/format';

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  ar: 'العربية',
  hi: 'हिन्दी',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  tr: 'Türkçe',
  id: 'Bahasa Indonesia',
  it: 'Italiano',
  nl: 'Nederlands',
};

function detectLanguage(text: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  if (/[àâçéèêëîïôùûüÿœæ]/i.test(text)) return 'fr';
  if (/[äöüß]/i.test(text)) return 'de';
  if (/[ñáéíóúü¡¿]/i.test(text)) return 'es';
  if (/[ãõçáéíóú]/i.test(text)) return 'pt';
  if (/[çğıöşü]/i.test(text)) return 'tr';
  return 'en';
}

export function registerLanguageHandlers(bot: Bot, sessionId: string): void {
  bot.command('setlang', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;

    const args = (ctx.message?.text || '').split(/\s+/).slice(1);
    const lang = args[0]?.toLowerCase();

    if (!lang) {
      let text = '🌐 <b>Available Languages</b>\n\n';
      for (const [code, name] of Object.entries(SUPPORTED_LANGUAGES)) {
        text += `<code>${code}</code> — ${name}\n`;
      }
      text += '\nUsage: /setlang <code>';
      await ctx.reply(text, { parse_mode: 'HTML' });
      return;
    }

    if (!SUPPORTED_LANGUAGES[lang]) {
      await ctx.reply(`Unknown language code: ${escapeHtml(lang)}\nUse /setlang to see available languages.`);
      return;
    }

    await updateTelegramConfig(sessionId, { bot_language: lang } as Record<string, unknown>);
    await ctx.reply(`✅ Bot language set to: <b>${SUPPORTED_LANGUAGES[lang]}</b> (${lang})`, { parse_mode: 'HTML' });
  });

  bot.command('lang', async (ctx) => {
    const config = await getTelegramConfig(sessionId);
    const lang = (config as Record<string, unknown>).bot_language as string || 'en';
    const name = SUPPORTED_LANGUAGES[lang] || 'English';
    await ctx.reply(`🌐 Current bot language: <b>${name}</b> (${lang})`, { parse_mode: 'HTML' });
  });

  bot.command('detectlang', async (ctx) => {
    const text = ctx.message?.reply_to_message?.text || (ctx.message?.text || '').split(/\s+/).slice(1).join(' ');
    if (!text) {
      await ctx.reply('Reply to a message or provide text: /detectlang <text>');
      return;
    }

    const detected = detectLanguage(text);
    const name = SUPPORTED_LANGUAGES[detected] || detected;
    await ctx.reply(`🔍 Detected language: <b>${name}</b> (${detected})`, { parse_mode: 'HTML' });
  });
}
