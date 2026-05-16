import axios from 'axios';

// ─── Smart Email Rotation ────────────────────────────────────────────────────
// Each email gives 50,000 words/day on MyMemory's free tier.
// Rotating across multiple emails = multiplied daily quota.
const API_EMAILS = [
  'eksucampusmarketplace@gmail.com',
  'edwardblake0900@gmail.com',
  'botwave.translate1@gmail.com',
  'botwave.translate2@gmail.com',
  'botwave.translate3@gmail.com',
];
let emailIndex = 0;

function getNextEmail(): string {
  const email = API_EMAILS[emailIndex % API_EMAILS.length];
  emailIndex++;
  return email;
}

// Supported languages with display names
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: 'English',
  fr: 'French (Français)',
  yo: 'Yoruba (Èdè Yorùbá)',
  ha: 'Hausa (Harshen Hausa)',
  ig: 'Igbo (Asụsụ Igbo)',
  pcm: 'Nigerian Pidgin',
  hi: 'Hindi (हिन्दी)',
  zu: 'Zulu (isiZulu)',
  af: 'Afrikaans',
  ar: 'Arabic (العربية)',
  es: 'Spanish (Español)',
  pt: 'Portuguese (Português)',
  de: 'German (Deutsch)',
  sw: 'Swahili (Kiswahili)',
  am: 'Amharic (አማርኛ)',
  zh: 'Chinese (中文)',
  ja: 'Japanese (日本語)',
  ko: 'Korean (한국어)',
  ru: 'Russian (Русский)',
  tr: 'Turkish (Türkçe)',
};

// In-memory cache for translated strings (key: `${lang}:${text}`, value: translated)
const translationCache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(lang: string, text: string): string {
  return `${lang}:${text.slice(0, 200)}`;
}

/**
 * Translate text using MyMemory API (free, same API used by !translate command).
 * Returns original text if translation fails or lang is 'en'.
 */
export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || targetLang === 'en') return text;

  // Check cache
  const cacheKey = getCacheKey(targetLang, text);
  const cached = translationCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.text;
  }

  try {
    // MyMemory supports pcm as 'en' source to pidgin isn't great, map it
    const langCode = targetLang === 'pcm' ? 'en' : targetLang;
    const langpair = `en|${langCode}`;

    // Rotate emails for 50k words/day per email (5 emails = 250k words/day)
    const email = getNextEmail();
    const response = await axios.get(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}&de=${email}`,
      { timeout: 8000 },
    );

    const translated = response.data?.responseData?.translatedText;
    if (!translated || response.data?.responseStatus === 403) {
      return text;
    }

    // Cache result
    translationCache.set(cacheKey, { text: translated, ts: Date.now() });

    // Cleanup old cache entries periodically
    if (translationCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of translationCache) {
        if (now - v.ts > CACHE_TTL_MS) translationCache.delete(k);
      }
    }

    return translated;
  } catch {
    return text;
  }
}

/**
 * Check if a language code is supported.
 */
export function isValidLanguage(code: string): boolean {
  return code.toLowerCase() in SUPPORTED_LANGUAGES;
}

/**
 * Get the display name for a language code.
 */
export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES[code.toLowerCase()] || code;
}
