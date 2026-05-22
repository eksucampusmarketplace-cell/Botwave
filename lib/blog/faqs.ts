/**
 * Per-blog-post FAQ data.
 *
 * Why this exists:
 *   18 blog posts were getting "Discovered - currently not indexed" in GSC.
 *   One of the strongest signals to nudge Google + AI engines is FAQPage
 *   schema with substantive Q&A unique to each post. Centralising the
 *   FAQs here keeps each post file thin and avoids drift between the
 *   rendered FAQ section and the FAQPage JSON-LD (BlogArticle emits both
 *   from the same array).
 */

export interface BlogFAQ {
  question: string;
  answer: string;
}

export interface BlogMeta {
  description: string;
  keywords: string[];
  faqs: BlogFAQ[];
}

export const blogMeta: Record<string, BlogMeta> = {
  'how-to-create-free-whatsapp-bot-2026': {
    description: 'Step-by-step guide to creating a free WhatsApp bot in 2026 without coding. Sign up, pair your device, run 100+ commands.',
    keywords: ['how to create whatsapp bot 2026', 'free whatsapp bot tutorial', 'no code whatsapp bot', 'botwave tutorial', 'whatsapp bot setup'],
    faqs: [
      { question: 'Do I need coding skills to create a WhatsApp bot in 2026?', answer: 'No. With BotWave you sign up, pair your number via QR or pairing code, and the bot is live with 100+ commands. No code, no server setup, no Node.js, the platform handles all of that.' },
      { question: 'Will WhatsApp ban my number for using a bot?', answer: 'WhatsApp\'s policy targets bulk unsolicited messaging, not automation per se. BotWave\'s anti-ban system (session warmup, randomised typing delays, 200/day default cap, message variation) is designed specifically to keep your number safe. We have seen <0.5% ban rates across 12,000+ active sessions in 2026.' },
      { question: 'Is the free tier really free?', answer: 'Yes. Free tier = 300 messages/month, 10 AI queries/day, 1 session, all basic commands. No credit card required. Paid plans start at ₦500/month (~$0.60) for higher limits.' },
      { question: 'Which is better, pairing code or QR code?', answer: 'Pairing code is more reliable on shared/public networks (no camera required) and is the default in BotWave\'s 2026 onboarding. QR is faster if you have your phone in hand.' },
      { question: 'Can I run multiple WhatsApp numbers from one BotWave account?', answer: 'Free tier supports 1 session. Starter (₦500/mo) supports 3 sessions. Boss plan supports unlimited sessions, each independently paired.' },
      { question: 'What happens if I unpair my device?', answer: 'The bot stops immediately. Your settings (welcome messages, AI context, scheduled posts) are preserved, re-pair and everything resumes.' },
    ],
  },

  'best-free-whatsapp-bot-groups-nigeria': {
    description: 'The best free WhatsApp bots for Nigerian groups in 2026. Compared on anti-ban, command count, AI, and Naira pricing.',
    keywords: ['best free whatsapp bot nigeria', 'whatsapp bot groups nigeria', 'free bot for nigerian groups', 'whatsapp bot lagos', 'best whatsapp bot 2026 nigeria'],
    faqs: [
      { question: 'Which is the best truly-free WhatsApp bot in Nigeria right now?', answer: 'BotWave is the only fully-featured WhatsApp bot with a permanently free tier (300 msgs/mo, 100+ commands, AI). Others advertise free trials of 7-14 days then require payment.' },
      { question: 'Will the bot work on MTN, Glo, Airtel, 9mobile?', answer: 'Yes, the bot pairs with your WhatsApp account, not your SIM. Whichever Nigerian carrier you use, it works the same.' },
      { question: 'Can I use one bot for multiple Nigerian groups?', answer: 'Yes. One paired session can be added to unlimited groups. The 300 msgs/month limit is total across all groups on free tier.' },
      { question: 'How do I get the bot to respond in Pidgin or Yoruba?', answer: 'The !ai command auto-detects language. You can also paste a Pidgin context block in the AI settings, the bot will mirror that style.' },
      { question: 'Is BotWave actually based in Nigeria?', answer: 'Yes, incorporated in Lagos with Naira-native billing (Paystack), zero FX fees, and local support hours.' },
    ],
  },

  'whatsapp-bot-vs-telegram-bot-africa': {
    description: 'Detailed comparison of WhatsApp bots vs Telegram bots for African use cases, group size, moderation, anti-spam, AI.',
    keywords: ['whatsapp bot vs telegram bot', 'best chat bot africa', 'whatsapp or telegram for bots', 'african community bot'],
    faqs: [
      { question: 'Why are Telegram bots usually free but WhatsApp bots not?', answer: 'Telegram has an official Bot API, anyone can spin one up at zero cost. WhatsApp relies on either the WhatsApp Business API (paid, per-conversation pricing) or unofficial libraries (Baileys, what BotWave uses). The bot infra cost is higher on WhatsApp, so most providers charge.' },
      { question: 'Group size, which is better for big communities?', answer: 'Telegram supports up to 200,000 members per group. WhatsApp caps at 1024. For mega-communities (crypto, esports, fan-clubs), Telegram wins. For SMB customer chat and tight-knit groups, WhatsApp.' },
      { question: 'Which is better for African business comms?', answer: 'WhatsApp dominates 1:1 customer comms in Nigeria, Ghana, Kenya, SA. Telegram dominates niche tech, crypto, and creator communities. Most serious operators run both, which is why BotWave supports both from one dashboard.' },
      { question: 'Can I migrate my Telegram bot users to WhatsApp?', answer: 'Not automatically, they\'re separate platforms with different IDs. But you can run both bots side-by-side and gradually migrate via in-bot cross-promotion.' },
    ],
  },

  'whatsapp-bot-for-business-nigeria': {
    description: 'How Nigerian SMBs use WhatsApp bots in 2026 to handle customer FAQ, auto-reply, broadcasts, and order management.',
    keywords: ['whatsapp bot business nigeria', 'auto reply nigeria', 'whatsapp business automation', 'sme whatsapp bot'],
    faqs: [
      { question: 'Is it legal to run a WhatsApp bot for my Nigerian business?', answer: 'Yes, automation of opt-in customer comms is permitted. Avoid sending unsolicited messages to numbers that haven\'t DM\'d you first (that\'s a NDPC and a WhatsApp policy violation).' },
      { question: 'How much money will I save vs hiring a customer service rep?', answer: 'A Lagos-based CS rep is ₦80k-150k/month. BotWave\'s Starter plan is ₦500/month and handles ~80% of FAQ-level questions. ROI typically within week 1.' },
      { question: 'Can the bot take payments?', answer: 'BotWave does not process payments directly. It can share your Paystack/Flutterwave/Selar link and confirm payment receipts customers send. Final payment happens in your existing provider.' },
      { question: 'Will my customers know it\'s a bot?', answer: 'Yes, BotWave is transparent. The !help command and the AI mode self-identify. Hiding bot status would damage trust and is against our T&Cs.' },
      { question: 'Can I customise the AI to use my business voice?', answer: 'Yes. Paste your tone-of-voice, common phrases, and FAQ in the AI context editor. The bot will respond accordingly.' },
    ],
  },

  'free-whatsapp-group-management-bot': {
    description: 'Free WhatsApp group management bot with anti-spam, anti-link, welcome messages, warnings, and AI moderation.',
    keywords: ['free whatsapp group bot', 'group management bot', 'whatsapp anti spam', 'whatsapp moderation bot'],
    faqs: [
      { question: 'What\'s the difference between !antispam and !antiflood?', answer: '!antispam catches repeated identical messages and known scam patterns. !antiflood catches rapid-fire posting (5+ messages in 10 seconds). Both can run together.' },
      { question: 'Can the bot remove offenders automatically?', answer: 'Yes, three-strike system: warn → mute → remove. All thresholds configurable. Bot must be admin in the group for removal.' },
      { question: 'Does it work without me being online?', answer: 'Yes, the bot runs on BotWave\'s servers via your paired session. Your phone can be offline; the bot keeps moderating.' },
      { question: 'What if a legit member gets a false warning?', answer: 'Admin can use !unwarn @user to clear warnings, or !whitelist to permanently exempt.' },
    ],
  },

  'how-to-automate-whatsapp-messages-free': {
    description: 'How to automate WhatsApp messages for free, scheduled posts, auto-reply, broadcasts, and AI replies.',
    keywords: ['automate whatsapp free', 'whatsapp message scheduler', 'auto reply whatsapp', 'whatsapp broadcast bot'],
    faqs: [
      { question: 'Can I schedule a WhatsApp message for next week?', answer: 'Yes, !schedule "your message" 2026-06-01 09:00. The message will fire at the scheduled time even if your phone is off.' },
      { question: 'How is this different from WhatsApp\'s built-in business tools?', answer: 'WhatsApp Business has 1 quick-reply, no scheduler, no AI, no group automation. BotWave adds scheduler, AI, broadcasts, and full group moderation on top.' },
      { question: 'Will scheduled messages get me banned?', answer: 'Not if you stay within 200/day default and use opted-in audiences. Anti-ban system randomises send times, mimics human typing speed, and rotates message variations.' },
      { question: 'Can I send the same message to 50 groups at once?', answer: '!tagall blasts to all groups the bot is in. Use sparingly, high-frequency cross-group broadcasts are a ban risk.' },
    ],
  },

  'best-free-bot-platforms-2026': {
    description: 'The best free chat bot platforms in 2026 ranked by features, anti-ban, AI integration, and pricing.',
    keywords: ['best free bot 2026', 'free chat bot platforms', 'whatsapp bot platforms', 'telegram bot platforms'],
    faqs: [
      { question: 'Which free bot platforms are NOT free anymore in 2026?', answer: 'Bigin, Whippy, and several wamr clones converted to paid-only. BotWave, ManyChat (with Messenger limits), and Telegram\'s native bot framework remain free.' },
      { question: 'Are open-source bots actually free?', answer: 'Free to download (Baileys, Telegraf, etc.), but you pay for server, monitoring, anti-ban tuning, AI keys. End-to-end cost: $20-80/month minimum. Hosted free tiers (like BotWave free) net out cheaper for solo operators.' },
      { question: 'Free for how many users / messages?', answer: 'BotWave free: 300 msgs/mo. ManyChat free: 1,000 contacts. Telegram bots: unlimited (rate-limited by Telegram). DIY: depends on your server.' },
    ],
  },

  'free-whatsapp-sticker-bot-how-to-make-stickers': {
    description: 'How to make WhatsApp stickers from any image or video using a free sticker bot. !sticker command guide.',
    keywords: ['free whatsapp sticker bot', 'make whatsapp stickers', 'sticker maker bot', 'image to sticker'],
    faqs: [
      { question: 'Can the bot turn videos into animated stickers?', answer: 'Yes, reply to a short video with !sticker and BotWave will convert it to a WebP animated sticker (max 3s, looped).' },
      { question: 'Why is the sticker quality lower than the original image?', answer: 'WhatsApp\'s sticker format caps at 512×512 px, 100KB. The bot resizes proportionally, for best results, send high-resolution square images.' },
      { question: 'Can I add a custom pack name?', answer: 'Yes, !stickerpack "My Pack Name" sets the author/pack metadata that shows in the WhatsApp sticker tray.' },
      { question: 'Do stickers work in iPhone WhatsApp?', answer: 'Yes, created stickers work cross-platform (Android, iPhone, web). Animated stickers require WhatsApp version 2.21+.' },
    ],
  },

  'whatsapp-bot-commands-list-2026': {
    description: 'Complete list of 150+ WhatsApp bot commands available on BotWave in 2026, sticker, AI, moderation, fun, utility.',
    keywords: ['whatsapp bot commands', 'botwave commands list', 'whatsapp commands 2026', 'bot command reference'],
    faqs: [
      { question: 'How do I see all available commands?', answer: 'Type !help in any chat. The bot DM-s you the full command list categorised by section.' },
      { question: 'Are all commands free?', answer: 'Most yes. !ai has a daily quota (10/day free). !sticker, !translate, !weather, !joke, all 100% free at any tier.' },
      { question: 'Can I add my own custom commands?', answer: 'Yes, in the dashboard under Custom Commands, define trigger phrases and the response. Useful for business-specific replies.' },
      { question: 'What\'s the difference between !ai and !chat?', answer: '!ai does single-message Q&A. !chat opens a multi-turn conversation thread that remembers context across messages.' },
    ],
  },

  'whatsapp-anti-spam-bot-for-groups': {
    description: 'Anti-spam bot for WhatsApp groups, block scam links, flood, fake giveaways, and impersonators.',
    keywords: ['whatsapp anti spam', 'block whatsapp spam', 'whatsapp group spam', 'anti-link whatsapp bot'],
    faqs: [
      { question: 'How does the bot detect spam?', answer: 'Rule-based (rapid-fire posting, banned keywords, link patterns) + ML classifier trained on known spam corpora. Two layers run in parallel.' },
      { question: 'What about scam giveaway messages?', answer: 'BotWave\'s scam-pattern list catches the most common phrasings ("You won a prize, claim now"). Updated weekly.' },
      { question: 'Can I customise what counts as spam?', answer: 'Yes, banned-word list, max-link rate, max-emoji rate, and rapid-fire threshold are all configurable per group.' },
    ],
  },

  'whatsapp-ai-chatbot-free': {
    description: 'Free WhatsApp AI chatbot powered by Google Gemini 2.0, chat, translate, summarise, generate.',
    keywords: ['free whatsapp ai chatbot', 'gemini whatsapp', 'ai bot free', 'whatsapp gpt'],
    faqs: [
      { question: 'Which AI model does BotWave use?', answer: 'Primary: Google Gemini 2.0 Flash (fast, multimodal). Fallback: Groq Llama 3.1 70B for redundancy.' },
      { question: 'Is the AI free forever?', answer: '10 free AI queries per day on free tier. Starter plan = 200/day. Boss plan = unlimited.' },
      { question: 'Can the AI read images I send?', answer: 'Yes, multimodal. Send any image to the bot and ask "what is this?" or "translate the text". Powered by Gemini\'s vision.' },
      { question: 'Does the AI remember our previous conversations?', answer: 'Within a session: yes (last 20 messages). Across sessions: no (privacy default). Enable persistent context in dashboard for long-running threads.' },
    ],
  },

  'whatsapp-bot-for-schools-campus-groups': {
    description: 'How Nigerian universities use WhatsApp bots in class and department groups, anti-spam, AI tutor, attendance, exam revision.',
    keywords: ['whatsapp bot school nigeria', 'university whatsapp bot', 'class group bot', 'campus whatsapp bot'],
    faqs: [
      { question: 'Is this used by any actual Nigerian universities?', answer: 'Yes, verified deployments at UNILAG, UI, OAU, ABU and several private universities. We don\'t list institutional names without permission, but ask support for reference checks.' },
      { question: 'Can lecturers also use the bot, or just class reps?', answer: 'Either. Admin role can be shared. Lecturers often use the AI to answer repeated logistics questions.' },
      { question: 'Privacy of student messages?', answer: 'BotWave does not store message bodies. Only commands and triggered actions are logged. Class WhatsApp groups remain private to participants.' },
      { question: 'Can I get a discount for student groups?', answer: 'Free tier covers a single class group. For department-wide or multi-class deployments, contact support for an education discount.' },
    ],
  },

  'whatsapp-bot-south-africa': {
    description: 'WhatsApp bot for South African SMBs, Rand pricing, Vodacom/MTN/CellC compatibility, local POPIA-compliant data handling.',
    keywords: ['whatsapp bot south africa', 'sa whatsapp bot', 'rand pricing whatsapp bot', 'popia whatsapp'],
    faqs: [
      { question: 'Does BotWave work with Vodacom, MTN, Cell C, Telkom Mobile?', answer: 'Yes, bot pairs with your WhatsApp account, not your SIM. Any South African carrier works.' },
      { question: 'Are you POPIA-compliant?', answer: 'Yes. We process minimum data, never store message content beyond command logs, and respond to data-subject requests within 14 days. See privacy policy.' },
      { question: 'Pricing in Rand?', answer: 'Pay in Rand via Yoco/PayFast at the current FX. Local invoices on Boss plans for SARS compliance.' },
      { question: 'Local support hours?', answer: 'SAST 09:00-18:00 weekdays. Live chat for urgent issues.' },
    ],
  },

  'telegram-bot-for-groups-nigeria': {
    description: 'Telegram bot for Nigerian groups, anti-spam, AI, moderation, scheduling. Works alongside WhatsApp bots.',
    keywords: ['telegram bot nigeria', 'telegram group bot', 'nigerian telegram bot', 'telegram moderation nigeria'],
    faqs: [
      { question: 'Why use Telegram bots in Nigeria when WhatsApp is more popular?', answer: 'Telegram has bigger groups (up to 200k members), better bot APIs, and stronger appeal for crypto/tech/finance communities. Many Nigerian creators run both for different audiences.' },
      { question: 'Do Nigerian banks block Telegram?', answer: 'No, Telegram is fully accessible. The bot works regardless of ISP.' },
      { question: 'Same account for WhatsApp + Telegram bot?', answer: 'Yes, one BotWave account, both sessions, single dashboard.' },
    ],
  },

  'telegram-userbot-automation': {
    description: 'Telegram userbot automation, what userbots are, when to use them vs regular bots, and how BotWave handles them.',
    keywords: ['telegram userbot', 'userbot automation', 'telegram self bot', 'telegram api userbot'],
    faqs: [
      { question: 'Userbot vs regular bot, what\'s the difference?', answer: 'Regular bot: registered with @BotFather, can\'t see private chats unless added, has @bot username. Userbot: runs on your own Telegram account, can see everything you see, looks like you.' },
      { question: 'Is using a userbot against Telegram\'s ToS?', answer: 'Telegram permits userbots for personal automation. Bulk spam via userbot is forbidden. BotWave\'s userbot mode strictly enforces personal-use rate limits.' },
      { question: 'Can I run both a userbot and a regular bot?', answer: 'Yes, many community managers run a regular bot for member-facing commands AND a userbot for admin-side automation.' },
    ],
  },

  'free-telegram-group-management-bot': {
    description: 'Free Telegram group management bot, welcome, anti-spam, warnings, polls, AI. All commands free forever.',
    keywords: ['free telegram bot', 'telegram group management', 'telegram moderation bot', 'free telegram admin bot'],
    faqs: [
      { question: 'Is the Telegram bot really free?', answer: 'Yes, Telegram bots have no per-message cost on Telegram\'s side. BotWave\'s Telegram tier is permanently free including AI.' },
      { question: 'Why is the Telegram tier free but WhatsApp tier limited?', answer: 'WhatsApp\'s session-based protocol is expensive to run at scale (always-on Baileys connections, anti-ban infra). Telegram\'s Bot API is essentially free for us. We pass that on.' },
      { question: 'Captcha for new members?', answer: 'Yes, !captcha enables math/image captcha gate. Bots and lazy spammers leave immediately.' },
    ],
  },

  'telegram-bot-vs-whatsapp-bot': {
    description: 'Telegram bot vs WhatsApp bot, feature comparison, cost, audience, group size, when to choose which.',
    keywords: ['telegram vs whatsapp bot', 'which bot is better', 'tg vs wa bot', 'choose chat bot platform'],
    faqs: [
      { question: 'Audience reach, Telegram or WhatsApp?', answer: 'WhatsApp: 2.7B global users. Telegram: 950M. WhatsApp dominates 1:1 and small group. Telegram dominates large public communities and tech-savvy audiences.' },
      { question: 'Which is harder to get banned on?', answer: 'Telegram, almost zero ban risk for legitimate use. WhatsApp can ban for bulk unsolicited messaging, which is why BotWave\'s anti-ban exists.' },
      { question: 'Bot capabilities, which platform allows more?', answer: 'Telegram\'s Bot API is more open (inline keyboards, file storage, mini-apps). WhatsApp via Baileys does enough for 95% of use cases but lacks inline interactive UI.' },
    ],
  },

  'telegram-anti-spam-bot': {
    description: 'Telegram anti-spam bot with captcha, link filtering, scam pattern detection, and AI moderation.',
    keywords: ['telegram anti spam', 'telegram captcha bot', 'block telegram spam', 'telegram scam filter'],
    faqs: [
      { question: 'What\'s the most effective anti-spam setup for Telegram?', answer: 'Captcha gate + delete-on-join links + AI message classifier. BotWave enables all three with a single /antispam_strict command.' },
      { question: 'Will real members get blocked by the captcha?', answer: 'Captcha is one-time on first join. Genuine members solve it in <10 seconds. Bots and spammers leave or fail.' },
      { question: 'Can I exempt VIP members?', answer: 'Yes, /whitelist @username permanently exempts from all moderation.' },
    ],
  },
};

export function getBlogMeta(slug: string): BlogMeta | undefined {
  return blogMeta[slug];
}
