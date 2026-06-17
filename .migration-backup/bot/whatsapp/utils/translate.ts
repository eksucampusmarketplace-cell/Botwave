import axios from 'axios';

// ─── Smart Email Rotation ────────────────────────────────────────────────────
// MyMemory gives 50,000 words/day per email on the free tier.
// Rotating across multiple emails = multiplied daily quota.
//
// Set MYMEMORY_EMAILS in the environment to a comma-separated list of
// emails. Falls back to the built-in defaults if unset.
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
      console.log(`[TRANSLATE] Loaded ${parsed.length} MyMemory email(s) from MYMEMORY_EMAILS env`);
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
 * Low-level translate using MyMemory with email rotation. Returns the raw
 * response fields needed for the !translate command (translation, detected
 * source language, response status code).
 */
export async function translateRaw(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<{ translated: string; detectedLanguage?: string; status?: number }> {
  const langCode = targetLang === 'pcm' ? 'en' : targetLang;
  const langpair = `${sourceLang}|${langCode}`;
  const email = getNextEmail();
  const response = await axios.get(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}&de=${email}`,
    { timeout: 10000 },
  );
  return {
    translated: response.data?.responseData?.translatedText || '',
    detectedLanguage: response.data?.responseData?.detectedLanguage,
    status: response.data?.responseStatus,
  };
}

/**
 * Translate multiple strings concurrently with a concurrency limit.
 * Much faster than sequential translateText calls for bulk translations.
 * Returns a Map from original text to translated text.
 */
export async function translateBatch(
  texts: string[],
  targetLang: string,
  concurrency: number = 8,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  if (!targetLang || targetLang === 'en' || texts.length === 0) {
    for (const t of texts) results.set(t, t);
    return results;
  }

  // Deduplicate inputs
  const unique = [...new Set(texts)];

  // Process in concurrent batches
  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    const promises = batch.map(async (text) => {
      const translated = await translateText(text, targetLang);
      results.set(text, translated);
    });
    await Promise.all(promises);
  }

  return results;
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
