// ─── NLP Engine ──────────────────────────────────────────────────────────────
//
// Detects user intent from natural language messages and maps them to bot
// commands.  Designed to NEVER interfere with normal user chat:
//
//   1. In groups: only activates when the bot is explicitly addressed
//      (e.g. "bot, what's the weather" or "@bot tell me a joke")
//   2. In DMs: only activates when the message clearly looks like a
//      request/command directed at the bot (questions, imperatives)
//   3. High confidence threshold — casual chat is ignored
//   4. Gated behind a per-user feature toggle (default OFF)

import { INTENT_MAP, type NLPIntent } from './intentMap';

// ─── Bot-Addressing Detection ────────────────────────────────────────────────

const BOT_PREFIXES = /^(?:bot[,:]?\s+|@bot\s+|hey bot[,:]?\s+|yo bot[,:]?\s+|botwave[,:]?\s+)/i;

/**
 * In groups the user must address the bot explicitly.  Returns the message
 * with the bot prefix stripped, or null if the bot was not addressed.
 */
export function stripBotAddress(text: string, isGroup: boolean): string | null {
  const match = text.match(BOT_PREFIXES);
  if (match) return text.slice(match[0].length).trim();

  // In DMs every message is directed at the bot, but we still need the
  // message to look like a request (handled by isRequestLike below).
  if (!isGroup) return text;

  return null; // group message didn't address the bot
}

// ─── Request-Like Detection ──────────────────────────────────────────────────
//
// Even in DMs we don't want to intercept casual chat ("lol", "ok", "hey").
// A message must look like an actual request or question.

const REQUEST_SIGNALS = [
  /^(?:what|how|who|when|where|why|which|is|are|was|were|do|does|did|can|could|will|would|should) /i,
  /(?:please|pls)\b/i,
  /(?:can you|could you|would you|will you)\b/i,
  /(?:make|create|generate|give|send|show|find|get|tell|play|translate|convert|download|search|remind)\b/i,
  /(?:i want|i need|i'd like)\b/i,
  /\?$/,
];

export function isRequestLike(text: string): boolean {
  return REQUEST_SIGNALS.some((re) => re.test(text));
}

// ─── Intent Matching ─────────────────────────────────────────────────────────

const MIN_CONFIDENCE = 0.8;
const MIN_MESSAGE_LENGTH = 3;
const MAX_MESSAGE_LENGTH = 300;

/**
 * Try to match a natural-language message to a bot command.
 *
 * Returns null when no confident match is found — the message is treated
 * as regular chat and falls through to auto-reply / ignore.
 */
export function matchIntent(
  rawText: string,
  isGroup: boolean,
): NLPIntent | null {
  if (!rawText || rawText.length < MIN_MESSAGE_LENGTH || rawText.length > MAX_MESSAGE_LENGTH) {
    return null;
  }

  // Step 1: check if the user is talking to the bot
  const stripped = stripBotAddress(rawText, isGroup);
  if (stripped === null) return null; // group msg not addressed to bot

  // Step 2: in DMs the message must look like a request
  if (!isGroup && !isRequestLike(stripped)) return null;

  // Step 3: try each intent pattern
  for (const intent of INTENT_MAP) {
    if (intent.confidence < MIN_CONFIDENCE) continue;

    for (const pattern of intent.patterns) {
      const match = stripped.match(pattern);
      if (match) {
        const args = intent.extractArgs ? intent.extractArgs(match, stripped) : [];
        return {
          command: intent.command,
          args,
          confidence: intent.confidence,
        };
      }
    }
  }

  return null;
}
