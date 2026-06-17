/**
 * AI Provider stub for bot-runner.
 * Re-exports the shared AI provider from the botwave frontend lib.
 * In production, GROQ_API_KEY and GEMINI_API_KEY come from Replit Secrets.
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

const GROQ_MODEL = 'llama-3.3-70b-versatile';

export async function callAI({ prompt, maxTokens = 8000, temperature = 0.3, systemPrompt, history }: AICallOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.split(',')[0]?.trim();
  if (!apiKey) throw new AIQuotaExhaustedError('GROQ_API_KEY not set');

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  if (history) messages.push(...history.map(h => ({ role: h.role, content: h.content })));
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: maxTokens, temperature }),
  });

  if (response.status === 429) {
    throw new AIRateLimitError('Rate limited by Groq', 60_000);
  }
  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }
  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? '';
}

export async function callAIVision({ prompt, imageBase64, mimeType = 'image/jpeg', maxTokens = 1000 }: AIVisionOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.split(',')[0]?.trim();
  if (!apiKey) throw new AIQuotaExhaustedError('GROQ_API_KEY not set');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
      ]}],
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) throw new Error(`Groq Vision error: ${response.status}`);
  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? '';
}
