/**
 * In-memory i18n system for BotWave.
 *
 * All translations are loaded once into memory at startup - no DB/Redis lookups
 * per message. Language resolution order:
 *   1. User-level preference (DM interactions)
 *   2. Group-level setting (per-group override)
 *   3. Bot-level default (set by bot owner in dashboard)
 *   4. Fallback: 'en'
 */

import { translations, type TranslationKey } from './translations';

export type SupportedLocale =
  | 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ar' | 'hi' | 'ru'
  | 'zh' | 'ja' | 'ko' | 'tr' | 'id' | 'it' | 'nl' | 'yo'
  | 'ha' | 'ig' | 'sw' | 'zu' | 'af' | 'am';

export const SUPPORTED_LOCALES: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Espanol',
  fr: 'Francais',
  de: 'Deutsch',
  pt: 'Portugues',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  tr: 'Turkish',
  id: 'Bahasa Indonesia',
  it: 'Italiano',
  nl: 'Nederlands',
  yo: 'Yoruba',
  ha: 'Hausa',
  ig: 'Igbo',
  sw: 'Kiswahili',
  zu: 'isiZulu',
  af: 'Afrikaans',
  am: 'Amharic',
};

/** In-memory cache for group-level language overrides: chatId -> locale */
const groupLangCache = new Map<string, SupportedLocale>();

/** In-memory cache for user-level language preferences: userId -> locale */
const userLangCache = new Map<string, SupportedLocale>();

/** Bot-level default language (set by bot owner) */
let botDefaultLang: SupportedLocale = 'en';

// ── Setters ──────────────────────────────────────────────────────────

export function setBotDefaultLang(lang: SupportedLocale): void {
  botDefaultLang = lang;
}

export function setGroupLang(chatId: string, lang: SupportedLocale): void {
  groupLangCache.set(chatId, lang);
}

export function setUserLang(userId: string, lang: SupportedLocale): void {
  userLangCache.set(userId, lang);
}

export function clearGroupLang(chatId: string): void {
  groupLangCache.delete(chatId);
}

export function clearUserLang(userId: string): void {
  userLangCache.delete(userId);
}

// ── Getters ──────────────────────────────────────────────────────────

export function getGroupLang(chatId: string): SupportedLocale | undefined {
  return groupLangCache.get(chatId);
}

export function getUserLang(userId: string): SupportedLocale | undefined {
  return userLangCache.get(userId);
}

export function getBotDefaultLang(): SupportedLocale {
  return botDefaultLang;
}

// ── Resolution ───────────────────────────────────────────────────────

/**
 * Resolve the effective language for a context.
 * Priority: user > group > bot default > 'en'
 */
export function resolveLocale(
  userId?: string,
  chatId?: string,
): SupportedLocale {
  if (userId) {
    const userLang = userLangCache.get(userId);
    if (userLang) return userLang;
  }
  if (chatId) {
    const groupLang = groupLangCache.get(chatId);
    if (groupLang) return groupLang;
  }
  return botDefaultLang || 'en';
}

// ── Translation ──────────────────────────────────────────────────────

/**
 * Get a translated string. Blazing fast - single Map lookup.
 *
 * @param key - Translation key (e.g. 'welcome.greeting')
 * @param locale - Target locale
 * @param vars - Optional interpolation variables: {user}, {group}, etc.
 */
export function t(
  key: TranslationKey,
  locale: SupportedLocale = 'en',
  vars?: Record<string, string | number>,
): string {
  const langMap = translations[locale] || translations.en;
  let text = langMap[key] || translations.en[key] || key;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return text;
}

/**
 * Shorthand: resolve locale from context and translate.
 */
export function tt(
  key: TranslationKey,
  userId?: string,
  chatId?: string,
  vars?: Record<string, string | number>,
): string {
  const locale = resolveLocale(userId, chatId);
  return t(key, locale, vars);
}

export function isValidLocale(code: string): code is SupportedLocale {
  return code in SUPPORTED_LOCALES;
}

export { type TranslationKey } from './translations';
