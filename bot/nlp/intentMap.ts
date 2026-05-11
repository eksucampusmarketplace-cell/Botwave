// ─── Natural Language → Command Intent Mapping ───────────────────────────────
//
// Each intent has:
//   - patterns: regex patterns to match against user messages
//   - command: the bot command to execute
//   - extractArgs: optional function to pull arguments from the match
//   - confidence: minimum threshold (0-1) for this pattern set

export interface NLPIntent {
  command: string;
  args: string[];
  confidence: number;
}

interface IntentPattern {
  command: string;
  patterns: RegExp[];
  extractArgs?: (match: RegExpMatchArray, full: string) => string[];
  confidence: number;
}

// Helper to build a pattern that matches common question prefixes
function q(core: string): RegExp {
  return new RegExp(
    `(?:can you |please |could you |i want to |i need to |i'd like to |let's |yo |hey |bot |` +
    `help me |show me |give me |get me |find me )?` +
    core,
    'i',
  );
}

// ─── Intent Definitions ──────────────────────────────────────────────────────

export const INTENT_MAP: IntentPattern[] = [
  // ── Weather ────────────────────────────────────────────────────────────────
  {
    command: 'weather',
    confidence: 0.9,
    patterns: [
      /(?:what(?:'s| is) the )?weather (?:in |at |for |of )?(.+)/i,
      /(?:how(?:'s| is) the )?weather (?:in |at |for |of )?(.+)/i,
      /(?:is it |will it )?(?:rain|snow|storm|cold|hot|warm|sunny|cloudy) (?:in |at )?(.+)/i,
      /temperature (?:in |at |of )?(.+)/i,
      /(?:what(?:'s| is) the )?temp(?:erature)? (?:in |at |of )?(.+)/i,
      /forecast (?:for |in )?(.+)/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── AI Chat ────────────────────────────────────────────────────────────────
  {
    command: 'ai',
    confidence: 0.7,
    patterns: [
      /^(?:explain|describe|summarize|elaborate on|tell me about|what (?:is|are|was|were|does|do)|how (?:does|do|is|are|to|can)|why (?:is|are|does|do|did)|who (?:is|are|was|were)|when (?:is|was|did|does)|where (?:is|are|was|were)) .{10,}/i,
    ],
    extractArgs: (_match, full) => [full],
  },

  // ── Sticker ────────────────────────────────────────────────────────────────
  {
    command: 'sticker',
    confidence: 0.9,
    patterns: [
      q('(?:make|create|turn|convert)(?: this| it)?(?: into| to)? (?:a )?sticker'),
      /sticker(?:ize|fy)? (?:this|it|that|the (?:image|photo|pic))/i,
      /(?:i want|make me) a sticker/i,
    ],
    extractArgs: () => [],
  },

  // ── Joke ───────────────────────────────────────────────────────────────────
  {
    command: 'joke',
    confidence: 0.9,
    patterns: [
      q('tell (?:me |us )?(?:a )?joke'),
      /(?:make me |i need (?:a )?)?(?:laugh|something funny)/i,
      /^(?:joke|funny)$/i,
    ],
    extractArgs: () => [],
  },

  // ── Quote ──────────────────────────────────────────────────────────────────
  {
    command: 'quote',
    confidence: 0.9,
    patterns: [
      q('(?:give|send|share|tell) (?:me |us )?(?:a |an )?(?:inspirational |motivational )?quote'),
      /(?:inspire|motivate) me/i,
      /^(?:quote|inspiration|motivation)$/i,
    ],
    extractArgs: () => [],
  },

  // ── Translate ──────────────────────────────────────────────────────────────
  {
    command: 'translate',
    confidence: 0.85,
    patterns: [
      /translate (?:this |it |that )?(?:to |into )?(\w+)(?:\s*:?\s*(.+))?/i,
      /(?:say|how do you say|what(?:'s| is)) ["']?(.+?)["']? in (\w+)/i,
    ],
    extractArgs: (match) => {
      // "translate to French hello" → ['fr', 'hello']
      // "how do you say hello in French" → ['french', 'hello']
      if (match[2] !== undefined) {
        return [match[1].trim(), match[2].trim()];
      }
      return [match[1].trim()];
    },
  },

  // ── Define / Dictionary ────────────────────────────────────────────────────
  {
    command: 'define',
    confidence: 0.9,
    patterns: [
      /(?:what does |what's the meaning of |define |meaning of )["']?(.+?)["']?$/i,
      /(?:what(?:'s| is) the )?definition (?:of |for )["']?(.+?)["']?$/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── Horoscope ──────────────────────────────────────────────────────────────
  {
    command: 'horoscope',
    confidence: 0.9,
    patterns: [
      /(?:what(?:'s| is) (?:the |my )?)?horoscope (?:for )?(\w+)/i,
      /(\w+) horoscope/i,
      /(?:what(?:'s| is) (?:in store|ahead) for )(\w+)/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── Image Generation ───────────────────────────────────────────────────────
  {
    command: 'img',
    confidence: 0.85,
    patterns: [
      /(?:generate|create|make|draw|paint)(?: me)?(?: an?)? (?:image|picture|pic|photo|illustration|art) (?:of |about |showing |with )?(.+)/i,
      /(?:i want|i need|i'd like)(?: an?)? (?:image|picture|pic) (?:of |about |showing )?(.+)/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── Music ──────────────────────────────────────────────────────────────────
  {
    command: 'music',
    confidence: 0.85,
    patterns: [
      /(?:play|find|search|send)(?: me)? (?:the )?(?:song|music|track|audio) ["']?(.+?)["']?$/i,
      /(?:i want to (?:hear|listen to)|play me) ["']?(.+?)["']?$/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── Download ───────────────────────────────────────────────────────────────
  {
    command: 'download',
    confidence: 0.9,
    patterns: [
      /(?:download|save|get|grab)(?: this| the)? (?:video|audio|media|file) (?:from )?(https?:\/\/\S+)/i,
      /(?:download|save|get|grab) (https?:\/\/\S+)/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── Ping ───────────────────────────────────────────────────────────────────
  {
    command: 'ping',
    confidence: 0.9,
    patterns: [
      /(?:are you )?(?:alive|online|there|up|working|active)\??$/i,
      /(?:is the )?bot (?:alive|online|working|up)\??$/i,
      /^(?:ping|hello bot|hey bot|yo bot)$/i,
    ],
    extractArgs: () => [],
  },

  // ── Help ───────────────────────────────────────────────────────────────────
  {
    command: 'help',
    confidence: 0.85,
    patterns: [
      /(?:what can you do|show me (?:the |your )?(?:commands|menu)|list (?:all )?commands)/i,
      /(?:how do(?:es)? (?:this|the) bot work|what (?:are|is) (?:the |your )?(?:commands|features))/i,
      /^(?:help|menu|commands)$/i,
    ],
    extractArgs: () => ['text'],
  },

  // ── Crypto ─────────────────────────────────────────────────────────────────
  {
    command: 'crypto',
    confidence: 0.85,
    patterns: [
      /(?:what(?:'s| is) the )?(?:price|value|rate) of (\w+)/i,
      /(?:how much is |what(?:'s| is) )(\w+) worth/i,
      /(\w+) (?:price|rate|value)$/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── Poll ───────────────────────────────────────────────────────────────────
  {
    command: 'poll',
    confidence: 0.85,
    patterns: [
      /(?:create|make|start)(?: a)? poll/i,
      /(?:let(?:'s|'s) |i want to )(?:vote|poll)/i,
    ],
    extractArgs: () => [],
  },

  // ── Trivia / Quiz ──────────────────────────────────────────────────────────
  {
    command: 'trivia',
    confidence: 0.9,
    patterns: [
      /(?:let(?:'s|'s) play|start|give me)(?: a)? (?:trivia|quiz)/i,
      /(?:quiz|trivia) (?:me|time|question)/i,
      /^(?:trivia|quiz)$/i,
    ],
    extractArgs: () => [],
  },

  // ── Games ──────────────────────────────────────────────────────────────────
  {
    command: 'play',
    confidence: 0.85,
    patterns: [
      /(?:let(?:'s|'s) |i want to |can we )?play (?:a )?(?:game|hangman|wordchain)/i,
      /^(?:hangman|wordchain)$/i,
    ],
    extractArgs: () => [],
  },

  // ── Screenshot ─────────────────────────────────────────────────────────────
  {
    command: 'screenshot',
    confidence: 0.9,
    patterns: [
      /(?:take a |get a )?screenshot (?:of )?(https?:\/\/\S+)/i,
      /(?:capture|snap) (?:the )?(?:page|website|site|url) (https?:\/\/\S+)/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── AFK ────────────────────────────────────────────────────────────────────
  {
    command: 'afk',
    confidence: 0.85,
    patterns: [
      /(?:i(?:'m| am) )?(?:going )?(?:afk|away|brb|offline)(?: (?:because|cause|cuz|for) (.+))?/i,
      /(?:set me as |mark me as? )?(?:away|busy|unavailable)/i,
    ],
    extractArgs: (match) => match[1] ? [match[1].trim()] : [],
  },

  // ── Wallpaper ──────────────────────────────────────────────────────────────
  {
    command: 'wallpaper',
    confidence: 0.85,
    patterns: [
      /(?:send|get|find|give)(?: me)?(?: a)? wallpaper (?:of |about |for )?(.+)/i,
      /(?:i (?:want|need))(?: a)? wallpaper (?:of |about |for )?(.+)/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── Currency ───────────────────────────────────────────────────────────────
  {
    command: 'currency',
    confidence: 0.85,
    patterns: [
      /(?:convert |how much is )?(\d+(?:\.\d+)?) ?(\w{3}) (?:to|in) (\w{3})/i,
      /(\w{3}) to (\w{3})(?: rate)?$/i,
    ],
    extractArgs: (match) => {
      if (match[3]) return [match[1], match[2], match[3]];
      return [match[1], match[2]];
    },
  },

  // ── Lyrics ─────────────────────────────────────────────────────────────────
  {
    command: 'lyrics',
    confidence: 0.85,
    patterns: [
      /(?:find|get|show|search)(?: the| me)? lyrics (?:of |for |to )?["']?(.+?)["']?$/i,
      /lyrics (?:of |for |to )?["']?(.+?)["']?$/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── Wiki ───────────────────────────────────────────────────────────────────
  {
    command: 'wiki',
    confidence: 0.8,
    patterns: [
      /(?:wikipedia|wiki) (?:search |about |for )?(.+)/i,
      /(?:look up|search for) (.+) on wikipedia/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── Reminder ───────────────────────────────────────────────────────────────
  {
    command: 'remind',
    confidence: 0.85,
    patterns: [
      /remind me (?:to |about )?(.+)/i,
      /(?:set|create)(?: a)? reminder (?:to |for |about )?(.+)/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── TTS ────────────────────────────────────────────────────────────────────
  {
    command: 'tts',
    confidence: 0.85,
    patterns: [
      /(?:say|speak|read)(?: this)?(?: out loud| aloud)?\s*:?\s*["']?(.{3,})["']?$/i,
      /(?:text to speech|tts)\s*:?\s*(.+)/i,
      /(?:convert to |make it |turn (?:this |it )?into )(?:speech|audio|voice)/i,
    ],
    extractArgs: (match) => match[1] ? [match[1].trim()] : [],
  },

  // ── QR Code ────────────────────────────────────────────────────────────────
  {
    command: 'qr',
    confidence: 0.85,
    patterns: [
      /(?:generate|create|make)(?: a)? qr (?:code )?(?:for |of )?(.+)/i,
      /qr code (?:for |of )?(.+)/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },

  // ── Note ───────────────────────────────────────────────────────────────────
  {
    command: 'note',
    confidence: 0.8,
    patterns: [
      /(?:save|write|add|take)(?: a| this)? note\s*:?\s*(.+)/i,
      /(?:note|jot)(?: down)?\s*:?\s*(.{5,})/i,
    ],
    extractArgs: (match) => [match[1].trim()],
  },
];
