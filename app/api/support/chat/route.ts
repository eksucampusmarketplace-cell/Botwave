import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Inline knowledge base for the website chatbot.
// Kept separate from bot/commands/knowledgeBase.ts because Next.js API routes
// cannot import from the bot directory (different build target).

interface KBEntry {
  keywords: string[];
  question: string;
  answer: string;
}

const knowledgeBase: KBEntry[] = [
  // Setup
  { keywords: ['setup', 'start', 'begin', 'connect', 'qr', 'scan', 'install', 'get started', 'how to use'], question: 'How do I set up BotWave?', answer: 'Sign up at www.botwave.online, go to your dashboard, and click "Connect WhatsApp". Scan the QR code with your phone and your bot is live in under 2 minutes. No coding needed!' },
  { keywords: ['session', 'disconnect', 'offline', 'reconnect', 'not working', 'down', 'died'], question: 'My bot disconnected / went offline', answer: 'Go to your dashboard and check your session status. If it says "inactive", click "Reconnect". If the QR code appears, scan it again. Sessions can disconnect due to phone internet issues or WhatsApp updates. The bot auto-reconnects in most cases.' },
  { keywords: ['qr code', 'qr not showing', 'qr expired', 'pair', 'pairing'], question: 'QR code not showing or expired', answer: 'Try refreshing the dashboard page. If the QR code expired, click "Reconnect" to generate a new one. Make sure your phone has internet access.' },

  // Commands
  { keywords: ['sticker', 'make sticker', 'create sticker', 'image to sticker'], question: 'How do I make stickers?', answer: 'Send any image or video with the caption !sticker. Options: !sticker crop (square), !sticker circle (round), !sticker rounded (rounded corners). You can also reply to any media with !sticker.' },
  { keywords: ['ai', 'chatbot', 'ask ai', 'artificial intelligence', 'groq'], question: 'How does AI chat work?', answer: 'Use !ai [your question] to chat with AI. You need a free Groq API key — get one at console.groq.com and add it in Dashboard > Settings > AI Settings.' },
  { keywords: ['download', 'youtube', 'tiktok', 'instagram', 'media download', 'video download'], question: 'How do I download videos?', answer: 'Use !download [URL] with a link from YouTube, TikTok, Instagram, or Twitter/X. The bot fetches the media and sends it directly in chat.' },
  { keywords: ['weather', 'forecast', 'temperature'], question: 'How do I check weather?', answer: 'Use !weather [city] to get current weather. Example: !weather Lagos. Shows temperature, humidity, wind speed, and conditions.' },
  { keywords: ['translate', 'translation', 'language'], question: 'How do I translate text?', answer: 'Use !translate [language code] [text]. Language codes: es (Spanish), fr (French), de (German), ar (Arabic), etc. Example: !translate fr Good morning everyone' },
  { keywords: ['trivia', 'quiz', 'game', 'play', 'hangman', 'wordchain', 'games'], question: 'What games can I play?', answer: 'BotWave has several games: !trivia (quiz), !hangman (word guess), !wordchain (word chain), !play numberguess (number guessing). Answer with !answer [your answer].' },
  { keywords: ['logo', 'brand', 'brandkit', 'design'], question: 'How do I create logos?', answer: 'Use !logo [style] [name] to generate logos. 45+ styles available! Try !logo neon MyBrand or !logo preview to see all styles. For a complete brand kit: !brandkit [name].' },
  { keywords: ['viewonce', 'view once', 'disappearing'], question: 'How do I save view-once messages?', answer: 'Reply to any view-once message with !viewonce to save it as a normal message. Use !viewonce pr to save it to your private chat silently.' },
  { keywords: ['antidelete', 'deleted message', 'recover', 'anti delete'], question: 'How do I see deleted messages?', answer: 'First enable with !antidelete on. The bot caches messages. When someone deletes a message, use !recover to view it. Use !recover pr for private recovery.' },
  { keywords: ['welcome', 'goodbye', 'greet', 'new member', 'join'], question: 'How do I set welcome/goodbye messages?', answer: 'First enable: !settings welcome on. Then set your message: !welcome Welcome {name} to {group}! Use placeholders: {name}, {group}, {time}, {date}, {count}.' },
  { keywords: ['help', 'commands', 'list', 'all commands', 'command list', 'menu'], question: 'How do I see all commands?', answer: 'Send !help to get a full .docx guide with every command explained. For a quick text menu, use !help text. There are 50+ commands across categories!' },
  { keywords: ['currency', 'exchange rate', 'convert money', 'naira', 'dollar'], question: 'How do I convert currency?', answer: 'Use !currency [amount] [FROM] [TO]. Example: !currency 100 USD NGN or !currency 50 EUR GBP. Uses live exchange rates.' },
  { keywords: ['crypto', 'bitcoin', 'ethereum', 'coin', 'price'], question: 'How do I check crypto prices?', answer: 'Use !crypto [coin name]. Example: !crypto bitcoin or !crypto ethereum. Shows USD, EUR, GBP, NGN prices, 24h change, market cap, and rank.' },
  { keywords: ['afk', 'away', 'auto reply', 'autoreply', 'busy'], question: 'How do I set auto-reply / AFK?', answer: 'Use !afk [reason] to set your AFK status. Anyone who messages you gets an auto-reply. Use !afk off to disable. Example: !afk In a meeting.' },
  { keywords: ['tagall', 'mention all', 'tag everyone'], question: 'How do I tag everyone in a group?', answer: 'Use !tagall [optional message] in a group chat. Example: !tagall Meeting at 3pm. This mentions every group member.' },

  // Features
  { keywords: ['feature', 'what can', 'capabilities', 'what does', 'overview'], question: 'What can BotWave do?', answer: 'BotWave has 50+ commands: sticker maker, AI chat, media downloader (YouTube/TikTok/IG), games, polls, weather, translate, logo generator, document creator, anti-delete, auto-reply, group management, and much more!' },
  { keywords: ['anti ban', 'ban', 'banned', 'safe', 'whatsapp ban'], question: 'Will I get banned?', answer: 'BotWave has advanced anti-ban protection: human-like typing delays, message variation, rate limiting, session warmup, activity hours simulation, and media fingerprint jittering. Your session runs from your own device IP, reducing ban risk.' },

  // Billing
  { keywords: ['price', 'pricing', 'plan', 'cost', 'pay', 'subscription', 'free', 'tier', 'upgrade'], question: 'What are the pricing plans?', answer: 'BotWave has a free tier with 300 messages/month, 10 AI queries/day, and 1 session. Paid plans start at just \u20A6500/month for more messages and features. Check your plan with !plan in chat.' },
  { keywords: ['referral', 'refer', 'invite', 'earn', 'reward', 'airtime'], question: 'How does the referral program work?', answer: 'Use !refer to get your unique referral link. Share it with friends \u2014 you earn \u20A620 per signup, they get \u20A610. Cash out at \u20A6100 for free airtime!' },

  // Privacy
  { keywords: ['privacy', 'data', 'read messages', 'secure', 'safe', 'spy', 'monitor'], question: 'Is my data safe?', answer: 'Your chats are completely private. BotWave only responds to commands \u2014 no messages are stored, read, or shared. The bot owner CANNOT read or access your messages. Your session runs from your own device IP with end-to-end encryption.' },
  { keywords: ['delete data', 'remove account', 'delete account', 'unsubscribe'], question: 'How do I delete my data?', answer: 'You can disconnect your WhatsApp session from the dashboard at any time. This removes your session data. For full account deletion, contact support through the chat widget.' },

  // General
  { keywords: ['what is botwave', 'about botwave', 'botwave'], question: 'What is BotWave?', answer: 'BotWave is a free WhatsApp bot automation platform. Connect your own WhatsApp number by scanning a QR code, and get 50+ commands: stickers, AI chat, media downloads, games, group management, and more. No coding needed!' },
  { keywords: ['nigeria', 'africa', 'naira', 'work in nigeria'], question: 'Does BotWave work in Nigeria?', answer: 'Yes! BotWave is built for Nigeria and Africa. Payments are in Naira (\u20A6), the platform is optimized for Nigerian internet speeds, and support is available in your timezone.' },
  { keywords: ['business', 'commercial', 'company', 'enterprise'], question: 'Can I use BotWave for my business?', answer: 'Absolutely! Use auto-replies for customer support, polls for feedback, AI chat for FAQs, stickers for branding. The Standard and Boss plans support multiple WhatsApp sessions and unlimited messages.' },
  { keywords: ['coding', 'developer', 'no code', 'programming', 'technical'], question: 'Do I need coding skills?', answer: 'No! BotWave is 100% no-code. Sign up, scan QR code, your bot is live. All configuration happens through the web dashboard.' },
  { keywords: ['contact', 'support', 'help', 'issue', 'problem', 'bug', 'report'], question: 'How do I contact support?', answer: 'Use the chat widget on www.botwave.online to create a support ticket. We typically reply within a few hours. You can also use !ask [question] in WhatsApp for instant answers.' },
  { keywords: ['diagnose', 'health', 'status', 'check', 'debug', 'system'], question: 'How do I check if the bot is healthy?', answer: 'Use !diagnose in WhatsApp to get a full system health report: bot uptime, Evolution API status, session count, worker health, and more. Use !ping for a quick alive check.' },
];

function searchKnowledge(query: string, limit = 3): KBEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const words = q.split(/\s+/).filter(w => w.length > 1);

  const scored = knowledgeBase.map(entry => {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += 10;
      else if (kw.includes(q)) score += 8;
    }
    for (const word of words) {
      for (const kw of entry.keywords) {
        if (kw.includes(word)) score += 3;
      }
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = typeof body.question === 'string' ? body.question.trim() : '';

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question is required' },
        { status: 400 },
      );
    }

    if (question.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Question too long (max 500 characters)' },
        { status: 400 },
      );
    }

    const results = searchKnowledge(question);

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          answer: "I couldn't find an answer for that. Try rephrasing your question, or create a support ticket for help from our team!",
          confidence: 0,
          related: [],
        },
      });
    }

    const best = results[0];
    const related = results.slice(1).map(r => r.question);

    return NextResponse.json({
      success: true,
      data: {
        answer: best.answer,
        confidence: 1,
        question: best.question,
        related,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 },
    );
  }
}
