export interface FAQItem {
  slug: string;
  question: string;
  answer: string;
  category: string;
  seoKeywords: string[];
  relatedFaqs: string[];
}

export const faqItems: FAQItem[] = [
  {
    slug: 'can-whatsapp-ban-bots',
    question: 'Can WhatsApp ban my account for using a bot?',
    answer: `Yes, WhatsApp can ban accounts that violate their Terms of Service. Automated messaging from unofficial APIs is technically against their rules. However, the risk depends heavily on HOW the bot behaves.

BotWave reduces ban risk significantly with several techniques:

**Your device, your IP**: Your WhatsApp session runs from your own device via QR code. You are not sharing a server IP with other bot users. This is the single biggest factor in avoiding bans.

**Session warmup**: New sessions start slow (15 messages/day) and gradually increase to 200 over 7 days. This mimics natural usage patterns.

**Human-like behavior**: Random delays, typing indicators, read receipts, occasional "distracted" pauses, quiet hours at night. The bot behaves like a real person.

**Message variation**: 50-100 different response templates per command. No two messages are identical.

**Daily limits**: Hard cap of 200 messages/day keeps you well within normal usage.

No bot platform can guarantee zero ban risk on WhatsApp. But BotWave's anti-ban system makes it significantly safer than running raw automation code.`,
    category: 'Safety',
    seoKeywords: ['can whatsapp ban bots', 'whatsapp bot ban risk', 'is whatsapp bot safe', 'whatsapp bot ban'],
    relatedFaqs: ['how-anti-ban-works', 'is-botwave-safe', 'why-qr-disconnects'],
  },
  {
    slug: 'how-anti-ban-works',
    question: 'How does the BotWave anti-ban system work?',
    answer: `The anti-ban system has multiple layers that work together to make the bot look like a real human user:

**Session Warmup** (7 days)
New sessions are limited to 15 messages per day. Each day, the limit increases until it reaches 200 messages/day after 7 days. This prevents WhatsApp from flagging a sudden spike in activity from a new linked device.

**Human-Like Timing**
- Random delays of 1-5 seconds before each reply
- 5% chance of a 15-30 second "distracted" delay
- 3% chance of a 30-60 second delay
- Read receipts sent before typing indicators
- Typing duration proportional to message length

**Read-But-Skip**
15% of the time in group chats, the bot reads a message but does not respond. Real people do not reply to every message in a group.

**Message Variation**
Each command has 50-100 different response templates. Variables like {name}, {time}, and {date} are injected dynamically. Occasional typos and casual phrasing are added. Zero-width characters ensure every message has a unique byte fingerprint.

**Media Fingerprint Jittering**
Random bytes are appended to stickers and images so each file has a unique hash. WhatsApp cannot detect them as bot-generated copies.

**Activity Hours**
The bot is quieter between 12am-6am (local time). Responses are shorter and slower during these hours, mimicking real sleep patterns.

**Daily Cap**
Hard limit of 200 messages per day per session. Combined with warmup, this keeps activity within normal human usage patterns.`,
    category: 'Safety',
    seoKeywords: ['anti ban system', 'whatsapp anti ban', 'how anti ban works', 'bot ban protection'],
    relatedFaqs: ['can-whatsapp-ban-bots', 'is-botwave-safe', 'daily-message-limits'],
  },
  {
    slug: 'is-botwave-safe',
    question: 'Is BotWave safe to use? Does it read my messages?',
    answer: `**BotWave does not store your messages.** All message processing happens in memory and is discarded immediately after the bot responds.

Here is what BotWave can and cannot access:

**What BotWave can see:**
- Messages sent in groups where the bot is active (needed to detect commands)
- Your WhatsApp session token (needed to maintain the connection)

**What BotWave cannot do:**
- Read your private messages (unless you send a command in a private chat)
- Access your WhatsApp contacts
- Send messages without your bot being active
- Access your phone data

**Security measures:**
- Session credentials are stored in Supabase with row-level security (only you can access your own sessions)
- API communication is encrypted
- No plain-text secrets stored
- Your QR session runs from your own device IP

BotWave is built by a small indie team focused on the African market. We have no interest in your message data. The bot only processes messages that start with the ! prefix.`,
    category: 'Safety',
    seoKeywords: ['is botwave safe', 'botwave privacy', 'whatsapp bot safety', 'botwave security'],
    relatedFaqs: ['can-whatsapp-ban-bots', 'how-anti-ban-works', 'how-data-is-handled'],
  },
  {
    slug: 'why-qr-disconnects',
    question: 'Why does the QR connection keep disconnecting?',
    answer: `WhatsApp QR connections (linked devices) can disconnect for several reasons:

**Common causes:**
1. **Phone lost internet** - Your phone must stay connected to WiFi or mobile data. WhatsApp requires the phone to have internet for linked devices to work.
2. **WhatsApp app update** - Major WhatsApp updates sometimes reset linked devices. You will need to rescan.
3. **Too many linked devices** - WhatsApp allows up to 4 linked devices. If you have 4 already, remove one.
4. **14-day inactivity** - If your phone does not open WhatsApp for 14 days, linked devices disconnect.
5. **Phone number change** - Changing your WhatsApp number disconnects all linked devices.

**How to fix it:**
1. Open WhatsApp on your phone
2. Go to Settings > Linked Devices
3. Remove the old BotWave session if it shows
4. Go to your BotWave dashboard
5. Click "Reconnect" or "Re-scan QR"
6. Scan the new QR code

**Preventing disconnections:**
- Keep your phone connected to internet at all times
- Do not remove linked devices from WhatsApp settings while the bot is running
- Check your dashboard periodically to make sure the session is "Active"`,
    category: 'Troubleshooting',
    seoKeywords: ['whatsapp qr disconnect', 'whatsapp linked device disconnected', 'qr code not working', 'whatsapp bot disconnecting'],
    relatedFaqs: ['can-whatsapp-ban-bots', 'how-to-reconnect', 'is-botwave-safe'],
  },
  {
    slug: 'how-to-reconnect',
    question: 'How do I reconnect a disconnected session?',
    answer: `If your bot session shows as "Disconnected" in the dashboard:

**Quick fix:**
1. Go to your BotWave dashboard
2. Find the disconnected session
3. Click "Reconnect"
4. If that works, you are done

**If reconnect does not work:**
1. Open WhatsApp on your phone
2. Go to Settings > Linked Devices
3. Remove the old BotWave session
4. Go back to the BotWave dashboard
5. Click "Connect WhatsApp"
6. Scan the new QR code

**For Telegram Bot:**
Telegram bot sessions rarely disconnect. If yours did:
1. Check that your bot token is still valid (ask @BotFather)
2. If the token was revoked, generate a new one
3. Update the token in your BotWave dashboard

**For Telegram Userbot:**
Userbot sessions auto-reconnect when the server restarts. If yours does not:
1. Go to your dashboard
2. Check the session status
3. If it shows disconnected, re-enter your API credentials`,
    category: 'Troubleshooting',
    seoKeywords: ['reconnect whatsapp bot', 'bot disconnected fix', 'whatsapp session expired', 'reconnect bot session'],
    relatedFaqs: ['why-qr-disconnects', 'can-whatsapp-ban-bots', 'is-botwave-safe'],
  },
  {
    slug: 'daily-message-limits',
    question: 'What are the daily message limits?',
    answer: `BotWave has message limits to protect your account from bans and to maintain fair usage:

**Free Plan:**
- 300 messages per month
- 10 AI queries per day
- 1 WhatsApp session

**Standard Plan (N500/month):**
- Unlimited messages
- 100 AI queries per day
- 3 WhatsApp sessions

**Boss Plan (N2,000/month):**
- Unlimited messages
- Unlimited AI queries
- 10 WhatsApp sessions

**Anti-ban limits (all plans):**
Regardless of your plan, the anti-ban system enforces these safety limits:
- 200 messages per day per session (hard cap)
- 10 messages per minute per session
- 20 messages per minute per user
- New sessions: starts at 15/day, increases to 200 over 7 days (warmup)

These limits exist to protect your WhatsApp account, not to upsell you.`,
    category: 'Pricing',
    seoKeywords: ['botwave message limits', 'whatsapp bot limits', 'how many messages bot', 'botwave pricing limits'],
    relatedFaqs: ['how-anti-ban-works', 'can-whatsapp-ban-bots', 'how-much-does-botwave-cost'],
  },
  {
    slug: 'how-much-does-botwave-cost',
    question: 'How much does BotWave cost?',
    answer: `BotWave has a free tier and two paid plans, all priced in Nigerian Naira:

**Free - N0 forever**
- 1 WhatsApp session
- 300 messages per month
- 10 AI queries per day
- All basic commands
- Community support

**Standard - N500/month**
- 3 WhatsApp sessions
- Unlimited messages
- 100 AI queries per day
- Priority support
- Custom commands

**Boss - N2,000/month**
- 10 WhatsApp sessions
- Unlimited everything
- Unlimited AI queries
- Dedicated support
- White-label option

Telegram Bot and Telegram Userbot connections are included in all plans.

You can start free and upgrade when you need more sessions or higher limits.`,
    category: 'Pricing',
    seoKeywords: ['botwave pricing', 'botwave cost', 'whatsapp bot price nigeria', 'botwave free plan'],
    relatedFaqs: ['daily-message-limits', 'is-botwave-safe', 'what-platforms-supported'],
  },
  {
    slug: 'what-platforms-supported',
    question: 'What platforms does BotWave support?',
    answer: `BotWave supports three platforms from one dashboard:

**1. WhatsApp Bot**
- Connect via QR code scan
- Uses Baileys (WebSocket protocol)
- 80+ commands
- Anti-ban protection included
- Prefix: !

**2. Telegram Bot**
- Connect via @BotFather token
- Uses official Telegram Bot API
- Zero ban risk
- 50+ commands
- Prefix: /

**3. Telegram Userbot**
- Connect via API ID and API Hash from my.telegram.org
- Uses MTProto protocol (GramJS)
- Automates your real Telegram account
- Admin actions, global bans, purge, PM permit
- Prefix: .

All three platforms are managed from the same BotWave dashboard. You can have one, two, or all three running at the same time.`,
    category: 'General',
    seoKeywords: ['botwave platforms', 'whatsapp telegram bot', 'multi platform bot', 'botwave supported platforms'],
    relatedFaqs: ['how-much-does-botwave-cost', 'is-botwave-safe', 'daily-message-limits'],
  },
  {
    slug: 'how-data-is-handled',
    question: 'How does BotWave handle my data?',
    answer: `**Messages:** BotWave processes messages in memory only. Nothing is stored. Once the bot responds (or ignores the message), the message data is discarded.

**Session credentials:** Your WhatsApp session token and Telegram API credentials are stored in Supabase (PostgreSQL) with row-level security. Only your authenticated account can access your sessions.

**Account data:** Your email, name, and plan info are stored for account management. Standard stuff.

**What we never store:**
- Message content or history
- Contact lists
- Media files (processed in memory, then discarded)
- Phone numbers of group members

**What we never share:**
- Any of your data with third parties
- Session tokens or credentials
- Usage patterns or analytics

BotWave is built for WhatsApp communities in Africa. Trust is everything to us. We keep it simple: your data stays yours.`,
    category: 'Safety',
    seoKeywords: ['botwave data privacy', 'botwave data handling', 'whatsapp bot data', 'is my data safe botwave'],
    relatedFaqs: ['is-botwave-safe', 'can-whatsapp-ban-bots', 'how-anti-ban-works'],
  },
];

