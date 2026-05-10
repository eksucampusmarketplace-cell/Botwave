/**
 * AI Provider — Google Gemini with smart key rotation.
 *
 * Reads GEMINI_API_KEY from env — supports comma-separated keys for rotation.
 * Example: GEMINI_API_KEY=key1,key2,key3
 * When a key hits a rate limit (429), it is cooldown-locked and the next key
 * is tried automatically.
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
  const envVal = process.env.GEMINI_API_KEY || '';
  if (envVal) {
    for (const k of envVal.split(',')) {
      const trimmed = k.trim();
      if (trimmed) keys.push({ key: trimmed, cooldownUntil: 0 });
    }
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

async function callGemini(apiKey: string, prompt: string, maxTokens: number, temperature: number, systemPrompt?: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
  }

  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature,
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

async function callGeminiVision(apiKey: string, prompt: string, imageBase64: string, mimeType: string, maxTokens: number): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      }],
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
    throw Object.assign(new Error(`Gemini Vision error (${res.status}): ${errText}`), { status: res.status });
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export interface AICallOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIVisionOptions {
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  maxTokens?: number;
}

/**
 * Call AI with automatic Gemini key rotation.
 */
export async function callAI({ prompt, maxTokens = 8000, temperature = 0.3, systemPrompt }: AICallOptions): Promise<string> {
  const keys = loadGeminiKeys();

  if (keys.length === 0) {
    throw new Error('No AI provider available. Set GEMINI_API_KEY in environment variables.');
  }

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const geminiKey = getNextAvailableKey();
    if (!geminiKey) {
      throw new Error('All Gemini API keys are rate-limited. Try again in a minute or add more keys.');
    }

    try {
      return await callGemini(geminiKey.key, prompt, maxTokens, temperature, systemPrompt);
    } catch (err: unknown) {
      const error = err as Error & { status?: number; cooldownMs?: number };
      if (error.status === 429) {
        markKeyCooldown(geminiKey, error.cooldownMs || 60_000);
        console.warn(`[AI] Gemini key rotated (rate limited), trying next...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('All Gemini API keys are rate-limited. Try again in a minute or add more keys.');
}

/**
 * Call AI Vision (image analysis) with automatic key rotation.
 */
export async function callAIVision({ prompt, imageBase64, mimeType = 'image/jpeg', maxTokens = 1000 }: AIVisionOptions): Promise<string> {
  const keys = loadGeminiKeys();

  if (keys.length === 0) {
    throw new Error('No AI provider available. Set GEMINI_API_KEY in environment variables.');
  }

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const geminiKey = getNextAvailableKey();
    if (!geminiKey) {
      throw new Error('All Gemini API keys are rate-limited. Try again in a minute or add more keys.');
    }

    try {
      return await callGeminiVision(geminiKey.key, prompt, imageBase64, mimeType, maxTokens);
    } catch (err: unknown) {
      const error = err as Error & { status?: number; cooldownMs?: number };
      if (error.status === 429) {
        markKeyCooldown(geminiKey, error.cooldownMs || 60_000);
        console.warn(`[AI] Gemini vision key rotated (rate limited), trying next...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('All Gemini API keys are rate-limited. Try again in a minute or add more keys.');
}

/**
 * Check which AI providers are configured.
 */
export function getAIProviderStatus(): { geminiKeys: number } {
  const keys = loadGeminiKeys();
  return { geminiKeys: keys.length };
}
