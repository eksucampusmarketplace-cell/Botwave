/**
 * AI Handler for Telegram Bot
 *
 * Delegates to lib/ai-provider#callAI, which handles Groq key rotation
 * (comma-separated GROQ_API_KEY) and the AI_ALLOW_GEMINI_FALLBACK toggle.
 * Keeps every AI path on the same rotation so a single rate-limited key
 * never silently kills the Telegram /ai command.
 */

import { callAI } from '../../../../lib/ai-provider';

export async function getAIResponse(
  sessionId: string,
  question: string,
  userName: string,
): Promise<string> {
  try {
    return await callAI({
      prompt: `User "${userName}" asks: ${question}`,
      maxTokens: 1024,
      temperature: 0.7,
      systemPrompt:
        'You are Botwave, a friendly and helpful Telegram bot assistant. ' +
        'Reply in a natural, concise, and helpful way. Use emojis sparingly. ' +
        'Keep responses under 500 words unless the question requires more detail.',
    });
  } catch (err) {
    console.error(`[AI:${sessionId}] Error:`, err);
    return 'AI is temporarily unavailable. Please try again.';
  }
}
