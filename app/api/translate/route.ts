import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';

// In-memory cache for translations (key: `${lang}:${hash}`, value: translated text)
const translationCache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

const SUPPORTED_LANGS: Record<string, string> = {
  en: 'English', fr: 'French', yo: 'Yoruba', ha: 'Hausa', ig: 'Igbo',
  hi: 'Hindi', ar: 'Arabic', es: 'Spanish', pt: 'Portuguese', de: 'German',
  sw: 'Swahili', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ru: 'Russian',
  tr: 'Turkish', af: 'Afrikaans', zu: 'Zulu', am: 'Amharic', pcm: 'Nigerian Pidgin',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, targetLang, sourceLang } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    if (!targetLang || !SUPPORTED_LANGS[targetLang]) {
      return NextResponse.json({
        error: 'Unsupported target language',
        supported: Object.keys(SUPPORTED_LANGS),
      }, { status: 400 });
    }

    if (targetLang === (sourceLang || 'en')) {
      return NextResponse.json({ translated: text, cached: false });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text too long (max 5000 chars)' }, { status: 400 });
    }

    // Check cache
    const cacheKey = `${targetLang}:${hashText(text)}`;
    const cached = translationCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json({ translated: cached.text, cached: true });
    }

    const srcLangName = SUPPORTED_LANGS[sourceLang || 'en'] || 'English';
    const tgtLangName = SUPPORTED_LANGS[targetLang];

    const translated = await callAI({
      prompt: text,
      systemPrompt: `Translate the following text from ${srcLangName} to ${tgtLangName}. Output ONLY the translation, nothing else. Preserve formatting, line breaks, and markdown.`,
      maxTokens: 4000,
      temperature: 0.2,
    });

    if (translated) {
      translationCache.set(cacheKey, { text: translated, ts: Date.now() });

      // Cleanup old entries
      if (translationCache.size > 1000) {
        const now = Date.now();
        for (const [k, v] of translationCache) {
          if (now - v.ts > CACHE_TTL_MS) translationCache.delete(k);
        }
      }
    }

    return NextResponse.json({
      translated: translated || text,
      cached: false,
      lang: targetLang,
    });
  } catch (error) {
    console.error('[Translate API] Error:', error);
    return NextResponse.json(
      { error: 'Translation failed', translated: null },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    supported: SUPPORTED_LANGS,
    description: 'POST { text, targetLang, sourceLang? } to translate content.',
  });
}
