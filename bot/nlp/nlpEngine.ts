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

export interface NLPContext {
  isReplyToOwner?: boolean;
  mentionsOwner?: boolean;
  ownerName?: string;
}

/**
 * In groups the user must address the bot explicitly via prefix, OR by
 * replying to the owner's message, @mentioning the owner, or using the
 * owner's name. Returns the message with the address stripped, or null
 * if not directed at the bot/owner.
 */
export function stripBotAddress(text: string, isGroup: boolean, nlpCtx?: NLPContext): string | null {
  const match = text.match(BOT_PREFIXES);
  if (match) return text.slice(match[0].length).trim();

  // In DMs every message is directed at the bot
  if (!isGroup) return text;

  // Group: check if directed at the owner via reply, mention, or name
  if (nlpCtx) {
    if (nlpCtx.isReplyToOwner || nlpCtx.mentionsOwner) return text;

    if (nlpCtx.ownerName) {
      const namePattern = new RegExp(`^${nlpCtx.ownerName}[,:]?\\s+`, 'i');
      const nameMatch = text.match(namePattern);
      if (nameMatch) return text.slice(nameMatch[0].length).trim();
      // Also check if name appears anywhere followed by a comma
      const nameInline = new RegExp(`\\b${nlpCtx.ownerName}[,]\\s*`, 'i');
      const inlineMatch = text.match(nameInline);
      if (inlineMatch) return text.replace(inlineMatch[0], '').trim();
    }
  }

  return null; // group message not addressed to bot or owner
}

// ─── Request-Like Detection ──────────────────────────────────────────────────
//
// Even in DMs we don't want to intercept casual chat ("lol", "ok", "hey").
// A message must look like an actual request or question.

