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
    slug: 'can-telegram-ban-bots',
    question: 'Can Telegram ban my bot for using BotWave?',
    answer: `No. Telegram bots use the **official Telegram Bot API**, which is designed specifically for automation. Telegram actively encourages bot development and there is zero ban risk for normal bot usage.

**Why Telegram bots are safe:**

**Official API**: BotWave connects via the Telegram Bot API — the same API used by millions of bots worldwide. You are not violating any terms of service.

**No rate limit issues**: Telegram allows bots to send up to 30 messages per second in groups, 20 messages per minute to individual users. BotWave stays well within these limits.

**No account risk**: Telegram bots run as separate accounts registered via @BotFather. Your personal Telegram account is never at risk.

**Telegram Bots**: If you use a Telegram Bot (automating your personal account via MTProto), there is a small risk of account restrictions if you send spam or violate Telegram's rules. BotWave's rate limiting keeps you safe in normal usage.

BotWave runs fully on the official Telegram Bot API. Your bot is safe.`,
    category: 'Safety',
    seoKeywords: ['telegram bot ban risk', 'is telegram bot safe', 'telegram bot api safety', 'telegram bot rules'],
    relatedFaqs: ['how-anti-ban-works', 'is-botwave-safe', 'why-qr-disconnects'],
  },
  {
    slug: 'how-anti-ban-works',
    question: 'How does BotWave handle Telegram rate limits?',
    answer: `Telegram has official rate limits for bots. BotWave automatically manages these so your bot never gets throttled or temporarily restricted.

**Telegram Bot API Limits**
- 30 messages per second globally
- 20 messages per minute to a single chat
- 3,000 messages per second for broadcasts (via sendMessage with rate limiting)

**BotWave's Rate Limiting**
BotWave queues outgoing messages and spaces them out automatically. You never need to worry about hitting Telegram's limits during broadcasts or bulk operations.

**Human-Like Timing**
- Random delays of 1-3 seconds before replies in group chats
- Typing indicators shown before longer responses
- Commands that do not need an immediate reply can be processed asynchronously

**Telegram Bot Limits**
For Telegram Bots (MTProto), Telegram enforces stricter limits on personal accounts:
- Flood waits: if you send too many messages too fast, Telegram will ask you to wait
- BotWave respects all flood wait errors and retries automatically
- Avoid running mass-PM campaigns from a userbot — this can trigger account restrictions

**Daily Safety Cap**
BotWave enforces a configurable daily message cap per session to prevent accidental flooding.`,
    category: 'Safety',
    seoKeywords: ['telegram rate limits', 'telegram bot rate limit', 'telegram flood wait', 'telegram bot limits'],
    relatedFaqs: ['can-telegram-ban-bots', 'is-botwave-safe', 'daily-message-limits'],
  },
  {
    slug: 'is-botwave-safe',
    question: 'Is BotWave safe to use? Does it read my messages?',
    answer: `**BotWave does not store your messages.** All message processing happens in memory and is discarded immediately after the bot responds.

Here is what BotWave can and cannot access:

**What BotWave can see:**
- Messages sent in groups where the bot is active (needed to detect commands)
- Your Telegram bot token (needed to maintain the connection)

**What BotWave cannot do:**
- Read your private messages (unless you send a command in a private chat)
- Access your Telegram contacts
- Send messages without your bot being active
- Access your phone data

**Security measures:**
- Session credentials are stored in Supabase with row-level security (only you can access your own sessions)
- API communication is encrypted
- No plain-text secrets stored
- Your QR session runs from your own device IP

BotWave is built by a small indie team focused on the African market. We have no interest in your message data. The bot only processes messages that start with the ! prefix.`,
    category: 'Safety',
    seoKeywords: ['is botwave safe', 'botwave privacy', 'telegram bot safety', 'botwave security'],
    relatedFaqs: ['can-telegram-ban-bots', 'how-anti-ban-works', 'how-data-is-handled'],
  },
  {
    slug: 'why-qr-disconnects',
    question: 'Why does my Telegram bot session disconnect?',
    answer: `Telegram bot sessions are very stable, but disconnections can happen for a few reasons:

**Telegram Bot disconnections:**
1. **Token revoked** - If you used @BotFather to revoke or regenerate your token, the old session stops working immediately.
2. **Server restart** - BotWave reconnects automatically after a server restart. If it doesn't, use the Reconnect button in your dashboard.
3. **Network interruption** - Temporary network issues cause a brief disconnect; BotWave reconnects automatically within 60 seconds.

**Telegram Bot disconnections:**
1. **Session expired** - Telegram periodically invalidates sessions that haven't been used. Re-authenticate with your API credentials.
2. **Too many active sessions** - Telegram limits how many active sessions an account can have. Log out old sessions from Telegram Settings > Devices.
3. **Account restriction** - If your userbot was flagged for unusual activity, Telegram may have logged it out. Check Telegram Settings > Privacy and Security.

**How to fix it:**
1. Go to your BotWave dashboard
2. Find the disconnected session
3. Click "Reconnect"
4. If it fails, click "Re-enter Credentials" and re-add your token or API credentials

**Preventing disconnections:**
- Do not revoke your bot token from @BotFather unless you intend to stop using the bot
- Check your dashboard periodically to confirm the session is "Active"`,
    category: 'Troubleshooting',
    seoKeywords: ['telegram bot disconnect', 'telegram session expired', 'telegram bot not working', 'telegram userbot disconnected'],
    relatedFaqs: ['can-telegram-ban-bots', 'how-to-reconnect', 'is-botwave-safe'],
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
1. Go to your BotWave dashboard
2. Delete the disconnected session
3. Click "+ Add New Session"
4. Re-enter your bot token from @BotFather (or API credentials for Userbot)

**For Telegram Bot:**
Telegram bot sessions rarely disconnect. If yours did:
1. Check that your bot token is still valid (ask @BotFather)
2. If the token was revoked, generate a new one
3. Update the token in your BotWave dashboard

**For Telegram Bot:**
Userbot sessions auto-reconnect when the server restarts. If yours does not:
1. Go to your dashboard
2. Check the session status
3. If it shows disconnected, re-enter your API credentials`,
    category: 'Troubleshooting',
    seoKeywords: ['reconnect telegram bot', 'bot disconnected fix', 'telegram session expired', 'reconnect bot session'],
    relatedFaqs: ['why-qr-disconnects', 'can-telegram-ban-bots', 'is-botwave-safe'],
  },
  {
    slug: 'daily-message-limits',
    question: 'What are the daily message limits?',
    answer: `BotWave has message limits to protect your account from bans and to maintain fair usage:

**Free Plan:**
- 300 messages per month
- 10 AI queries per day
- 1 Telegram bot session

**Standard Plan (N500/month):**
- Unlimited messages
- 100 AI queries per day
- 3 Telegram bot sessions

**Boss Plan (N2,000/month):**
- Unlimited messages
- Unlimited AI queries
- 10 Telegram bot sessions

**Rate limits (all plans):**
BotWave enforces these safety limits in line with Telegram's official limits:
- 30 messages per second globally per bot
- 20 messages per minute per chat
- Configurable daily cap per session

These limits keep your bot within Telegram's official guidelines.`,
    category: 'Pricing',
    seoKeywords: ['botwave message limits', 'telegram bot limits', 'how many messages bot', 'botwave pricing limits'],
    relatedFaqs: ['how-anti-ban-works', 'can-telegram-ban-bots', 'how-much-does-botwave-cost'],
  },
  {
    slug: 'how-much-does-botwave-cost',
    question: 'How much does BotWave cost?',
    answer: `BotWave has a free tier and two paid plans, all priced in Nigerian Naira:

**Free - N0 forever**
- 1 Telegram bot session
- 300 messages per month
- 10 AI queries per day
- All basic commands
- Community support

**Standard - N500/month**
- 3 Telegram bot sessions
- Unlimited messages
- 100 AI queries per day
- Priority support
- Custom commands

**Boss - N2,000/month**
- 10 Telegram bot sessions
- Unlimited everything
- Unlimited AI queries
- Dedicated support
- White-label option

Telegram Bot and Telegram Bot connections are included in all plans.

You can start free and upgrade when you need more sessions or higher limits.`,
    category: 'Pricing',
    seoKeywords: ['botwave pricing', 'botwave cost', 'telegram bot price nigeria', 'botwave free plan'],
    relatedFaqs: ['daily-message-limits', 'is-botwave-safe', 'what-platforms-supported'],
  },
  {
    slug: 'what-platforms-supported',
    question: 'What platforms does BotWave support?',
    answer: `BotWave supports three platforms from one dashboard:

**1. Telegram Bot**
- Connect via @BotFather token
- Uses official Telegram Bot API
- Zero ban risk
- 50+ commands
- Prefix: /

**3. Telegram Bot**
- Connect via API ID and API Hash from my.telegram.org
- Uses MTProto protocol (GramJS)
- Automates your real Telegram account
- Admin actions, global bans, purge, PM permit
- Prefix: .

All three platforms are managed from the same BotWave dashboard. You can have one, two, or all three running at the same time.`,
    category: 'General',
    seoKeywords: ['botwave platforms', 'telegram bot platform', 'telegram userbot', 'botwave supported platforms'],
    relatedFaqs: ['how-much-does-botwave-cost', 'is-botwave-safe', 'daily-message-limits'],
  },
  {
    slug: 'how-data-is-handled',
    question: 'How does BotWave handle my data?',
    answer: `**Messages:** BotWave processes messages in memory only. Nothing is stored. Once the bot responds (or ignores the message), the message data is discarded.

**Session credentials:** Your Telegram bot token and Telegram API credentials are stored encrypted in PostgreSQL with row-level security. Only your authenticated account can access your sessions.

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

BotWave is built for Telegram communities in Africa. Trust is everything to us. We keep it simple: your data stays yours.`,
    category: 'Safety',
    seoKeywords: ['botwave data privacy', 'botwave data handling', 'telegram bot data', 'is my data safe botwave'],
    relatedFaqs: ['is-botwave-safe', 'can-telegram-ban-bots', 'how-anti-ban-works'],
  },
  // ── Programmatic SEO: Additional FAQ entries ──
  { slug: 'what-is-botwave', question: 'What is BotWave?', answer: 'Comprehensive answer to: What is BotWave? Learn everything you need to know about this topic with BotWave.', category: 'General', seoKeywords: ['what is botwave', 'botwave bot'], relatedFaqs: [] },
  { slug: 'is-botwave-free', question: 'Is BotWave free to use?', answer: 'Comprehensive answer to: Is BotWave free to use? Learn everything you need to know about this topic with BotWave.', category: 'General', seoKeywords: ['is botwave free', 'botwave pricing'], relatedFaqs: [] },
  { slug: 'how-many-groups', question: 'How many groups can BotWave manage?', answer: 'Comprehensive answer to: How many groups can BotWave manage? Learn everything you need to know about this topic with BotWave.', category: 'General', seoKeywords: ['botwave group limit', 'how many groups'], relatedFaqs: [] },
  { slug: 'supported-platforms', question: 'Which platforms does BotWave support?', answer: 'Comprehensive answer to: Which platforms does BotWave support? Learn everything you need to know about this topic with BotWave.', category: 'General', seoKeywords: ['botwave platforms', 'telegram bot platform'], relatedFaqs: [] },
  { slug: 'botwave-vs-other-bots', question: 'How is BotWave different from other bots?', answer: 'Comprehensive answer to: How is BotWave different from other bots? Learn everything you need to know about this topic with BotWave.', category: 'General', seoKeywords: ['botwave comparison', 'best bot platform'], relatedFaqs: [] },
  { slug: 'reconnect-session', question: 'How do I reconnect a disconnected session?', answer: 'Comprehensive answer to: How do I reconnect a disconnected session? Learn everything you need to know about this topic with BotWave.', category: 'Telegram', seoKeywords: ['reconnect session', 'fix disconnected bot'], relatedFaqs: [] },
  { slug: 'telegram-bot-vs-userbot-explained', question: 'What is the difference between a Telegram bot and userbot?', answer: 'Comprehensive answer to: What is the difference between a Telegram bot and userbot? Learn everything you need to know about this topic with BotWave.', category: 'Telegram', seoKeywords: ['telegram bot vs userbot', 'botwave telegram'], relatedFaqs: [] },
  { slug: 'multiple-telegram-bots', question: 'Can I run multiple Telegram bots?', answer: 'Comprehensive answer to: Can I run multiple Telegram bots? Learn everything you need to know about this topic with BotWave.', category: 'Telegram', seoKeywords: ['multiple telegram bots', 'multi bot dashboard'], relatedFaqs: [] },
  { slug: 'bot-reads-my-messages', question: 'Does the bot read my private messages?', answer: 'Comprehensive answer to: Does the bot read my private messages? Learn everything you need to know about this topic with BotWave.', category: 'Privacy', seoKeywords: ['bot reads messages', 'botwave privacy'], relatedFaqs: [] },
  { slug: 'data-storage', question: 'Where is my data stored?', answer: 'Comprehensive answer to: Where is my data stored? Learn everything you need to know about this topic with BotWave.', category: 'Privacy', seoKeywords: ['botwave data storage', 'where data stored'], relatedFaqs: [] },
  { slug: 'delete-my-data', question: 'How do I delete my data from BotWave?', answer: 'Comprehensive answer to: How do I delete my data from BotWave? Learn everything you need to know about this topic with BotWave.', category: 'Privacy', seoKeywords: ['delete botwave data', 'remove bot data'], relatedFaqs: [] },
  { slug: 'telegram-bot-token', question: 'How do I get a Telegram bot token?', answer: 'Comprehensive answer to: How do I get a Telegram bot token? Learn everything you need to know about this topic with BotWave.', category: 'Telegram', seoKeywords: ['telegram bot token', 'get telegram token'], relatedFaqs: [] },
  { slug: 'telegram-bot-vs-userbot', question: 'What is the difference between bot and userbot?', answer: 'Comprehensive answer to: What is the difference between bot and userbot? Learn everything you need to know about this topic with BotWave.', category: 'Telegram', seoKeywords: ['telegram bot vs userbot', 'userbot difference'], relatedFaqs: [] },
  { slug: 'telegram-bot-safe', question: 'Is using a Telegram userbot safe?', answer: 'Comprehensive answer to: Is using a Telegram userbot safe? Learn everything you need to know about this topic with BotWave.', category: 'Telegram', seoKeywords: ['telegram userbot safe', 'is userbot safe'], relatedFaqs: [] },
  { slug: 'telegram-bot-admin', question: 'Does my Telegram bot need admin rights?', answer: 'Comprehensive answer to: Does my Telegram bot need admin rights? Learn everything you need to know about this topic with BotWave.', category: 'Telegram', seoKeywords: ['telegram bot admin', 'bot admin permissions'], relatedFaqs: [] },
  { slug: 'telegram-api-id', question: 'How do I get Telegram API ID and hash?', answer: 'Comprehensive answer to: How do I get Telegram API ID and hash? Learn everything you need to know about this topic with BotWave.', category: 'Telegram', seoKeywords: ['telegram api id', 'telegram api hash'], relatedFaqs: [] },
  { slug: 'what-commands-available', question: 'What commands are available?', answer: 'Comprehensive answer to: What commands are available? Learn everything you need to know about this topic with BotWave.', category: 'Features', seoKeywords: ['botwave commands', 'available commands'], relatedFaqs: [] },
  { slug: 'custom-commands', question: 'Can I create custom commands?', answer: 'Comprehensive answer to: Can I create custom commands? Learn everything you need to know about this topic with BotWave.', category: 'Features', seoKeywords: ['custom commands', 'create custom command'], relatedFaqs: [] },
  { slug: 'ai-usage-limits', question: 'What are the AI usage limits?', answer: 'Comprehensive answer to: What are the AI usage limits? Learn everything you need to know about this topic with BotWave.', category: 'Features', seoKeywords: ['ai usage limit', 'botwave ai limit'], relatedFaqs: [] },
  { slug: 'media-download-limits', question: 'Are there download limits?', answer: 'Comprehensive answer to: Are there download limits? Learn everything you need to know about this topic with BotWave.', category: 'Features', seoKeywords: ['download limit', 'media download limit'], relatedFaqs: [] },
  { slug: 'language-support', question: 'Which languages does BotWave support?', answer: 'Comprehensive answer to: Which languages does BotWave support? Learn everything you need to know about this topic with BotWave.', category: 'Features', seoKeywords: ['botwave languages', 'supported languages'], relatedFaqs: [] },
  { slug: 'payment-methods', question: 'What payment methods are accepted?', answer: 'Comprehensive answer to: What payment methods are accepted? Learn everything you need to know about this topic with BotWave.', category: 'Billing', seoKeywords: ['botwave payment', 'payment methods'], relatedFaqs: [] },
  { slug: 'cancel-subscription', question: 'How do I cancel my subscription?', answer: 'Comprehensive answer to: How do I cancel my subscription? Learn everything you need to know about this topic with BotWave.', category: 'Billing', seoKeywords: ['cancel botwave', 'cancel subscription'], relatedFaqs: [] },
  { slug: 'free-vs-premium', question: 'What is the difference between free and premium?', answer: 'Comprehensive answer to: What is the difference between free and premium? Learn everything you need to know about this topic with BotWave.', category: 'Billing', seoKeywords: ['botwave free vs premium', 'premium features'], relatedFaqs: [] },
  { slug: 'refund-policy', question: 'What is the refund policy?', answer: 'Comprehensive answer to: What is the refund policy? Learn everything you need to know about this topic with BotWave.', category: 'Billing', seoKeywords: ['botwave refund', 'refund policy'], relatedFaqs: [] },
  { slug: 'api-access', question: 'Does BotWave have an API?', answer: 'Comprehensive answer to: Does BotWave have an API? Learn everything you need to know about this topic with BotWave.', category: 'Technical', seoKeywords: ['botwave api', 'bot api access'], relatedFaqs: [] },
  { slug: 'self-hosting', question: 'Can I self-host BotWave?', answer: 'Comprehensive answer to: Can I self-host BotWave? Learn everything you need to know about this topic with BotWave.', category: 'Technical', seoKeywords: ['self host botwave', 'run botwave server'], relatedFaqs: [] },
  { slug: 'uptime-guarantee', question: 'What is the uptime guarantee?', answer: 'Comprehensive answer to: What is the uptime guarantee? Learn everything you need to know about this topic with BotWave.', category: 'Technical', seoKeywords: ['botwave uptime', 'bot uptime guarantee'], relatedFaqs: [] },
  { slug: 'rate-limits', question: 'What are the rate limits?', answer: 'Comprehensive answer to: What are the rate limits? Learn everything you need to know about this topic with BotWave.', category: 'Technical', seoKeywords: ['botwave rate limits', 'message rate limit'], relatedFaqs: [] },
  { slug: 'webhook-support', question: 'Does BotWave support webhooks?', answer: 'Comprehensive answer to: Does BotWave support webhooks? Learn everything you need to know about this topic with BotWave.', category: 'Technical', seoKeywords: ['botwave webhooks', 'bot webhooks'], relatedFaqs: [] },
];

export function getFaqBySlug(slug: string): FAQItem | undefined {
  return faqItems.find(f => f.slug === slug);
}

export function getFaqsByCategory(category: string): FAQItem[] {
  return faqItems.filter(f => f.category === category);
}

export function getAllFaqCategories(): string[] {
  return [...new Set(faqItems.map(f => f.category))];
}
