/**
 * AI Provider - Multi-provider with Groq (primary) and Gemini (fallback).
 *
 * Provider priority: Groq → Gemini
 *
 * GROQ_API_KEY - free, no billing needed, 30 req/min.
 * GEMINI_API_KEY - supports comma-separated keys for rotation.
 *
 * When a key hits a rate limit (429), it is cooldown-locked and the next
 * provider/key is tried automatically.
 */

export class AIQuotaExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIQuotaExhaustedError';
  }
}

export class AIRateLimitError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'AIRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

// ─── Groq Provider (multi-key rotation) ─────────────────────────────────────

const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface GroqKey {
  key: string;
  cooldownUntil: number;
}

let groqKeys: GroqKey[] | null = null;
let groqKeyIndex = 0;

function loadGroqKeys(): GroqKey[] {
  if (groqKeys) return groqKeys;
  const envVal = process.env.GROQ_API_KEY || '';
  const keys: GroqKey[] = [];
  for (const k of envVal.split(',')) {
    const trimmed = k.trim();
    if (trimmed) keys.push({ key: trimmed, cooldownUntil: 0 });
  }
  groqKeys = keys;
  return keys;
}

function getNextAvailableGroqKey(): GroqKey | null {
  const keys = loadGroqKeys();
  if (keys.length === 0) return null;
  const now = Date.now();
  for (let i = 0; i < keys.length; i++) {
    const idx = (groqKeyIndex + i) % keys.length;
    if (keys[idx].cooldownUntil <= now) {
      groqKeyIndex = (idx + 1) % keys.length;
      return keys[idx];
    }
  }
  return null;
}

function markGroqKeyCooldown(gk: GroqKey, cooldownMs = 60_000) {
  gk.cooldownUntil = Date.now() + cooldownMs;
}

function getGroqApiKey(): string | null {
  const gk = getNextAvailableGroqKey();
  return gk?.key || null;
}

function isGroqAvailable(): boolean {
  return !!getNextAvailableGroqKey();
}

async function callGroq(
  apiKey: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
  systemPrompt?: string,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  if (history) {
    for (const h of history) {
      messages.push({ role: h.role, content: h.content });
    }
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const cooldownMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
    throw Object.assign(new AIRateLimitError('Groq rate limited', cooldownMs), { status: 429, cooldownMs });
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data: any = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── Gemini Provider ────────────────────────────────────────────────────────

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

function parseGemini429(body: string): { isQuotaExhausted: boolean; retryAfterMs: number } {
  try {
    const parsed = JSON.parse(body);
    const violations = parsed?.error?.details?.find(
      (d: any) => d['@type']?.includes('QuotaFailure'),
    )?.violations;
    const hasZeroLimit = violations?.some((v: any) =>
      v.quotaMetric?.includes('free_tier') || v.quotaId?.includes('FreeTier'),
    );
    const retryInfo = parsed?.error?.details?.find(
      (d: any) => d['@type']?.includes('RetryInfo'),
    );
    const retryDelaySec = retryInfo?.retryDelay
      ? parseFloat(retryInfo.retryDelay)
      : 60;
    const limitZero = body.includes('limit: 0');
    return {
      isQuotaExhausted: limitZero || (hasZeroLimit ?? false),
      retryAfterMs: retryDelaySec * 1000,
    };
  } catch {
    return { isQuotaExhausted: false, retryAfterMs: 60_000 };
  }
}

async function callGemini(apiKey: string, prompt: string, maxTokens: number, temperature: number, systemPrompt?: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
  }

  if (history) {
    for (const h of history) {
      contents.push({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] });
    }
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
    const errBody = await res.text();
    const { isQuotaExhausted, retryAfterMs } = parseGemini429(errBody);
    if (isQuotaExhausted) {
      throw new AIQuotaExhaustedError(
        'Gemini API quota exhausted (limit: 0). Enable billing on your Google Cloud project to unlock the free usage allowance.',
      );
    }
    const cooldownMs = retryAfterMs || 60_000;
    throw Object.assign(new AIRateLimitError('Gemini rate limited', cooldownMs), { status: 429, cooldownMs });
  }

  if (!res.ok) {
    const errText = await res.text();
    throw Object.assign(new Error(`Gemini API error (${res.status}): ${errText}`), { status: res.status });
  }

  const data: any = await res.json();
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
    const errBody = await res.text();
    const { isQuotaExhausted, retryAfterMs } = parseGemini429(errBody);
    if (isQuotaExhausted) {
      throw new AIQuotaExhaustedError(
        'Gemini API quota exhausted (limit: 0). Enable billing on your Google Cloud project to unlock the free usage allowance.',
      );
    }
    const cooldownMs = retryAfterMs || 60_000;
    throw Object.assign(new AIRateLimitError('Gemini rate limited', cooldownMs), { status: 429, cooldownMs });
  }

  if (!res.ok) {
    const errText = await res.text();
    throw Object.assign(new Error(`Gemini Vision error (${res.status}): ${errText}`), { status: res.status });
  }

  const data: any = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface AICallOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AIVisionOptions {
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  maxTokens?: number;
}

/**
 * Call AI - tries Groq first, then Gemini with key rotation.
 */