const REQUEST_SIGNALS = [
  /^(?:what|how|who|when|where|why|which|is|are|was|were|do|does|did|can|could|will|would|should)(?:'s|'s|s| )/i,
  /(?:please|pls)\b/i,
  /(?:can you|could you|would you|will you)\b/i,
  /(?:make|create|generate|give|send|show|find|get|tell|play|translate|convert|download|search|remind|scan|remove|check|open|start)\b/i,
  /(?:i want|i need|i'd like|i wanna|lemme|let me)\b/i,
  /(?:weather|translate|remind|download|convert|search|define|horoscope|urban|encrypt|decrypt|schedule)\b/i,
  /\?$/,
];

// Casual chat patterns that should NEVER trigger NLP
const CASUAL_PATTERNS = [
  // English casual
  /^(?:ok|okay|lol|lmao|haha|hehe|hmm|ah|oh|wow|damn|bruh|nah|yep|yeah|nope|sure|true|same|fr|ong|bet|cap|slay|vibe|mood|lit|fam|bro|sis|g|k|kk|ikr|smh|ngl|tbh|imo|idk|idc|wyd|hbu|nm|gn|gm|sup|hey|hi|hello|bye|later|ttyl|ight|aight|yo|yoo|lmfao|dead|ded|rip|omg|omfg|wtf|wth|tf|stfu|lmaoo|hahaha|nice|cool|great|good|fine|alright|thx|thanks|ty|np|yw|mb|my bad|sorry|pls|plz|ooh|oops|ouch|yikes|ew|meh|welp|duh|smth|nvm|jk|lolz)!?$/i,
  // Nigerian / Pidgin casual
  /^(?:ehen|ehn|abeg|na|abi|sef|sha|walahi|wallahi|wahala|chai|choi|omo|oya|e be like|no wahala|no vex|shey|joor|werey|ode|mumu|oshey|oshisco|sabi|jara|shege|na wa|e choke|sapa|las las|God abeg|abegi|na you|wetin|na so|e don do|e reach|dey play|dey go|which kain|shebi|o wrong|o boy|o girl|gbam|gbas gbos|e pain me|see finish|on god|no cap|e sweet|chale|ehen na|lmao fr|omo see|boss|chief|chairman|chairlady|my guy|my gee|my person|paddy|guy man)!?$/i,
  // Pure emoji or very short
  /^[\p{Emoji}\s]+$/u,
  /^.{1,2}$/,
  // Greeting-only patterns
  /^(?:good (?:morning|afternoon|evening|night)|gm|gn|morning|evening|night|afternoon)!?$/i,
  // Reactions / agreement
  /^(?:yesss*|nooo*|facts|real|valid|word|swear|on god|i swear|for real|no lie|100|💯)!?$/i,
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
  // Direct command names
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
  profile: { command: 'profile', args: [] },
  wrapped: { command: 'wrap', args: [] },
  wrap: { command: 'wrap', args: [] },
  recap: { command: 'recap', args: [] },
  birthday: { command: 'birthday', args: [] },
  bday: { command: 'birthday', args: [] },
  calendar: { command: 'cal', args: [] },
  coinflip: { command: 'coinflip', args: [] },
  dice: { command: 'dice', args: [] },
  wallpaper: { command: 'wallpaper', args: [] },
  logo: { command: 'logo', args: [] },
  brandkit: { command: 'brandkit', args: [] },
  // Slang / casual triggers
  inspire: { command: 'quote', args: [] },
  motivation: { command: 'quote', args: [] },
  inspire_me: { command: 'quote', args: [] },
  lyrics: { command: 'lyrics', args: [] },
  translate: { command: 'translate', args: [] },
  define: { command: 'define', args: [] },
  dictionary: { command: 'define', args: [] },
  wikipedia: { command: 'wiki', args: [] },
  wiki: { command: 'wiki', args: [] },
  horoscope: { command: 'horoscope', args: [] },
  zodiac: { command: 'horoscope', args: [] },
  crypto: { command: 'crypto', args: [] },
  bitcoin: { command: 'crypto', args: ['bitcoin'] },
  ethereum: { command: 'crypto', args: ['ethereum'] },
  btc: { command: 'crypto', args: ['bitcoin'] },
  eth: { command: 'crypto', args: ['ethereum'] },
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
  nlpCtx?: NLPContext,
): NLPIntent | null {
  if (!rawText || rawText.length < MIN_MESSAGE_LENGTH || rawText.length > MAX_MESSAGE_LENGTH) {
    return null;
  }

  // Normalize smart/curly quotes to straight quotes (iOS/Android keyboards use these)
  const normalizedText = rawText
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"');

  // Step 1: check if the user is talking to the bot
  const stripped = stripBotAddress(normalizedText, isGroup, nlpCtx);
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

// ─── AI-Smart Classification ─────────────────────────────────────────────────
//
// When regex patterns don't match, use AI (Groq first → Gemini fallback) to
// understand what the user wants. The AI understands:
//   - Nigerian pidgin / slang / informal English
//   - Typos and misspellings
//   - Indirect requests ("I'm bored" → joke/meme/trivia)
//   - Context from quoted/reply messages
//   - Multi-language requests

const AI_COMMAND_MAP: Record<string, string> = {
  weather: 'Get weather info for a city. Args: [city]',
  joke: 'Tell a random joke. Args: []',
  quote: 'Send an inspirational quote. Args: []',
  translate: 'Translate text. Args: [targetLanguage, text]',
  define: 'Dictionary definition. Args: [word]',
  horoscope: 'Daily horoscope. Args: [zodiacSign]',
  img: 'Generate AI image. Args: [description]',
  music: 'Search and play a song. Args: [songName]',
  download: 'Download media from URL. Args: [url]',
  sticker: 'Make sticker from attached image. Args: []',
  help: 'Show bot commands/menu. Args: []',
  crypto: 'Cryptocurrency price. Args: [coinName]',
  poll: 'Create a poll. Args: [question, ...options]',
  trivia: 'Start trivia quiz. Args: []',
  lyrics: 'Find song lyrics. Args: [songName]',
  wiki: 'Wikipedia search. Args: [topic]',
  remind: 'Set a reminder. Args: [timeAndMessage]',
  tts: 'Text to speech. Args: [text]',
  qr: 'Generate QR code. Args: [text]',
  note: 'Save a note. Args: [content]',
  meme: 'Send a random meme. Args: []',
  fact: 'Random fun fact. Args: []',
  riddle: 'Ask a riddle. Args: []',
  fortune: 'Fortune cookie. Args: []',
  '8ball': 'Magic 8-ball answer. Args: [question]',
  truth: 'Truth question. Args: []',
  dare: 'Dare challenge. Args: []',
  compliment: 'Give a compliment. Args: []',
  roast: 'Friendly roast. Args: []',
  ship: 'Love match between two people. Args: [person1, person2]',
  scan: 'Scan receipt/invoice from image. Args: []',
  recap: 'Summarize recent group chat. Args: []',
  calc: 'Calculator. Args: [expression]',
  password: 'Generate secure password. Args: []',
  coinflip: 'Flip a coin. Args: []',
  dice: 'Roll dice. Args: []',
  logo: 'Generate a logo. Args: [text]',
  doc: 'Create a document. Args: [title, content]',
  study: 'Open study hub. Args: []',
  pomodoro: 'Start focus timer. Args: []',
  flashcard: 'Flashcard study tool. Args: []',
  afk: 'Set AFK / away status. Args: [reason]',
  wallpaper: 'Random wallpaper. Args: [category]',
  ocr: 'Read text from image. Args: []',
  removebg: 'Remove image background. Args: []',
  leaderboard: 'Show top users. Args: []',
  hangman: 'Play hangman. Args: []',
  wordchain: 'Play word chain. Args: []',
  balance: 'Check reward balance. Args: []',
  plan: 'View subscription plan. Args: []',
  timezone: 'Check time in a timezone. Args: [timezone]',
  ud: 'Urban Dictionary lookup. Args: [term]',
  currency: 'Convert currency. Args: [amount, from, to]',
  profile: 'Show your profile card. Args: []',
  wrap: 'Your chat review/wrapped. Args: []',
  birthday: 'Birthday tracker. Args: []',
  schedule: 'Schedule a message. Args: [time, message]',
  pick: 'Pick random option. Args: [options...]',
  unit: 'Unit conversion. Args: [value, from, to]',
  encrypt: 'Encrypt a message. Args: [pin, message]',
  screenshot: 'Screenshot a website. Args: [url]',
  short: 'Shorten a URL. Args: [url]',
  carbon: 'Code screenshot. Args: [code]',
  tagall: 'Tag all group members. Args: []',
  game: 'Start multiplayer game. Args: [gameType]',
  bmi: 'Calculate BMI. Args: [weight, height]',
  age: 'Calculate age. Args: [birthdate]',
  country: 'Country info. Args: [countryName]',
  ai: 'AI chat — answer a question or have a conversation. Args: [fullMessage]',
  settings: 'Toggle bot features. Args: [featureName, on/off]. Features: savage (auto-roast insulters), nlp (smart commands), welcome (group welcome msgs), autoview (auto-view statuses), anti_delete (recover deleted msgs). Example: "enable savage mode" → settings savage on.',
  brandkit: 'Generate a complete brand kit with multiple formats. Args: [brandName]',
};

const AI_COMMAND_LIST = Object.keys(AI_COMMAND_MAP);

const AI_CLASSIFY_PROMPT = `You are the brain of BotWave, a WhatsApp bot used primarily by Nigerian users. Your job is to understand what command the user wants from their message, even if they use:
- Nigerian Pidgin English (e.g. "abeg", "wetin", "na so", "e dey", "sha", "oya", "joor", "shey")
- Slang (e.g. "drop bars" = music, "gist me" = tell me, "yarn" = talk, "cruise" = fun)
- Typos and misspellings
- Indirect requests (e.g. "I'm bored" = joke/meme/trivia, "I dey hungry for knowledge" = ai/wiki)
- Informal English (e.g. "make this a sticker bruh", "yo whats bitcoin at")

AVAILABLE COMMANDS AND THEIR PURPOSES:
${Object.entries(AI_COMMAND_MAP).map(([cmd, desc]) => `- ${cmd}: ${desc}`).join('\n')}

RESPONSE FORMAT — respond with ONLY valid JSON, no markdown:
{"command": "commandName", "args": ["arg1", "arg2"], "reason": "brief explanation"}

CRITICAL RULES:
1. If the message is casual chat (greetings, reactions, "lol", "ok", emojis, small talk), return: {"command": "none", "args": [], "reason": "casual chat"}
2. For ambiguous messages, lean toward "ai" command as a catch-all for questions
3. For "ai" command, put the FULL user message in args[0]
4. Extract real arguments — e.g. "what's the weather like in Abuja" → {"command": "weather", "args": ["Abuja"]}
5. "I'm bored" or "entertain me" → randomly pick joke, meme, fact, riddle, or trivia
6. Be SMART about argument extraction — pull out city names, song names, people names, URLs, etc.
7. Understand context: "translate this to Yoruba: hello" → {"command": "translate", "args": ["yoruba", "hello"]}
8. Currency: "how much is 100 dollars in naira" → {"command": "currency", "args": ["100", "USD", "NGN"]}`;

/**
 * Use AI (Groq → Gemini) to classify a message that didn't match any pattern.
 * The AI understands pidgin, slang, typos, and indirect requests.
 */
export async function classifyWithAI(
  text: string,
  isGroup: boolean,
  quotedText?: string,
  nlpCtx?: NLPContext,
): Promise<NLPIntent | null> {
  // Normalize smart quotes
  const normalized = text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  const stripped = stripBotAddress(normalized, isGroup, nlpCtx);
  if (!stripped) return null;
  if (!isGroup && !isRequestLike(stripped)) return null;

  try {
    const { callAI } = await import('../../lib/ai-provider');

    let userPrompt = `User message: "${stripped}"`;
    if (quotedText) {
      userPrompt += `\nReplying to: "${quotedText.slice(0, 200)}"`;
    }
    userPrompt += '\n\nClassify this message into a bot command. Respond with JSON only.';

    const response = await callAI({
      prompt: userPrompt,
      systemPrompt: AI_CLASSIFY_PROMPT,
      maxTokens: 150,
      temperature: 0.1,
    });

    // Parse the AI response — handle various response formats
    const cleaned = response
      .replace(/```json\n?|\n?```/g, '')
      .replace(/^[^{]*/, '') // strip anything before the JSON
      .replace(/[^}]*$/, '') // strip anything after the JSON
      .trim() + '}'; // ensure closing brace

    // Re-extract just the JSON object
    const jsonMatch = cleaned.match(/\{[^{}]*\}/);
    if (!jsonMatch) {
      console.warn('[NLP-AI] Could not extract JSON from response:', response.slice(0, 100));
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.command || parsed.command === 'none') return null;
    if (!AI_COMMAND_LIST.includes(parsed.command)) return null;

    console.log(`[NLP-AI] Classified: "${stripped.slice(0, 40)}" → ${parsed.command}(${JSON.stringify(parsed.args)}) reason: ${parsed.reason || 'n/a'}`);

    return {
      command: parsed.command,
      args: Array.isArray(parsed.args) ? parsed.args.map(String) : [],
      confidence: 0.8,
    };
  } catch (err) {
    console.error('[NLP-AI] Classification failed:', err);
    return null;
  }
}

/**
 * Extract quoted/replied-to message text from a raw WhatsApp message.
 */
export function getQuotedText(rawMessage: unknown): string | undefined {
  const msg = rawMessage as Record<string, unknown> | null;
  if (!msg) return undefined;

  const contextInfo = (msg as Record<string, unknown>).contextInfo as Record<string, unknown> | undefined;
  if (contextInfo?.quotedMessage) {
    const quoted = contextInfo.quotedMessage as Record<string, unknown>;
    if (typeof quoted.conversation === 'string') return quoted.conversation;
    const ext = quoted.extendedTextMessage as Record<string, unknown> | undefined;
    if (ext && typeof ext.text === 'string') return ext.text;
  }

  const message = (msg as Record<string, unknown>).message as Record<string, unknown> | undefined;
  if (!message) return undefined;

  const extMsg = message.extendedTextMessage as Record<string, unknown> | undefined;
  const ci = extMsg?.contextInfo as Record<string, unknown> | undefined;
  if (ci?.quotedMessage) {
    const quoted = ci.quotedMessage as Record<string, unknown>;
    if (typeof quoted.conversation === 'string') return quoted.conversation;
    const ext = quoted.extendedTextMessage as Record<string, unknown> | undefined;
    if (ext && typeof ext.text === 'string') return ext.text;
  }

  return undefined;
}
