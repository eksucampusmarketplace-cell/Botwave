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
//   5. AI fallback for unmatched but clearly bot-directed requests

import { INTENT_MAP, type NLPIntent } from './intentMap';

// ─── Bot-Addressing Detection ────────────────────────────────────────────────

const BOT_PREFIXES = /^(?:bot[,:]?\s+|@bot\s+|hey bot[,:]?\s+|yo bot[,:]?\s+|botwave[,:]?\s+|dear bot[,:]?\s+)/i;

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
  /(?:make|create|generate|give|send|show|find|get|tell|play|translate|convert|download|search|remind|scan|remove|check|open|start)\b/i,
  /(?:i want|i need|i'd like|i wanna|lemme|let me)\b/i,
  /\?$/,
];

// Casual chat patterns that should NEVER trigger NLP
const CASUAL_PATTERNS = [
  /^(?:ok|okay|lol|lmao|haha|hehe|hmm|ah|oh|wow|damn|bruh|nah|yep|yeah|nope|sure|true|same|fr|ong|bet|cap|slay|vibe|mood|lit|fam|bro|sis|g|k|kk|ikr|smh|ngl|tbh|imo|idk|idc|wyd|hbu|nm|gn|gm|sup|hey|hi|hello|bye|later|ttyl|ight|aight)!?$/i,
  /^[\p{Emoji}\s]+$/u,
  /^.{1,2}$/,
];

export function isRequestLike(text: string): boolean {
  if (CASUAL_PATTERNS.some((re) => re.test(text))) return false;
  return REQUEST_SIGNALS.some((re) => re.test(text));
}

// ─── Fuzzy Keyword Matching ──────────────────────────────────────────────────
//
// When regex patterns don't match, try simple keyword-based intent detection
// for common single-word or two-word requests.

const KEYWORD_INTENTS: Record<string, { command: string; args: string[] }> = {
  weather: { command: 'weather', args: [] },
  sticker: { command: 'sticker', args: [] },
  joke: { command: 'joke', args: [] },
  meme: { command: 'meme', args: [] },
  quote: { command: 'quote', args: [] },
  fact: { command: 'fact', args: [] },
  riddle: { command: 'riddle', args: [] },
  fortune: { command: 'fortune', args: [] },
  truth: { command: 'truth', args: [] },
  dare: { command: 'dare', args: [] },
  compliment: { command: 'compliment', args: [] },
  roast: { command: 'roast', args: [] },
  trivia: { command: 'trivia', args: [] },
  quiz: { command: 'trivia', args: [] },
  hangman: { command: 'hangman', args: [] },
  leaderboard: { command: 'leaderboard', args: [] },
  scores: { command: 'leaderboard', args: [] },
  pomodoro: { command: 'pomodoro', args: [] },
  flashcard: { command: 'flashcard', args: [] },
  flashcards: { command: 'flashcard', args: [] },
  help: { command: 'help', args: ['text'] },
  menu: { command: 'help', args: ['text'] },
  commands: { command: 'help', args: ['text'] },
  ping: { command: 'ping', args: [] },
  uptime: { command: 'uptime', args: [] },
  stats: { command: 'stats', args: [] },
  balance: { command: 'balance', args: [] },
  rewards: { command: 'balance', args: [] },
  plan: { command: 'plan', args: [] },
  subscription: { command: 'plan', args: [] },
  study: { command: 'study', args: [] },
  password: { command: 'password', args: [] },
};

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

  // Step 3: try each intent pattern (ordered by confidence)
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

  // Step 4: fuzzy keyword fallback — single words that map directly to commands
  const normalized = stripped.toLowerCase().trim();
  const keywordMatch = KEYWORD_INTENTS[normalized];
  if (keywordMatch) {
    return {
      command: keywordMatch.command,
      args: keywordMatch.args,
      confidence: 0.85,
    };
  }

  // Step 5: lower-confidence AI catch-all for long questions (10+ chars)
  // These need MIN_CONFIDENCE lowered, so check explicitly
  if (stripped.length >= 10) {
    for (const intent of INTENT_MAP) {
      if (intent.confidence >= MIN_CONFIDENCE) continue; // already checked above
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
  }

  return null;
}

// ─── AI Fallback ─────────────────────────────────────────────────────────────
//
// For messages that are clearly directed at the bot but don't match any
// pattern, use the AI to classify the intent. This is more expensive
// (API call) so it's only used as a last resort.

const AI_COMMAND_LIST = [
  'weather', 'joke', 'quote', 'translate', 'define', 'horoscope',
  'img', 'music', 'download', 'sticker', 'help', 'crypto', 'poll',
  'trivia', 'lyrics', 'wiki', 'remind', 'tts', 'qr', 'note',
  'meme', 'fact', 'riddle', 'fortune', '8ball', 'truth', 'dare',
  'compliment', 'roast', 'scan', 'digest', 'calc', 'password',
  'coinflip', 'dice', 'logo', 'doc', 'study', 'pomodoro',
  'flashcard', 'afk', 'wallpaper', 'ocr', 'removebg', 'leaderboard',
  'hangman', 'wordchain', 'balance', 'plan', 'ai',
];

const AI_CLASSIFY_PROMPT = `You are a WhatsApp bot command classifier. Given a user message, determine which bot command they want to execute. 

Available commands: ${AI_COMMAND_LIST.join(', ')}

Rules:
- Respond with ONLY a JSON object: {"command": "name", "args": ["arg1", "arg2"]}
- If the message is NOT a bot request (just casual chat), respond: {"command": "none", "args": []}
- For "ai" command, put the full user question in args
- Be conservative — if unsure, return "none"
- Never classify greetings, reactions, or casual chat as commands`;

/**
 * Use AI to classify a message that didn't match any pattern.
 * Returns null if the AI can't classify it or it's casual chat.
 */
export async function classifyWithAI(
  text: string,
  isGroup: boolean,
): Promise<NLPIntent | null> {
  const stripped = stripBotAddress(text, isGroup);
  if (!stripped) return null;
  if (!isGroup && !isRequestLike(stripped)) return null;

  try {
    const { callAI } = await import('../../lib/ai-provider');
    const response = await callAI({
      prompt: `User message: "${stripped}"\n\nClassify this message.`,
      systemPrompt: AI_CLASSIFY_PROMPT,
      maxTokens: 100,
      temperature: 0.1,
    });

    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.command || parsed.command === 'none') return null;
    if (!AI_COMMAND_LIST.includes(parsed.command)) return null;

    return {
      command: parsed.command,
      args: Array.isArray(parsed.args) ? parsed.args : [],
      confidence: 0.75,
    };
  } catch (err) {
    console.error('[NLP-AI] Classification failed:', err);
    return null;
  }
}
