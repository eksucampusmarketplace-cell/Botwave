import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  de: 'German',
  ar: 'Arabic',
  zh: 'Chinese (Simplified)',
  hi: 'Hindi',
  yo: 'Yoruba',
  ig: 'Igbo',
  ha: 'Hausa',
  sw: 'Swahili',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  tr: 'Turkish',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  vi: 'Vietnamese',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, targetLang, sourceLang } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text too long (max 5000 chars)' }, { status: 400 });
    }

    const target = targetLang && SUPPORTED_LANGUAGES[targetLang] ? targetLang : 'en';
    const targetName = SUPPORTED_LANGUAGES[target];
    const sourceName = sourceLang && SUPPORTED_LANGUAGES[sourceLang]
      ? SUPPORTED_LANGUAGES[sourceLang]
      : null;

    const sourceHint = sourceName ? ` from ${sourceName}` : '';

    const translated = await callAI({
      prompt: `Translate the following text${sourceHint} to ${targetName}. Return ONLY the translated text, nothing else. No explanations, no quotes, no labels.\n\nText:\n${text.trim()}`,
      systemPrompt: 'You are a precise translator. Output only the translated text. Preserve formatting, line breaks, and tone. Do not add any commentary.',
      maxTokens: 2000,
      temperature: 0.2,
    });

    if (!translated) {
      return NextResponse.json(
        { error: 'Translation service temporarily unavailable' },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      original: text.trim(),
      translated: translated.trim(),
      targetLang: target,
      targetLanguage: targetName,
    });
  } catch (error) {
    console.error('[Translate] Error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    languages: SUPPORTED_LANGUAGES,
  });
}
