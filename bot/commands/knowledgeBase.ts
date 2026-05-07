// Shared knowledge base for the !ask WhatsApp command and website chatbot.
// Each entry has keywords (for matching) and an answer.

export interface KBEntry {
  keywords: string[];
  question: string;
  answer: string;
  category: 'commands' | 'setup' | 'features' | 'billing' | 'troubleshooting' | 'privacy' | 'general';
}

export const knowledgeBase: KBEntry[] = [
  // ── Setup ─────────────────────────────────────────────────────────────────
  {
    keywords: ['setup', 'start', 'begin', 'connect', 'qr', 'scan', 'install', 'get started', 'how to use'],
    question: 'How do I set up BotWave?',
    answer: 'Sign up at www.botwave.online, go to your dashboard, and click "Connect WhatsApp". Scan the QR code with your phone and your bot is live in under 2 minutes. No coding needed!',
    category: 'setup',
  },
  {
    keywords: ['session', 'disconnect', 'offline', 'reconnect', 'not working', 'down', 'died'],
    question: 'My bot disconnected / went offline',
    answer: 'Go to your dashboard and check your session status. If it says "inactive", click "Reconnect". If the QR code appears, scan it again. Sessions can disconnect due to phone internet issues or WhatsApp updates. The bot auto-reconnects in most cases.',
    category: 'troubleshooting',
  },
  {
    keywords: ['qr code', 'qr not showing', 'qr expired', 'pair', 'pairing'],
    question: 'QR code not showing or expired',
    answer: 'Try refreshing the dashboard page. If the QR code expired, click "Reconnect" to generate a new one. Make sure your phone has internet access. If issues persist, try logging out and reconnecting from the dashboard.',
    category: 'troubleshooting',
  },

  // ── Commands ──────────────────────────────────────────────────────────────
  {
    keywords: ['sticker', 'make sticker', 'create sticker', 'image to sticker'],
    question: 'How do I make stickers?',
    answer: 'Send any image or video with the caption *!sticker*. Options: *!sticker crop* (square), *!sticker circle* (round), *!sticker rounded* (rounded corners). You can also reply to any media with *!sticker*.',
    category: 'commands',
  },
  {
    keywords: ['ai', 'chatbot', 'ask ai', 'artificial intelligence', 'groq', 'ai chat'],
    question: 'How does AI chat work?',
    answer: 'Use *!ai [your question]* to chat with AI. You need a free Groq API key \u2014 get one at console.groq.com and add it in Dashboard > Settings > AI Settings. The AI uses Llama 3.3 70B for intelligent responses.',
    category: 'commands',
  },
  {
    keywords: ['download', 'youtube', 'tiktok', 'instagram', 'media download', 'video download'],
    question: 'How do I download videos?',
    answer: 'Use *!download [URL]* with a link from YouTube, TikTok, Instagram, or Twitter/X. The bot fetches the media and sends it directly in chat. Example: *!download https://youtube.com/watch?v=...*',
    category: 'commands',
  },
  {
    keywords: ['weather', 'forecast', 'temperature'],
    question: 'How do I check weather?',
    answer: 'Use *!weather [city]* to get current weather. Example: *!weather Lagos*. Shows temperature, humidity, wind speed, and conditions. Works for any city worldwide.',
    category: 'commands',
  },
  {
    keywords: ['translate', 'translation', 'language'],
    question: 'How do I translate text?',
    answer: 'Use *!translate [language code] [text]*. Language codes: es (Spanish), fr (French), de (German), ar (Arabic), etc. Example: *!translate fr Good morning everyone*',
    category: 'commands',
  },
  {
    keywords: ['trivia', 'quiz', 'game', 'play', 'hangman', 'wordchain', 'games'],
    question: 'What games can I play?',
    answer: 'BotWave has several games: *!trivia* (quiz), *!hangman* (word guess), *!wordchain* (word chain), *!play numberguess* (number guessing). Answer with *!answer [your answer]*. Points go to the *!leaderboard*!',
    category: 'commands',
  },
  {
    keywords: ['poll', 'vote', 'survey'],
    question: 'How do I create polls?',
    answer: 'Use *!poll [question] | [option1] | [option2] | ...*. Example: *!poll Best food? | Pizza | Burger | Sushi*. Others vote with *!vote [number]*.',
    category: 'commands',
  },
  {
    keywords: ['logo', 'brand', 'brandkit', 'design'],
    question: 'How do I create logos?',
    answer: 'Use *!logo [style] [name]* to generate logos. 45+ styles available! Try *!logo neon MyBrand* or *!logo preview* to see all styles. For a complete brand kit: *!brandkit [name]*. Add *| Your Tagline* and *#hexcolor* for customization.',
    category: 'commands',
  },
  {
    keywords: ['viewonce', 'view once', 'disappearing', 'view once message'],
    question: 'How do I save view-once messages?',
    answer: 'Reply to any view-once message with *!viewonce* to save it as a normal message in the same chat. Use *!viewonce pr* to save it to your private chat silently.',
    category: 'commands',
  },
  {
    keywords: ['antidelete', 'deleted message', 'recover', 'anti delete', 'message deleted'],
    question: 'How do I see deleted messages?',
    answer: 'First enable with *!antidelete on*. The bot silently caches messages. When someone deletes a message, use *!recover* to view it. Use *!recover pr* to see them in your private chat.',
    category: 'commands',
  },
  {
    keywords: ['remind', 'reminder', 'schedule', 'timer', 'alarm'],
    question: 'How do I set reminders?',
    answer: 'Use *!remind [time] [message]*. Time formats: 5m (minutes), 2h (hours), 1d (days). Example: *!remind 30m Check the oven*. For scheduled messages: *!schedule [time] [message]*.',
    category: 'commands',
  },
  {
    keywords: ['welcome', 'goodbye', 'greet', 'new member', 'join'],
    question: 'How do I set welcome/goodbye messages?',
    answer: 'First enable: *!settings welcome on*. Then set your message: *!welcome Welcome {name} to {group}!*. Use placeholders: {name}, {group}, {time}, {date}, {count}. Same for *!goodbye [message]*.',
    category: 'commands',
  },
  {
    keywords: ['help', 'commands', 'list', 'all commands', 'command list', 'menu'],
    question: 'How do I see all commands?',
    answer: 'Send *!help* to get a full .docx guide with every command explained. For a quick text menu, use *!help text*. There are 50+ commands across categories: general, tools, media, games, admin, creative, and more!',
    category: 'commands',
  },
  {
    keywords: ['doc', 'document', 'word', 'docx', 'pdf', 'convert'],
    question: 'How do I create/convert documents?',
    answer: 'Create Word docs: *!doc Title | Content*. Convert formats: *!topdf* (to PDF), *!todoc* (to Word), *!totxt* (to text). Reply to a file with the conversion command.',
    category: 'commands',
  },
  {
    keywords: ['forward', 'send to', 'fwd'],
    question: 'How do I forward messages?',
    answer: 'Reply to any message with *!forward [phone number]*. Example: *!forward 2348012345678*. Works with text, images, videos, audio, and documents.',
    category: 'commands',
  },
  {
    keywords: ['afk', 'away', 'auto reply', 'autoreply', 'busy'],
    question: 'How do I set auto-reply / AFK?',
    answer: 'Use *!afk [reason]* to set your AFK status. Anyone who messages you gets an auto-reply with your reason. Use *!afk off* to disable. Example: *!afk In a meeting*.',
    category: 'commands',
  },
  {
    keywords: ['tagall', 'mention all', 'tag everyone', 'mention everyone'],
    question: 'How do I tag everyone in a group?',
    answer: 'Use *!tagall [optional message]* in a group chat. Example: *!tagall Meeting at 3pm*. This mentions every group member.',
    category: 'commands',
  },
  {
    keywords: ['ocr', 'text from image', 'read image', 'extract text'],
    question: 'How do I extract text from images?',
    answer: 'Reply to any image with *!ocr*. Uses Tesseract OCR to read text from images. Works best with clear, well-lit text. No API key needed!',
    category: 'commands',
  },
  {
    keywords: ['crypto', 'bitcoin', 'ethereum', 'coin', 'price'],
    question: 'How do I check crypto prices?',
    answer: 'Use *!crypto [coin name]*. Example: *!crypto bitcoin* or *!crypto ethereum*. Shows USD, EUR, GBP, NGN prices, 24h change, market cap, and rank.',
    category: 'commands',
  },
  {
    keywords: ['currency', 'exchange rate', 'convert money', 'naira', 'dollar'],
    question: 'How do I convert currency?',
    answer: 'Use *!currency [amount] [FROM] [TO]*. Example: *!currency 100 USD NGN* or *!currency 50 EUR GBP*. Uses live exchange rates.',
    category: 'commands',
  },

  // ── Features ──────────────────────────────────────────────────────────────
  {
    keywords: ['feature', 'what can', 'capabilities', 'what does', 'overview'],
    question: 'What can BotWave do?',
    answer: 'BotWave has 50+ commands: sticker maker, AI chat, media downloader (YouTube/TikTok/IG), games (trivia/hangman), polls, weather, translate, logo generator, document creator, anti-delete, auto-reply, group management, and much more. Type *!help* in chat to see everything!',
    category: 'features',
  },
  {
    keywords: ['anti ban', 'ban', 'banned', 'safe', 'get banned', 'ban risk', 'whatsapp ban'],
    question: 'Will I get banned?',
    answer: 'BotWave has advanced anti-ban protection: human-like typing delays, message variation, rate limiting, session warmup (7-day gradual increase), activity hours simulation, and media fingerprint jittering. Your session runs from your own device IP, significantly reducing ban risk.',
    category: 'features',
  },
  {
    keywords: ['worker', 'multiple', 'server', 'performance', 'speed', 'slow'],
    question: 'Why is the bot slow / How does scaling work?',
    answer: 'BotWave uses multiple worker servers to handle sessions. If you experience slowness, it may be due to high traffic or your session reconnecting. The system auto-balances load across workers. Contact support if persistent slowness occurs.',
    category: 'troubleshooting',
  },

  // ── Billing ───────────────────────────────────────────────────────────────
  {
    keywords: ['price', 'pricing', 'plan', 'cost', 'pay', 'subscription', 'free', 'tier', 'upgrade'],
    question: 'What are the pricing plans?',
    answer: 'BotWave has a *free tier* with 300 messages/month, 10 AI queries/day, and 1 session. Paid plans start at just \u20A6500/month for more messages and features. Check your plan with *!plan* in chat or visit the dashboard.',
    category: 'billing',
  },
  {
    keywords: ['referral', 'refer', 'invite', 'earn', 'reward', 'airtime'],
    question: 'How does the referral program work?',
    answer: 'Use *!refer* to get your unique referral link. Share it with friends \u2014 you earn \u20A620 per signup, they get \u20A610. Cash out at \u20A6100 for free airtime! Check your balance with *!balance*.',
    category: 'billing',
  },

  // ── Privacy ───────────────────────────────────────────────────────────────
  {
    keywords: ['privacy', 'data', 'read messages', 'secure', 'safe', 'spy', 'monitor', 'watch'],
    question: 'Is my data safe? Can the bot owner read my messages?',
    answer: 'Your chats are completely private. BotWave only responds to commands \u2014 no messages are stored, read, or shared. The bot owner CANNOT read or access your messages. Your session runs from your own device IP with end-to-end encryption.',
    category: 'privacy',
  },
  {
    keywords: ['delete data', 'remove account', 'delete account', 'unsubscribe'],
    question: 'How do I delete my data?',
    answer: 'You can disconnect your WhatsApp session from the dashboard at any time. This removes your session data. For full account deletion, contact support through the website chat widget.',
    category: 'privacy',
  },

  // ── General ───────────────────────────────────────────────────────────────
  {
    keywords: ['what is botwave', 'about botwave', 'botwave'],
    question: 'What is BotWave?',
    answer: 'BotWave is a free WhatsApp bot automation platform. Connect your own WhatsApp number by scanning a QR code, and get 50+ commands: stickers, AI chat, media downloads, games, group management, and more. No coding needed!',
    category: 'general',
  },
  {
    keywords: ['nigeria', 'africa', 'naira', 'work in nigeria'],
    question: 'Does BotWave work in Nigeria?',
    answer: 'Yes! BotWave is built for Nigeria and Africa. Payments are in Naira (\u20A6), the platform is optimized for Nigerian internet speeds, and support is available in your timezone.',
    category: 'general',
  },
  {
    keywords: ['telegram', 'better than telegram', 'vs telegram', 'comparison'],
    question: 'Is BotWave better than Telegram bots?',
    answer: 'Telegram bots only work on Telegram. In Nigeria and Africa, WhatsApp is dominant. BotWave gives you Telegram-level bot features (AI, games, media tools, automation) directly on WhatsApp \u2014 where your audience already is.',
    category: 'general',
  },
  {
    keywords: ['evolution api', 'baileys', 'developer', 'api', 'technical'],
    question: 'What is the difference between BotWave and Evolution API?',
    answer: 'Evolution API is an open-source WhatsApp API for developers requiring technical setup. BotWave is built on top of it with a simple web dashboard \u2014 no coding, no server setup. Think of Evolution API as the engine and BotWave as the car.',
    category: 'general',
  },
  {
    keywords: ['business', 'commercial', 'company', 'enterprise'],
    question: 'Can I use BotWave for my business?',
    answer: 'Absolutely! Use auto-replies for customer support, polls for feedback, AI chat for FAQs, stickers for branding. The Standard and Boss plans support multiple WhatsApp sessions and unlimited messages.',
    category: 'general',
  },
  {
    keywords: ['coding', 'developer', 'no code', 'programming', 'technical'],
    question: 'Do I need coding skills?',
    answer: 'No! BotWave is 100% no-code. Sign up, scan QR code, your bot is live. All configuration happens through the web dashboard. Even AI chat just needs pasting a free Groq API key.',
    category: 'general',
  },
  {
    keywords: ['contact', 'support', 'help', 'issue', 'problem', 'bug', 'report'],
    question: 'How do I contact support?',
    answer: 'Use the chat widget on www.botwave.online to create a support ticket. We typically reply within a few hours. You can also use *!ask [question]* in WhatsApp for instant answers to common questions.',
    category: 'general',
  },
  {
    keywords: ['diagnose', 'health', 'status', 'check', 'debug', 'system'],
    question: 'How do I check if the bot is healthy?',
    answer: 'Use *!diagnose* in WhatsApp to get a full system health report: bot uptime, Evolution API status, session count, worker health, and more. Use *!ping* for a quick alive check.',
    category: 'troubleshooting',
  },
];

/**
 * Simple fuzzy search: score each entry by how many keywords match the query.
 * Returns entries sorted by relevance (best match first).
 */
export function searchKnowledge(query: string, limit = 3): KBEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const words = q.split(/\s+/).filter(w => w.length > 1);

  const scored = knowledgeBase.map(entry => {
    let score = 0;

    // Exact substring match in keywords (highest value)
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += 10;
      else if (kw.includes(q)) score += 8;
    }

    // Word-level matches
    for (const word of words) {
      for (const kw of entry.keywords) {
        if (kw.includes(word)) score += 3;
      }
      // Also check question text
      if (entry.question.toLowerCase().includes(word)) score += 2;
      if (entry.answer.toLowerCase().includes(word)) score += 1;
    }

    return { entry, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);
}