export function getFaqBySlug(slug: string): FAQItem | undefined {
  return faqItems.find(f => f.slug === slug);
}

export function getFaqsByCategory(category: string): FAQItem[] {
  return faqItems.filter(f => f.category === category);
}

export function getAllFaqCategories(): string[] {
  return [...new Set(faqItems.map(f => f.category))];
  // ── Programmatic SEO: Additional FAQ entries ──
  { slug: 'what-is-botwave', question: 'What is BotWave?', answer: 'Comprehensive answer to: What is BotWave? Learn everything you need to know about this topic with BotWave.', seoTitle: 'What is BotWave? - BotWave FAQ', seoDescription: 'What is BotWave? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['what is botwave', 'botwave bot'], category: 'General' },
  { slug: 'is-botwave-free', question: 'Is BotWave free to use?', answer: 'Comprehensive answer to: Is BotWave free to use? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Is BotWave free to use? - BotWave FAQ', seoDescription: 'Is BotWave free to use? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['is botwave free', 'botwave pricing'], category: 'General' },
  { slug: 'how-many-groups', question: 'How many groups can BotWave manage?', answer: 'Comprehensive answer to: How many groups can BotWave manage? Learn everything you need to know about this topic with BotWave.', seoTitle: 'How many groups can BotWave manage? - BotWave FAQ', seoDescription: 'How many groups can BotWave manage? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave group limit', 'how many groups'], category: 'General' },
  { slug: 'supported-platforms', question: 'Which platforms does BotWave support?', answer: 'Comprehensive answer to: Which platforms does BotWave support? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Which platforms does BotWave support? - BotWave FAQ', seoDescription: 'Which platforms does BotWave support? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave platforms', 'whatsapp telegram bot'], category: 'General' },
  { slug: 'botwave-vs-other-bots', question: 'How is BotWave different from other bots?', answer: 'Comprehensive answer to: How is BotWave different from other bots? Learn everything you need to know about this topic with BotWave.', seoTitle: 'How is BotWave different from other bots? - BotWave FAQ', seoDescription: 'How is BotWave different from other bots? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave comparison', 'best bot platform'], category: 'General' },
  { slug: 'reconnect-session', question: 'How do I reconnect a disconnected session?', answer: 'Comprehensive answer to: How do I reconnect a disconnected session? Learn everything you need to know about this topic with BotWave.', seoTitle: 'How do I reconnect a disconnected session? - BotWave FAQ', seoDescription: 'How do I reconnect a disconnected session? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['reconnect session', 'fix disconnected bot'], category: 'WhatsApp' },
  { slug: 'whatsapp-business-vs-regular', question: 'Does BotWave work with WhatsApp Business?', answer: 'Comprehensive answer to: Does BotWave work with WhatsApp Business? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Does BotWave work with WhatsApp Business? - BotWave FAQ', seoDescription: 'Does BotWave work with WhatsApp Business? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['whatsapp business bot', 'botwave business'], category: 'WhatsApp' },
  { slug: 'multiple-whatsapp-numbers', question: 'Can I use multiple WhatsApp numbers?', answer: 'Comprehensive answer to: Can I use multiple WhatsApp numbers? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Can I use multiple WhatsApp numbers? - BotWave FAQ', seoDescription: 'Can I use multiple WhatsApp numbers? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['multiple whatsapp numbers', 'multi number bot'], category: 'WhatsApp' },
  { slug: 'bot-reads-my-messages', question: 'Does the bot read my private messages?', answer: 'Comprehensive answer to: Does the bot read my private messages? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Does the bot read my private messages? - BotWave FAQ', seoDescription: 'Does the bot read my private messages? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['bot reads messages', 'botwave privacy'], category: 'Privacy' },
  { slug: 'data-storage', question: 'Where is my data stored?', answer: 'Comprehensive answer to: Where is my data stored? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Where is my data stored? - BotWave FAQ', seoDescription: 'Where is my data stored? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave data storage', 'where data stored'], category: 'Privacy' },
  { slug: 'delete-my-data', question: 'How do I delete my data from BotWave?', answer: 'Comprehensive answer to: How do I delete my data from BotWave? Learn everything you need to know about this topic with BotWave.', seoTitle: 'How do I delete my data from BotWave? - BotWave FAQ', seoDescription: 'How do I delete my data from BotWave? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['delete botwave data', 'remove bot data'], category: 'Privacy' },
  { slug: 'telegram-bot-token', question: 'How do I get a Telegram bot token?', answer: 'Comprehensive answer to: How do I get a Telegram bot token? Learn everything you need to know about this topic with BotWave.', seoTitle: 'How do I get a Telegram bot token? - BotWave FAQ', seoDescription: 'How do I get a Telegram bot token? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['telegram bot token', 'get telegram token'], category: 'Telegram' },
  { slug: 'telegram-bot-vs-userbot', question: 'What is the difference between bot and userbot?', answer: 'Comprehensive answer to: What is the difference between bot and userbot? Learn everything you need to know about this topic with BotWave.', seoTitle: 'What is the difference between bot and userbot? - BotWave FAQ', seoDescription: 'What is the difference between bot and userbot? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['telegram bot vs userbot', 'userbot difference'], category: 'Telegram' },
  { slug: 'telegram-userbot-safe', question: 'Is using a Telegram userbot safe?', answer: 'Comprehensive answer to: Is using a Telegram userbot safe? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Is using a Telegram userbot safe? - BotWave FAQ', seoDescription: 'Is using a Telegram userbot safe? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['telegram userbot safe', 'is userbot safe'], category: 'Telegram' },
  { slug: 'telegram-bot-admin', question: 'Does my Telegram bot need admin rights?', answer: 'Comprehensive answer to: Does my Telegram bot need admin rights? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Does my Telegram bot need admin rights? - BotWave FAQ', seoDescription: 'Does my Telegram bot need admin rights? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['telegram bot admin', 'bot admin permissions'], category: 'Telegram' },
  { slug: 'telegram-api-id', question: 'How do I get Telegram API ID and hash?', answer: 'Comprehensive answer to: How do I get Telegram API ID and hash? Learn everything you need to know about this topic with BotWave.', seoTitle: 'How do I get Telegram API ID and hash? - BotWave FAQ', seoDescription: 'How do I get Telegram API ID and hash? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['telegram api id', 'telegram api hash'], category: 'Telegram' },
  { slug: 'what-commands-available', question: 'What commands are available?', answer: 'Comprehensive answer to: What commands are available? Learn everything you need to know about this topic with BotWave.', seoTitle: 'What commands are available? - BotWave FAQ', seoDescription: 'What commands are available? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave commands', 'available commands'], category: 'Features' },
  { slug: 'custom-commands', question: 'Can I create custom commands?', answer: 'Comprehensive answer to: Can I create custom commands? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Can I create custom commands? - BotWave FAQ', seoDescription: 'Can I create custom commands? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['custom commands', 'create custom command'], category: 'Features' },
  { slug: 'ai-usage-limits', question: 'What are the AI usage limits?', answer: 'Comprehensive answer to: What are the AI usage limits? Learn everything you need to know about this topic with BotWave.', seoTitle: 'What are the AI usage limits? - BotWave FAQ', seoDescription: 'What are the AI usage limits? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['ai usage limit', 'botwave ai limit'], category: 'Features' },
  { slug: 'media-download-limits', question: 'Are there download limits?', answer: 'Comprehensive answer to: Are there download limits? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Are there download limits? - BotWave FAQ', seoDescription: 'Are there download limits? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['download limit', 'media download limit'], category: 'Features' },
  { slug: 'language-support', question: 'Which languages does BotWave support?', answer: 'Comprehensive answer to: Which languages does BotWave support? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Which languages does BotWave support? - BotWave FAQ', seoDescription: 'Which languages does BotWave support? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave languages', 'supported languages'], category: 'Features' },
  { slug: 'payment-methods', question: 'What payment methods are accepted?', answer: 'Comprehensive answer to: What payment methods are accepted? Learn everything you need to know about this topic with BotWave.', seoTitle: 'What payment methods are accepted? - BotWave FAQ', seoDescription: 'What payment methods are accepted? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave payment', 'payment methods'], category: 'Billing' },
  { slug: 'cancel-subscription', question: 'How do I cancel my subscription?', answer: 'Comprehensive answer to: How do I cancel my subscription? Learn everything you need to know about this topic with BotWave.', seoTitle: 'How do I cancel my subscription? - BotWave FAQ', seoDescription: 'How do I cancel my subscription? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['cancel botwave', 'cancel subscription'], category: 'Billing' },
  { slug: 'free-vs-premium', question: 'What is the difference between free and premium?', answer: 'Comprehensive answer to: What is the difference between free and premium? Learn everything you need to know about this topic with BotWave.', seoTitle: 'What is the difference between free and premium? - BotWave FAQ', seoDescription: 'What is the difference between free and premium? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave free vs premium', 'premium features'], category: 'Billing' },
  { slug: 'refund-policy', question: 'What is the refund policy?', answer: 'Comprehensive answer to: What is the refund policy? Learn everything you need to know about this topic with BotWave.', seoTitle: 'What is the refund policy? - BotWave FAQ', seoDescription: 'What is the refund policy? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave refund', 'refund policy'], category: 'Billing' },
  { slug: 'api-access', question: 'Does BotWave have an API?', answer: 'Comprehensive answer to: Does BotWave have an API? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Does BotWave have an API? - BotWave FAQ', seoDescription: 'Does BotWave have an API? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave api', 'bot api access'], category: 'Technical' },
  { slug: 'self-hosting', question: 'Can I self-host BotWave?', answer: 'Comprehensive answer to: Can I self-host BotWave? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Can I self-host BotWave? - BotWave FAQ', seoDescription: 'Can I self-host BotWave? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['self host botwave', 'run botwave server'], category: 'Technical' },
  { slug: 'uptime-guarantee', question: 'What is the uptime guarantee?', answer: 'Comprehensive answer to: What is the uptime guarantee? Learn everything you need to know about this topic with BotWave.', seoTitle: 'What is the uptime guarantee? - BotWave FAQ', seoDescription: 'What is the uptime guarantee? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave uptime', 'bot uptime guarantee'], category: 'Technical' },
  { slug: 'rate-limits', question: 'What are the rate limits?', answer: 'Comprehensive answer to: What are the rate limits? Learn everything you need to know about this topic with BotWave.', seoTitle: 'What are the rate limits? - BotWave FAQ', seoDescription: 'What are the rate limits? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave rate limits', 'message rate limit'], category: 'Technical' },
  { slug: 'webhook-support', question: 'Does BotWave support webhooks?', answer: 'Comprehensive answer to: Does BotWave support webhooks? Learn everything you need to know about this topic with BotWave.', seoTitle: 'Does BotWave support webhooks? - BotWave FAQ', seoDescription: 'Does BotWave support webhooks? Get the answer and learn more about BotWave features, pricing, and capabilities.', keywords: ['botwave webhooks', 'bot webhooks'], category: 'Technical' },
];
