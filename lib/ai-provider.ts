/**
 * AI Provider — Gemini with smart key rotation + Groq fallback.
 *
 * Reads GEMINI_API_KEY_1, GEMINI_API_KEY_2, … from env.
 * When a key hits a rate limit (429), it is cooldown-locked and the next key
 * is tried automatically. Falls back to Groq (user BYOK key or GROQ_API_KEY)
 * if all Gemini keys are exhausted.
 */

interface GeminiKey {
  key: string;
  cooldownUntil: number;
}

let geminiKeys: GeminiKey[] | null = null;
let currentKeyIndex = 0;

function loadGeminiKeys(): GeminiKey[] {
  if (geminiKeys) return geminiKeys;

  const keys: GeminiKey[] = [];
  for (let i = 1; i <= 20; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) keys.push({ key, cooldownUntil: 0 });
  }
  geminiKeys = keys;
  return keys;
}

function getNextAvailableKey(): GeminiKey | null {
  const keys = loadGeminiKeys();
  if (keys.length === 0) return null;

  const now = Date.now();
  for (let i = 0; i < keys.length; i++) {
    const idx = (currentKeyIndex + i) % keys.length;
    if (keys[idx].cooldownUntil <= now) {
      currentKeyIndex = (idx + 1) % keys.length;
      return keys[idx];
    }
  }
  return null;
}

function markKeyCooldown(geminiKey: GeminiKey, retryAfterMs = 60_000) {
  geminiKey.cooldownUntil = Date.now() + retryAfterMs;
}

async function callGemini(apiKey: string, prompt: string, maxTokens = 8000): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const cooldownMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
    throw Object.assign(new Error('Gemini rate limited'), { status: 429, cooldownMs });
  }

  if (!res.ok) {
    const errText = await res.text();
    throw Object.assign(new Error(`Gemini API error (${res.status}): ${errText}`), { status: res.status });
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callGroq(apiKey: string, prompt: string, maxTokens = 8000): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export interface AICallOptions {
  prompt: string;
  maxTokens?: number;
  groqFallbackKey?: string | null;
}

/**
 * Call AI with automatic Gemini key rotation and optional Groq fallback.
 * Tries all available Gemini keys first, then falls back to Groq if provided.
 */
export async function callAI({ prompt, maxTokens = 8000, groqFallbackKey }: AICallOptions): Promise<string> {
  const keys = loadGeminiKeys();

  // Try each available Gemini key
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const geminiKey = getNextAvailableKey();
    if (!geminiKey) break;

    try {
      return await callGemini(geminiKey.key, prompt, maxTokens);
    } catch (err: unknown) {
      const error = err as Error & { status?: number; cooldownMs?: number };
      if (error.status === 429) {
        markKeyCooldown(geminiKey, error.cooldownMs || 60_000);
        console.warn(`[AI] Gemini key rotated (rate limited), trying next...`);
        continue;
      }
      console.error(`[AI] Gemini error:`, error.message);
      break;
    }
  }

  // Fallback to Groq
  const groqKey = groqFallbackKey || process.env.GROQ_API_KEY;
  if (groqKey) {
    console.log('[AI] Falling back to Groq');
    return await callGroq(groqKey, prompt, maxTokens);
  }

  throw new Error('No AI provider available. Set GEMINI_API_KEY_1 or GROQ_API_KEY in environment variables.');
}

/**
 * Check which AI providers are configured.
 */
export function getAIProviderStatus(): { geminiKeys: number; hasGroq: boolean } {
  const keys = loadGeminiKeys();
  return {
    geminiKeys: keys.length,
    hasGroq: !!process.env.GROQ_API_KEY,
  };
}
