/**
 * Feature Requests - shared logic for submitting and processing feature suggestions.
 *
 * Users submit ideas via Telegram, WhatsApp, or web.
 * Groq processes them automatically (no approval needed).
 * Admin views AI responses in the dashboard.
 */

import { callAI, AIRateLimitError, AIQuotaExhaustedError } from './ai-provider';

export interface FeatureRequest {
  id: string;
  user_identifier: string;
  platform: 'telegram' | 'whatsapp' | 'web';
  description: string;
  ai_response: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review';
  created_at: string;
  processed_at: string | null;
  updated_at: string;
}

const FEATURE_SYSTEM_PROMPT = `You are the BotWave Feature Analyst. A user has submitted a feature request for BotWave, a WhatsApp/Telegram bot automation SaaS platform.

Your job:
1. Analyze the request for feasibility and clarity.
2. Provide a structured response with:
   - **Summary**: One-line summary of what the user wants.
   - **Feasibility**: Rate as Easy / Medium / Hard / Needs Clarification.
   - **Implementation Notes**: Brief technical approach (which files/modules would change, estimated effort).
   - **Priority Suggestion**: Low / Medium / High based on user impact.
   - **Questions** (if any): What clarification would help.

Keep it concise and actionable. The admin will read this to decide whether to implement.
Do NOT generate code — just analyze and advise.`;

/**
 * Process a feature request using AI.
 * Returns the AI analysis text, or null if all providers are exhausted.
 */
export async function processFeatureRequest(description: string): Promise<string | null> {
  try {
    const response = await callAI({
      prompt: `Feature Request:\n\n${description}`,
      systemPrompt: FEATURE_SYSTEM_PROMPT,
      maxTokens: 1500,
      temperature: 0.4,
    });
    return response || null;
  } catch (err: unknown) {
    if (err instanceof AIRateLimitError || err instanceof AIQuotaExhaustedError) {
      console.warn(`[FeatureReq] AI rate-limited, will retry later: ${(err as Error).message}`);
      return null;
    }
    console.error(`[FeatureReq] AI processing failed:`, err);
    return null;
  }
}
