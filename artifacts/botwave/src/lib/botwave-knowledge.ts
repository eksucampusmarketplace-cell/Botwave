import { knowledgeBase, type KBEntry } from '../bot/whatsapp/commands/knowledgeBase';

const FAQ_ITEMS: KBEntry[] = [
  { keywords: ['what is botwave', 'about botwave'], question: 'What is BotWave?', answer: 'BotWave is a free Telegram bot automation platform with 150+ commands including AI chat, sticker maker, anti-spam, group management, and more. No coding required.', category: 'general' },
  { keywords: ['free', 'cost', 'price'], question: 'Is BotWave really free?', answer: 'Yes! Free tier includes 300 messages/month, 10 AI queries/day, 1 session. Paid plans with higher limits are coming soon.', category: 'billing' },
  { keywords: ['connect', 'start', 'setup', 'botfather'], question: 'How do I connect my Telegram bot?', answer: 'Sign up at botwave.online, go to dashboard, click "Connect Telegram Bot", paste your BotFather token. Your bot is live in under 2 minutes.', category: 'setup' },
  { keywords: ['ban', 'banned', 'will i get banned'], question: 'Will Telegram restrict my bot?', answer: 'BotWave uses the official Telegram Bot API — zero ban risk for normal use. For Userbots, BotWave\'s rate limiter keeps you within safe Telegram limits.', category: 'features' },
  { keywords: ['telegram', 'telegram bot', 'userbot'], question: 'What Telegram platforms are supported?', answer: 'BotWave supports Telegram Bot (via @BotFather, zero ban risk) and Telegram Userbot (MTProto, runs on your real account).', category: 'features' },
  { keywords: ['human', 'support', 'help', 'agent', 'contact'], question: 'How do I contact a human for support?', answer: "Type 'talk to human' in the chat box, or use the support widget on the website to create a ticket.", category: 'general' },
];

const ALL_KNOWLEDGE = [...knowledgeBase, ...FAQ_ITEMS];

export interface SearchResult {
  question: string;
  answer: string;
  score: number;
}

export function searchKnowledgeBase(query: string, limit = 3): SearchResult[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 2);

  const scored = ALL_KNOWLEDGE.map(item => {
    let score = 0;
    for (const kw of item.keywords) {
      if (q.includes(kw)) score += 10;
      else if (kw.includes(q)) score += 5;
    }
    for (const w of words) {
      for (const kw of item.keywords) {
        if (kw.includes(w)) score += 3;
      }
      if (item.question.toLowerCase().includes(w)) score += 2;
      if (item.answer.toLowerCase().includes(w)) score += 1;
    }
    return { question: item.question, answer: item.answer, score };
  });

  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

export function getBotwaveSystemPrompt(additionalContext?: string): string {
  return `You are BotWave's AI assistant. You help users with questions about BotWave - a Telegram bot automation platform.

KEY FACTS:
- BotWave is free (300 msgs/month). Paid plans are coming soon.
- Connect via BotFather token for Telegram Bot, or API credentials for Telegram Userbot.
- 150+ commands: !sticker, !ai, !download, !trivia, !poll, !weather, !translate, !game, !logo, !brandkit, !viewonce, !antidelete, !spy, !tagall, !scan, !digest, !study, !doc, etc.
- Telegram Bot API: official API, zero ban risk for legitimate use.
- AI chat uses Groq (primary) and Google Gemini (fallback). No API key needed from user.
- Support is available via the chat widget on the website.
- Study Hub: upload study materials, AI generates summaries, quiz questions, and flashcards.
- The bot runs as a separate Telegram bot account registered via @BotFather.

RULES:
- Answer concisely (1-3 sentences if possible).
- If you don't know, say "I'm not sure about that. Would you like me to connect you with a human agent?" and then suggest creating a support ticket.
- Never make up facts about BotWave.
- Be friendly and helpful.
${additionalContext ? `\nADDITIONAL CONTEXT FROM KNOWLEDGE BASE:\n${additionalContext}\n` : ''}`;
}

export function detectLanguage(text: string): string {
  const patterns: [RegExp, string][] = [
    [/[àâçéèêëîïôùûüÿœæ]/i, 'fr'],
    [/[äöüß]/i, 'de'],
    [/[ñáéíóúü¡¿]/i, 'es'],
    [/[\u0600-\u06FF]/, 'ar'],
    [/[\u0400-\u04FF]/, 'ru'],
    [/[\u4E00-\u9FFF]/, 'zh'],
    [/[\u0900-\u097F]/, 'hi'],
    [/[\uAC00-\uD7AF]/, 'ko'],
    [/[\u3040-\u309F\u30A0-\u30FF]/, 'ja'],
    [/ọ|ẹ|ṣ|gb|kp/i, 'yo'],
    [/ị|ọ|ụ/i, 'ig'],
    [/ɗ|ƙ|ɓ/i, 'ha'],
  ];
  for (const [regex, lang] of patterns) {
    if (regex.test(text)) return lang;
  }
  return 'en';
}