export async function callAI({ prompt, maxTokens = 8000, temperature = 0.3, systemPrompt, history }: AICallOptions): Promise<string> {
  const errors: Error[] = [];

  // Try Groq with key rotation
  const allGroqKeys = loadGroqKeys();
  for (let attempt = 0; attempt < allGroqKeys.length; attempt++) {
    const gk = getNextAvailableGroqKey();
    if (!gk) break;
    try {
      return await callGroq(gk.key, prompt, maxTokens, temperature, systemPrompt, history);
    } catch (err: unknown) {
      const error = err as Error & { status?: number; cooldownMs?: number };
      if (error.status === 429) {
        markGroqKeyCooldown(gk, error.cooldownMs || 60_000);
        console.warn(`[AI] Groq key rotated (rate limited), trying next...`);
        continue;
      }
      console.warn(`[AI] Groq failed: ${error.message}, falling back to Gemini...`);
      errors.push(error);
      break;
    }
  }

  // Fallback to Gemini with key rotation
  const keys = loadGeminiKeys();
  if (keys.length > 0) {
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const geminiKey = getNextAvailableKey();
      if (!geminiKey) break;

      try {
        return await callGemini(geminiKey.key, prompt, maxTokens, temperature, systemPrompt, history);
      } catch (err: unknown) {
        if (err instanceof AIQuotaExhaustedError) {
          errors.push(err);
          break;
        }
        const error = err as Error & { status?: number; cooldownMs?: number };
        if (error.status === 429) {
          markKeyCooldown(geminiKey, error.cooldownMs || 60_000);
          console.warn(`[AI] Gemini key rotated (rate limited), trying next...`);
          continue;
        }
        errors.push(error);
        break;
      }
    }
  }

  // No provider worked
  if (allGroqKeys.length === 0 && keys.length === 0) {
    throw new Error('No AI provider available. Set GROQ_API_KEY or GEMINI_API_KEY in environment variables.');
  }

  const lastErr = errors[errors.length - 1];
  if (lastErr instanceof AIQuotaExhaustedError) throw lastErr;
  if (lastErr instanceof AIRateLimitError) throw lastErr;
  throw new AIRateLimitError('All AI providers are rate-limited. Try again in a minute.', 60_000);
}

/**
 * Call AI Vision - tries Groq (Llama vision) first, then Gemini Vision.
 * Note: Groq vision uses llama-4-scout-17b-16e-instruct for image analysis.
 */
export async function callAIVision({ prompt, imageBase64, mimeType = 'image/jpeg', maxTokens = 1000 }: AIVisionOptions): Promise<string> {
  const errors: Error[] = [];

  // Try Groq vision with key rotation
  const allGroqKeysVision = loadGroqKeys();
  for (let attempt = 0; attempt < allGroqKeysVision.length; attempt++) {
    const gk = getNextAvailableGroqKey();
    if (!gk) break;
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gk.key}`,
        },
        body: JSON.stringify({
          model: 'llama-4-scout-17b-16e-instruct',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          }],
          max_tokens: maxTokens,
          temperature: 0.3,
        }),
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        const cooldownMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
        markGroqKeyCooldown(gk, cooldownMs);
        console.warn(`[AI] Groq Vision key rotated (rate limited), trying next...`);
        continue;
      }

      if (res.ok) {
        const data: any = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text) return text;
      }

      const errText = await res.text();
      throw new Error(`Groq Vision error (${res.status}): ${errText}`);
    } catch (err: unknown) {
      const error = err as Error & { status?: number; cooldownMs?: number };
      if (error.status === 429) {
        markGroqKeyCooldown(gk, error.cooldownMs || 60_000);
        continue;
      }
      console.warn(`[AI] Groq Vision failed: ${error.message}, falling back to Gemini Vision...`);
      errors.push(error);
      break;
    }
  }

  // Fallback to Gemini Vision
  const keys = loadGeminiKeys();
  if (keys.length > 0) {
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const geminiKey = getNextAvailableKey();
      if (!geminiKey) break;

      try {
        return await callGeminiVision(geminiKey.key, prompt, imageBase64, mimeType, maxTokens);
      } catch (err: unknown) {
        if (err instanceof AIQuotaExhaustedError) {
          errors.push(err);
          break;
        }
        const error = err as Error & { status?: number; cooldownMs?: number };
        if (error.status === 429) {
          markKeyCooldown(geminiKey, error.cooldownMs || 60_000);
          console.warn(`[AI] Gemini vision key rotated (rate limited), trying next...`);
          continue;
        }
        errors.push(error);
        break;
      }
    }
  }

  if (allGroqKeysVision.length === 0 && keys.length === 0) {
    throw new Error('No AI provider available. Set GROQ_API_KEY or GEMINI_API_KEY in environment variables.');
  }

  const lastErr = errors[errors.length - 1];
  if (lastErr instanceof AIQuotaExhaustedError) throw lastErr;
  if (lastErr instanceof AIRateLimitError) throw lastErr;
  throw new AIRateLimitError('All AI providers are rate-limited. Try again in a minute.', 60_000);
}

/**
 * Check which AI providers are configured.
 */
export function getAIProviderStatus(): { groq: boolean; groqKeys: number; geminiKeys: number } {
  const gKeys = loadGroqKeys();
  const keys = loadGeminiKeys();
  return { groq: gKeys.length > 0, groqKeys: gKeys.length, geminiKeys: keys.length };
}
