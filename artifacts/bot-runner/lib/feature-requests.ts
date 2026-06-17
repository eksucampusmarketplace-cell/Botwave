/**
 * Feature request processor — AI-powered suggestion analysis.
 * Sends user feature ideas to Groq for analysis before logging.
 */

import { callAI } from './ai-provider';

export interface FeatureRequestResult {
  summary: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  feasibility: string;
}

export async function processFeatureRequest(text: string): Promise<FeatureRequestResult | null> {
  try {
    const result = await callAI({
      prompt: `Analyze this feature request for a Telegram bot management platform and respond as JSON with keys: summary, category, priority (low/medium/high), feasibility.\n\nRequest: "${text}"`,
      maxTokens: 256,
      temperature: 0.3,
    });
    const json = JSON.parse(result);
    return json as FeatureRequestResult;
  } catch {
    return null;
  }
}
