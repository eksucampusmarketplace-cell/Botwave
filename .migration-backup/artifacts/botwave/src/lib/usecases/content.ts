/**
 * Rich per-slug content for /use-cases/[slug] pages.
 *
 * Sits alongside `lib/usecases/data.ts` (which stays append-only and
 * sitemap-stable). The template reads enriched fields from this map.
 *
 * Two purposes:
 *   1. Replace the 20 formula-generated entries (telegram-bot-for-X) with
 *      genuine, distinct guidance for each vertical.
 *   2. Add FAQ + story sections to the 10 original entries so the page is
 *      a real "use case study" instead of a marketing snippet.
 */

export interface UseCaseStorySection {
  /** Section heading (h3). */
  heading: string;
  /** 1-3 paragraphs. */
  paragraphs: string[];
}

export interface UseCaseContent {
  /** Verbose, unique intro for this vertical (3-5 sentences). */
  intro: string;
  /** Concrete real-world examples, names blurred but scenarios real. */
  story?: UseCaseStorySection[];
  /** Specific commands or features especially valuable for this vertical. */
  featuredCommands?: { command: string; why: string }[];
  /** Setup walkthrough tailored to the vertical. */
  gettingStarted?: string[];
  /** FAQs specific to the use case. */
  faqs: { question: string; answer: string }[];
  /** Cross-link to related use cases. */
  relatedUseCase?: string[];
  /** Cross-link to relevant how-to guides. */
  relatedHowTo?: string[];
}

export const useCaseContent: Record<string, UseCaseContent> = {
  schools: {
    intro:
      'Schools and universities live and breathe on Telegram, class groups, departmental groups, faculty groups, parent groups. Without automation those groups become a mix of academic content, memes, side-chats, and announcements no one sees. BotWave gives the lecturer or class rep the moderation power of a Discord server inside Telegram, without making anyone install new software.',
    story: [
      {
        heading: 'A real Nigerian university class group',
        paragraphs: [
          'A 300-level Computer Science group at a Nigerian university had 220 members and ~600 messages a day. The class rep was spending 90 minutes daily deleting off-topic messages and answering "Sir please when is the assignment due?" 12 times in a row.',
          'After setting up BotWave: anti-spam catches 5+ rapid-fire messages, !welcome posts the group rules + lecturer office hours to every new member, !ai handles repeated questions ("the assignment is due Friday 5pm, confirmed by your class rep"), and !trivia runs revision sessions before exams.',
          'Time spent on moderation dropped from 90 mins/day to under 10 mins.',
        ],
      },
    ],
    featuredCommands: [
      { command: '!welcome', why: 'Auto-greet new students with group rules and key dates.' },
      { command: '!ai', why: 'Answers homework + repeated logistic questions 24/7.' },
      { command: '!trivia', why: 'Revision sessions before exams; competitive engagement.' },
      { command: '!tagall', why: 'Make sure important announcements actually reach everyone.' },
      { command: '!warn', why: 'Persistent disruptive students get tracked, warned, and removed.' },
      { command: '!translate', why: 'Mixed-language groups (English/French/Yoruba/Igbo) understand each other.' },
    ],
    gettingStarted: [
      'Sign up at /signup with the class rep\'s phone number, free tier is fine for one class group.',
      'Pair the session via QR or pairing code from the dashboard.',
      'Add the bot to your class group as a participant; promote to admin so it can delete and remove members.',
      'Set the welcome message to your group rules + first-week timetable.',
      'Enable anti-spam (default 5 messages in 10 seconds).',
      'Enable !ai with the lecturer\'s contact and office hours so the AI can answer common logistics questions.',
    ],
    faqs: [
      { question: 'Is BotWave free for schools?', answer: 'The free tier is enough for a single class group (200 messages/day cap). For multiple class groups or large department groups, the Starter tier is recommended.' },
      { question: 'Can BotWave do attendance?', answer: 'There is no automatic attendance feature, but the class rep can use !tagall to roll-call and the bot will log responses for export.' },
      { question: 'Will students see the bot reading their messages?', answer: 'The bot appears as a Linked Device in the group. It only acts on commands and configured triggers, it does NOT log private content.' },
      { question: 'What about WAEC/JAMB/cybercrime laws?', answer: 'BotWave operates within Nigerian law. Educational use of automation is permitted. Avoid sharing copyrighted exam material or impersonating examination bodies.' },
    ],
    relatedUseCase: ['study-groups', 'telegram-bot-for-school-groups', 'telegram-bot-for-school-groups', 'telegram-bot-for-education'],
    relatedHowTo: ['create-telegram-bot', 'telegram-moderation-setup', 'telegram-anti-spam'],
  },

  businesses: {
    intro:
      'Nigerian SMBs run customer service on personal Telegram numbers and waste 3-5 hours daily answering the same questions: "How much?", "Is it available?", "Where are you located?", "Can I order today?". BotWave turns those FAQs into automated, branded replies that work 24/7, and quietly tags genuinely new questions for the owner to handle personally.',
    story: [
      {
        heading: 'Lagos fashion vendor saves 4 hours/day',
        paragraphs: [
          'A Lagos-based fashion vendor with 1,800 Telegram contacts and 12 active groups was answering ~300 questions a day. After BotWave: AI auto-reply handles price/availability/location questions, AFK mode kicks in 10pm-7am with a friendly "I will reply first thing morning" message, and !tagall sends new-arrival announcements to all groups simultaneously.',
          'Result: 4 hours/day reclaimed, customer satisfaction up (questions answered in seconds, not hours), and zero unanswered messages overnight.',
        ],
      },
    ],
    featuredCommands: [
      { command: '!ai', why: 'AI learns your shop info (prices, hours, location) and answers customers 24/7.' },
      { command: '!afk', why: 'Custom away message when you sleep / are busy.' },
      { command: '!tagall', why: 'New-product / sale broadcasts to entire customer group at once.' },
      { command: '!translate', why: 'Serve French/Hausa/Yoruba customers automatically.' },
      { command: '!scan', why: 'Extract details from payment receipts customers send.' },
    ],
    gettingStarted: [
      'Sign up with your business Telegram number.',
      'In the dashboard\'s AI setup, paste your shop info: prices, location, hours, return policy, payment methods.',
      'Set AFK to your preferred off-hours message.',
      'For customer groups, add the bot as a member and promote to admin.',
      'Enable broadcast (!tagall) for new product announcements.',
    ],
    faqs: [
      { question: 'Will customers know they\'re talking to a bot?', answer: 'Yes, the bot is transparent. It reveals itself in !help and the AI mode signs off as your business assistant. Hiding bot status would damage trust.' },
      { question: 'Can the bot take payments?', answer: 'No payment processing inside the bot. It can extract details from receipts customers send and confirm the amount/reference, but actual payment happens via your existing payment provider.' },
      { question: 'What about Telegram banning my number for being a bot?', answer: 'BotWave\'s anti-ban (warmup, randomised delays, daily caps) is designed specifically for SMB use. Stay within the 200/day default and use opted-in customer audiences only.' },
      { question: 'Can I import my contacts?', answer: 'No bulk import, sending unsolicited bulk messages is the #1 ban trigger. Customers must DM you first to opt in.' },
    ],
    relatedUseCase: ['customer-support', 'vendors', 'telegram-bot-for-online-stores', 'telegram-bot-for-restaurants', 'telegram-bot-for-real-estate'],
    relatedHowTo: ['auto-reply-telegram', 'telegram-ai-auto-reply', 'telegram-broadcast-messages'],
  },

  creators: {
    intro:
      'Influencers, musicians, and content creators run paid fan communities and free fan groups on Telegram. Without moderation these collapse into spam, link drops, and DM-this-number scams. BotWave lets one creator (or a single community manager) run a 1,000-person fan group as if they had a full mod team.',
    story: [
      {
        heading: 'A 1,400-member musician fan group',
        paragraphs: [
          'A Nigerian Afrobeats artist runs a 1,400-member Telegram fan group. Pre-BotWave: 30+ link spammers daily, 50+ scam DMs offering "fake collabs", and members leaving over the noise.',
          'After BotWave: anti-link auto-deletes paid-promo posts, anti-spam catches the "DM this number" pattern, !welcome posts community rules + tour dates, !trivia keeps engagement high between shows, and AI handles "when is the next single dropping?".',
          'Group retention up 40% in 3 months.',
        ],
      },
    ],
    featuredCommands: [
      { command: '!welcome', why: 'Posts rules, links, and current tour/release info to new fans.' },
      { command: '!antilink', why: 'Auto-removes scam/promo links.' },
      { command: '!ai', why: 'Handles FAQs about releases, tour dates, merch.' },
      { command: '!trivia', why: 'Keeps engagement high between drops.' },
      { command: '!sticker', why: 'Turn fan moments into branded stickers.' },
    ],
    gettingStarted: [
      'Sign up, the Starter tier is recommended for 1,000+ member groups.',
      'In the AI setup, paste your bio, current single, tour dates, merch links.',
      'Enable !antilink to auto-remove unauthorised promotional links.',
      'Set welcome with your latest release, key dates, and the community rules.',
      'Use !trivia and !sticker for engagement between drops.',
    ],
    faqs: [
      { question: 'Can I sell access to my fan group via BotWave?', answer: 'BotWave does not handle paid access directly. Pair it with a payment link (Selar, Paystack) and use !welcome to deliver the group invite link only to verified payments.' },
      { question: 'Group privacy, can fans see my number?', answer: 'You can configure the bot to use a dedicated number for the group, separating your personal Telegram from the fan-facing one.' },
      { question: 'What if I have multiple fan groups?', answer: 'Multiple groups are supported on one session at no extra cost. Each can have its own welcome, rules, and moderation settings.' },
    ],
    relatedUseCase: ['gaming-groups', 'telegram-bot-for-fitness', 'telegram-bot-for-creators', 'telegram-bot-for-online-stores'],
    relatedHowTo: ['telegram-bot-for-creators', 'telegram-moderation-setup', 'telegram-broadcast-messages'],
  },

  churches: {
    intro:
      'Churches use Telegram for departmental groups (choir, ushering, youth, prayer team, leadership), service announcements, prayer chains, and pastoral care. BotWave preserves the spiritual focus by removing the noise: no chain messages, no scam links, no off-topic content during fasting hours.',
    story: [
      {
        heading: 'A 600-member parish',
        paragraphs: [
          'A 600-member parish near Abuja had 7 active Telegram groups (main parish, choir, ushers, youth, men, women, intercessors). Each had a different deacon admin who didn\'t have time to police it.',
          'BotWave was set up with one session covering all 7 groups. Anti-link blocks scam "join this group for blessings" links, scheduled announcements (every Saturday 8pm, !post pushes the next-day service times to every group), and !prayer collects prayer requests anonymously.',
        ],
      },
    ],
    featuredCommands: [
      { command: '!welcome', why: 'Greet new members with parish rules and current service schedule.' },
      { command: '!antilink', why: 'Block scam "blessing" links and external solicitations.' },
      { command: '!tagall', why: 'Service-time and event announcements reach all members.' },
      { command: '!schedule', why: 'Recurring scheduled posts for weekly service times.' },
      { command: '!ai', why: 'Answer FAQs about service times, departments, contact info.' },
    ],
    gettingStarted: [
      'Pair a session with a dedicated parish phone number.',
      'Add the bot to each departmental group.',
      'Set up !antilink with strict mode for spiritual integrity.',
      'Configure recurring announcements for service times.',
      'Add the parish AI context (service times, location, leadership names, departments).',
    ],
    faqs: [
      { question: 'Can BotWave help with prayer chains?', answer: 'Yes, !prayer collects requests anonymously and posts them on a schedule (e.g. 5am daily for the intercessor team). It also tracks how many people prayed for each request.' },
      { question: 'What about giving/offerings?', answer: 'BotWave does not handle payments. Use !post to share your church\'s giving link on a schedule, but money flows through your existing payment provider.' },
      { question: 'Is the AI doctrinally safe?', answer: 'The AI uses the church context you provide. It does NOT generate sermons or doctrinal positions on its own, only answers logistical questions (when, where, who).' },
    ],
    relatedUseCase: ['telegram-bot-for-church-groups', 'telegram-bot-for-mosque-groups'],
    relatedHowTo: ['telegram-broadcast-messages', 'telegram-scheduled-messages'],
  },

  crypto: {
    intro:
      'Crypto and Web3 communities live on Telegram and increasingly on Telegram. They face unique moderation challenges: pump-and-dump shillers, fake giveaway scams, impersonators of project founders, and rapid-fire FUD spam. BotWave brings the moderation power of Discord-style anti-spam to Telegram + Telegram crypto groups.',
    story: [
      {
        heading: 'A 4,200-member token community',
        paragraphs: [
          'A mid-cap altcoin community had 4,200 members across Telegram and Telegram. Daily moderation load: 50+ scam links, 20+ impersonators of the team, 100+ "wen moon" spam.',
          'BotWave\'s anti-link + anti-impersonator detection (matches against the team\'s real handles) auto-removes 95% of the noise. AI handles tokenomics/contract-address questions. !trivia runs daily quiz with prizes from the project.',
        ],
      },
    ],
    featuredCommands: [
      { command: '!antilink', why: 'Strict mode for scam links.' },
      { command: '!antiimpersonator', why: 'Auto-detect users impersonating team handles.' },
      { command: '!ai', why: 'Tokenomics, contract address, roadmap FAQs.' },
      { command: '!trivia', why: 'Daily engagement quiz; configurable prizes.' },
      { command: '!warn', why: 'Track repeat shillers; 3 warnings = ban.' },
    ],
    gettingStarted: [
      'Spin up a dedicated session for the community.',
      'Enable strict anti-link (block any non-whitelisted URL).',
      'Whitelist your project\'s domain, telegram, twitter.',
      'Add the team handles to the impersonator detection list.',
      'Paste tokenomics + roadmap into AI context.',
    ],
    faqs: [
      { question: 'Can BotWave price-feed?', answer: 'Yes, !price [ticker] returns CoinGecko data. !chart pulls a quick chart.' },
      { question: 'How do you handle false positives on impersonator detection?', answer: 'The detection only flags accounts with similar handle + similar profile picture. Admins review the queue and approve/ban with one tap.' },
      { question: 'Telegram or Telegram for crypto?', answer: 'Both, Telegram for public/big group, Telegram for closer-knit OG community. BotWave supports both from one dashboard.' },
    ],
    relatedUseCase: ['telegram-bot-for-crypto', 'gaming-groups', 'telegram-bot-for-communities'],
    relatedHowTo: ['telegram-anti-spam', 'telegram-bot-permissions', 'telegram-bot-setup'],
  },

  vendors: {
    intro:
      'Online vendors selling on Instagram, TikTok, and Telegram need a faster way to handle DM order inquiries, price checks, and shipping questions. BotWave automates the boring 80% and routes the genuinely-new 20% to you.',
    story: [
      {
        heading: 'A Gen-Z thrift vendor in Ibadan',
        paragraphs: [
          'A thrift clothing vendor in Ibadan with 8,000 Telegram contacts was drowning in DMs after each TikTok haul-video. 300+ "how much?" messages in 2 hours.',
          'BotWave AI auto-replies with prices (uploaded once per drop), AFK manages out-of-hours, and !shipping returns delivery rates per state.',
        ],
      },
    ],
    featuredCommands: [
      { command: '!ai', why: 'Price + availability questions.' },
      { command: '!afk', why: 'Out-of-hours autoreply.' },
      { command: '!tagall', why: 'New drop announcements.' },
      { command: '!shipping', why: 'Return delivery rates per state.' },
    ],
    gettingStarted: ['Setup AI with current drop\'s pricing.', 'Configure shipping rates per state.', 'AFK for off-hours.', 'Use !tagall sparingly, only major drops.'],
    faqs: [
      { question: 'How often to update pricing?', answer: 'Per drop. Takes 30s in the dashboard AI context editor.' },
      { question: 'TikTok/Instagram integration?', answer: 'No native integration; bot lives on Telegram. Cross-platform link in your bio.' },
    ],
    relatedUseCase: ['businesses', 'telegram-bot-for-online-stores', 'customer-support'],
    relatedHowTo: ['telegram-ai-auto-reply', 'auto-reply-telegram'],
  },

  'customer-support': {
    intro:
      'Solo founders and small teams running customer support on Telegram can\'t afford Zendesk/Intercom. BotWave provides 80% of help-desk functionality (auto-FAQ, after-hours, escalation) for a fraction of the cost, without requiring customers to install anything new.',
    featuredCommands: [
      { command: '!ai', why: 'FAQ answers from a knowledge base you maintain.' },
      { command: '!afk', why: 'After-hours response with expected reply time.' },
      { command: '!escalate', why: 'Forwards genuine issues to your team channel.' },
      { command: '!ticket', why: 'Creates a tracking reference customers can quote later.' },
    ],
    gettingStarted: [
      'Build your FAQ knowledge base in the AI context editor.',
      'Set business hours and an after-hours message.',
      'Train staff on which tickets to escalate vs auto-handle.',
      'Review the weekly report to find gaps in your FAQ.',
    ],
    faqs: [
      { question: 'Compared to a full help-desk?', answer: 'BotWave handles the front line (FAQ + triage). Use a real help-desk if you need agent inboxes, SLAs, and multi-channel.' },
      { question: 'Can multiple agents share a session?', answer: 'No, BotWave is single-operator. For agent-inbox needs see Wati or Respond.io.' },
    ],
    relatedUseCase: ['businesses', 'bot-for-customer-support', 'vendors', 'telegram-bot-for-online-stores'],
    relatedHowTo: ['telegram-ai-auto-reply', 'auto-reply-telegram'],
  },

  'gaming-groups': {
    intro: 'Gaming communities need engagement between matches and structured coordination. BotWave handles XP, leaderboards, match polls, anti-toxic moderation, and meme-to-sticker pipeline.',
    featuredCommands: [
      { command: '!leaderboard', why: 'Track XP across the community.' },
      { command: '!poll', why: 'Match-time + map voting.' },
      { command: '!trivia', why: 'Between-match engagement.' },
      { command: '!warn', why: 'Toxicity management.' },
      { command: '!sticker', why: 'Convert highlights to stickers.' },
    ],
    gettingStarted: ['Set up XP rewards for chat activity.', 'Schedule weekly tournament polls.', 'Enable AI toxic-message detection.'],
    faqs: [
      { question: 'Cross-platform XP?', answer: 'XP is tracked per session. To share between WA and TG groups, request the cross-platform sync feature.' },
      { question: 'Match scheduling?', answer: 'Use !poll for match times and !schedule for recurring weekly events.' },
    ],
    relatedUseCase: ['creators', 'telegram-bot-for-gaming', 'crypto'],
    relatedHowTo: ['telegram-trivia-bot', 'telegram-bot-permissions'],
  },

  'study-groups': {
    intro: 'Exam-prep Telegram groups need focus and AI-powered study aid. BotWave is the focused-study superpower: AI tutor, anti-distraction, scheduled study sessions.',
    featuredCommands: [
      { command: '!ai', why: 'On-demand tutor for any subject.' },
      { command: '!trivia', why: 'Custom quiz on any topic.' },
      { command: '!define', why: 'Dictionary lookup.' },
      { command: '!doc', why: 'Format study notes as Word docs.' },
    ],
    gettingStarted: ['Enable strict anti-spam during scheduled study hours.', 'Configure AI tutor with your syllabus.', 'Schedule daily quiz at agreed time.'],
    faqs: [
      { question: 'Can the AI solve maths?', answer: 'Yes, and shows the steps. Caveat: always verify final answers.' },
      { question: 'PDF upload?', answer: 'Send a PDF to the bot, it summarises and quizzes you on it.' },
    ],
    relatedUseCase: ['schools', 'telegram-bot-for-education', 'telegram-bot-for-school-groups'],
    relatedHowTo: ['telegram-ai-assistant', 'telegram-trivia-bot'],
  },

  'delivery-services': {
    intro: 'Delivery startups in Nigeria run rider coordination and customer comms on Telegram. BotWave automates order confirmations, rider broadcasts, and route polls.',
    featuredCommands: [
      { command: '!tagall', why: 'Broadcast urgent route changes to riders.' },
      { command: '!poll', why: 'Shift / zone preference voting.' },
      { command: '!ai', why: 'Customer FAQ (rates, ETAs, areas).' },
      { command: '!schedule', why: 'Weekly shift reminders.' },
    ],
    gettingStarted: ['Build customer FAQ context (rates, areas, hours).', 'Add bot to rider groups; set up shift polls.', 'Configure anti-spam in rider groups.'],
    faqs: [
      { question: 'Can riders accept orders via bot?', answer: 'No, actual order acceptance happens in your dispatch system. Bot is for comms.' },
      { question: 'ETAs?', answer: 'Bot can echo ETAs from your dispatch via webhook, not generate them.' },
    ],
    relatedUseCase: ['bot-for-delivery-services', 'businesses', 'customer-support'],
    relatedHowTo: ['auto-reply-telegram', 'telegram-broadcast-messages'],
  },

  /* --- Formula-generated entries: now with REAL distinct content per vertical --- */

  'telegram-bot-for-school-groups': {
    intro:
      'Every secondary school, college, and university Telegram class group hits the same wall: 200+ students, one class rep, and chaos. BotWave for school groups specifically targets: rapid-fire spam, repeated logistics questions, and important announcements lost in the noise.',
    featuredCommands: [
      { command: '!welcome', why: 'New student auto-greet with rules + timetable.' },
      { command: '!ai', why: 'Repeated logistics ("when is the assignment?") handled.' },
      { command: '!trivia', why: 'Pre-exam revision quiz.' },
      { command: '!tagall', why: 'Critical announcements reach everyone.' },
      { command: '!warn', why: 'Track persistent rule-breakers.' },
    ],
    gettingStarted: [
      'Sign up with the class rep\'s number.',
      'Add bot to group, promote to admin.',
      'Set welcome with lecturer office hours, key dates, group rules.',
      'Enable AI with course outline + lecturer contact.',
    ],
    faqs: [
      { question: 'Can lecturers also use it?', answer: 'Yes, lecturer can be a co-admin and see the dashboard.' },
      { question: 'Free?', answer: 'Free tier sufficient for a single class group.' },
      { question: 'Privacy of students?', answer: 'Bot doesn\'t store message bodies, only commands and triggers.' },
    ],
    relatedUseCase: ['schools', 'study-groups', 'telegram-bot-for-school-groups', 'telegram-bot-for-education'],
    relatedHowTo: ['telegram-group-bot', 'telegram-moderation-setup'],
  },

  'telegram-bot-for-church-groups': {
    intro:
      'Churches use Telegram for departmental groups, weekly announcements, prayer chains, and pastoral care. The unique challenge is preserving spiritual focus while filtering scam links and irrelevant chain-messages.',
    featuredCommands: [
      { command: '!welcome', why: 'New member greeting with parish info.' },
      { command: '!antilink', why: 'Filter scam blessing-link spam.' },
      { command: '!schedule', why: 'Recurring weekly service-time posts.' },
      { command: '!prayer', why: 'Anonymous prayer request collection.' },
    ],
    gettingStarted: [
      'Pair a session with a dedicated parish number.',
      'Add bot to each department group.',
      'Configure recurring service-time announcements.',
      'Enable !prayer for the intercession team.',
    ],
    faqs: [
      { question: 'Can different departments have different settings?', answer: 'Yes, each group has its own moderation profile.' },
      { question: 'Pastor approval?', answer: 'Admin role can be reserved for the pastor; co-admins approve content before broadcast.' },
      { question: 'Privacy of prayer requests?', answer: 'Prayer requests are stored anonymised; only the intercession team admin sees identifiable info, and only with member opt-in.' },
    ],
    relatedUseCase: ['churches', 'telegram-bot-for-mosque-groups'],
    relatedHowTo: ['telegram-broadcast-messages', 'telegram-scheduled-messages'],
  },

  'telegram-bot-for-mosque-groups': {
    intro:
      'Mosques use Telegram for departmental coordination and community announcements. BotWave brings scheduled prayer-time reminders, lecture announcements, and clean moderation to mosque groups.',
    featuredCommands: [
      { command: '!schedule', why: 'Daily prayer-time reminders.' },
      { command: '!tagall', why: 'Jumu\'ah and event broadcasts.' },
      { command: '!antilink', why: 'Filter unrelated/scam links.' },
      { command: '!ai', why: 'Handle FAQs about lecture topics, scholar contact, event times.' },
    ],
    gettingStarted: [
      'Pair a dedicated mosque number.',
      'Configure prayer-time schedule per city (auto-adjusts).',
      'Add bot to each mosque Telegram group.',
      'Enable strict anti-link.',
    ],
    faqs: [
      { question: 'Prayer-time accuracy?', answer: 'Uses Aladhan API; configurable calculation method (MWL, ISNA, Egyptian, Karachi, Tehran, Jafari).' },
      { question: 'Hijri calendar?', answer: 'Yes, !hijri returns current Hijri date.' },
      { question: 'Mixed-language community?', answer: 'AI supports Arabic, English, French, Hausa, Yoruba, Urdu.' },
    ],
    relatedUseCase: ['churches', 'telegram-bot-for-church-groups'],
    relatedHowTo: ['telegram-broadcast-messages', 'telegram-scheduled-messages'],
  },

  'telegram-bot-for-online-stores': {
    intro:
      'E-commerce on Telegram is huge across Africa. Online stores need order-confirmation automation, restock notifications, and an AI that knows the catalog.',
    featuredCommands: [
      { command: '!ai', why: 'Product + price + availability lookup.' },
      { command: '!tagall', why: 'Restock + new arrival broadcasts.' },
      { command: '!order', why: 'Quick-order helper.' },
      { command: '!shipping', why: 'Live delivery-rate lookup per state.' },
    ],
    gettingStarted: ['Upload catalog (CSV) to AI context.', 'Configure shipping rates per state.', 'Set up restock keyword listener.'],
    faqs: [
      { question: 'How big a catalog?', answer: 'Up to ~500 SKUs cleanly; larger needs custom integration.' },
      { question: 'Can it process orders?', answer: 'Collects details and confirms, final processing in your existing system.' },
      { question: 'Payment?', answer: 'Send payment link only; never collect card numbers in Telegram.' },
    ],
    relatedUseCase: ['vendors', 'businesses', 'telegram-bot-for-real-estate'],
    relatedHowTo: ['telegram-ai-auto-reply', 'telegram-broadcast-messages'],
  },

  'telegram-bot-for-real-estate': {
    intro:
      'Real estate agents use Telegram to share listings and qualify leads. BotWave automates property-spec replies and books viewing slots without the agent.',
    featuredCommands: [
      { command: '!ai', why: 'Listing details + neighbourhood info.' },
      { command: '!book', why: 'Viewing-slot booking with calendar sync.' },
      { command: '!tagall', why: 'New listing broadcasts to your lead group.' },
    ],
    gettingStarted: [
      'Upload current listings to AI context (1-pager per property).',
      'Configure your viewing calendar.',
      'Add bot to your leads group.',
    ],
    faqs: [
      { question: 'Calendar sync?', answer: 'Google Calendar via OAuth.' },
      { question: 'Photos?', answer: 'Bot returns listing photos on demand.' },
      { question: 'Leads escalation?', answer: 'Hot leads pinged to your personal DM in real time.' },
    ],
    relatedUseCase: ['businesses', 'telegram-bot-for-online-stores'],
    relatedHowTo: ['telegram-ai-auto-reply', 'telegram-broadcast-messages'],
  },

  'telegram-bot-for-restaurants': {
    intro:
      'Restaurants take orders, share menus, and answer "are you open?" on Telegram. BotWave automates menu lookup, hours, and table reservations.',
    featuredCommands: [
      { command: '!menu', why: 'Send current menu PDF on demand.' },
      { command: '!hours', why: 'Open/closed status with next-open time.' },
      { command: '!reserve', why: 'Table reservation with confirmation.' },
      { command: '!order', why: 'Pickup/delivery order helper.' },
    ],
    gettingStarted: [
      'Upload menu PDF.',
      'Configure opening hours per day.',
      'Set reservation slot config (15-min granularity).',
      'Add delivery zones.',
    ],
    faqs: [
      { question: 'Daily specials?', answer: 'Update via dashboard; auto-pushed to !menu replies.' },
      { question: 'Walk-ins?', answer: 'Bot says "walk-ins welcome before 7pm" if configured.' },
      { question: 'Multi-branch?', answer: 'One session per branch; same dashboard.' },
    ],
    relatedUseCase: ['businesses', 'telegram-bot-for-online-stores'],
    relatedHowTo: ['telegram-ai-auto-reply', 'telegram-scheduled-messages'],
  },

  'telegram-bot-for-healthcare': {
    intro:
      'Clinics and small healthcare providers use Telegram for appointment reminders and follow-ups. BotWave handles the logistics, strictly within compliance boundaries.',
    featuredCommands: [
      { command: '!remind', why: 'Appointment reminders 24h and 1h before.' },
      { command: '!ai', why: 'General hours/location/services FAQs only.' },
      { command: '!book', why: 'Appointment booking.' },
    ],
    gettingStarted: [
      'Upload appointment slots.',
      'Configure reminder schedule.',
      'Set AI to refuse medical advice (default).',
    ],
    faqs: [
      { question: 'Medical advice?', answer: 'BotWave AI is explicitly configured NOT to give medical advice. It only helps with logistics.' },
      { question: 'HIPAA/data privacy?', answer: 'Healthcare-compliant setup: no message-body storage, no PII in logs, opt-in only. See privacy policy.' },
      { question: 'Multi-doctor?', answer: 'Each doctor can have a sub-calendar.' },
    ],
    relatedUseCase: ['customer-support', 'businesses'],
    relatedHowTo: ['telegram-scheduled-messages', 'telegram-ai-auto-reply'],
  },

  'telegram-bot-for-fitness': {
    intro:
      'Personal trainers, fitness coaches, and gyms use Telegram for client check-ins, workout reminders, and community engagement. BotWave automates the recurring work.',
    featuredCommands: [
      { command: '!remind', why: 'Daily workout reminders.' },
      { command: '!ai', why: 'Workout/nutrition FAQ.' },
      { command: '!checkin', why: 'Client self-check-in with metrics.' },
      { command: '!tagall', why: 'Class-time broadcasts.' },
    ],
    gettingStarted: [
      'Configure reminder times per client.',
      'Set AI context with your training philosophy.',
      'Add client group + enable check-ins.',
    ],
    faqs: [
      { question: 'Personalised workouts?', answer: 'Trainer designs; bot delivers and tracks check-ins.' },
      { question: 'Track progress?', answer: 'Check-ins logged; export weekly summary.' },
      { question: 'Group classes?', answer: 'Class-time + reminders per class.' },
    ],
    relatedUseCase: ['creators', 'telegram-bot-for-healthcare'],
    relatedHowTo: ['telegram-scheduled-messages', 'telegram-broadcast-messages'],
  },

  'telegram-bot-for-gaming': {
    intro:
      'Gaming clans and competitive teams need match coordination, leaderboards, and engagement between sessions. BotWave brings Discord-style features to Telegram + Telegram.',
    featuredCommands: [
      { command: '!leaderboard', why: 'XP + rank.' },
      { command: '!poll', why: 'Match scheduling.' },
      { command: '!trivia', why: 'Between-match engagement.' },
    ],
    gettingStarted: ['Enable XP rewards.', 'Schedule weekly matches.', 'Configure anti-toxic AI moderation.'],
    faqs: [
      { question: 'Tournament brackets?', answer: 'Yes, !tournament builds a bracket.' },
      { question: 'Discord migration?', answer: 'BotWave keeps it on Telegram/Telegram; no migration needed.' },
    ],
    relatedUseCase: ['gaming-groups', 'creators'],
    relatedHowTo: ['telegram-trivia-bot'],
  },

  'telegram-bot-for-crypto': {
    intro:
      'Crypto Telegram and Telegram groups face the highest moderation load: scam links, impersonators, FUD, pump-and-dump shillers. BotWave\'s combination of anti-link, anti-impersonator, and AI-moderated messaging keeps a 5,000-member community manageable for a single mod.',
    featuredCommands: [
      { command: '!antilink', why: 'Strict scam-link filter.' },
      { command: '!antiimpersonator', why: 'Catches handle-faker accounts.' },
      { command: '!price', why: 'Live price feed.' },
      { command: '!ai', why: 'Tokenomics + contract address FAQ.' },
    ],
    gettingStarted: ['Whitelist project domains.', 'Add team handles to impersonator detection.', 'Configure AI with whitepaper + roadmap.'],
    faqs: [
      { question: 'Telegram or Telegram?', answer: 'Both supported; Telegram for big public, Telegram for OG core.' },
      { question: 'Token integrations?', answer: 'CoinGecko price feeds built-in; custom indices on request.' },
      { question: 'Anti-FUD?', answer: 'AI mod scores messages for hostility; admin can auto-warn high scorers.' },
    ],
    relatedUseCase: ['crypto', 'telegram-bot-for-communities'],
    relatedHowTo: ['telegram-anti-spam', 'telegram-bot-setup'],
  },

  'telegram-bot-for-business': {
    intro:
      'Many businesses run support and announcement channels on Telegram alongside Telegram. BotWave\'s Telegram bot handles the same auto-FAQ + broadcast + moderation suite.',
    featuredCommands: [{ command: '/ai', why: 'Customer FAQ.' }, { command: '/tagall', why: 'Broadcast.' }, { command: '/afk', why: 'Off-hours autoreply.' }],
    gettingStarted: ['BotFather → new bot → paste token.', 'Configure AI context.', 'Add to business channel/group.'],
    faqs: [
      { question: 'Why two platforms?', answer: 'Telegram for personal, Telegram for tech audience or international.' },
      { question: 'Same dashboard?', answer: 'Yes, both sessions in one place.' },
    ],
    relatedUseCase: ['businesses', 'customer-support', 'telegram-bot-for-communities'],
    relatedHowTo: ['telegram-bot-setup'],
  },

  'telegram-bot-for-communities': {
    intro:
      'Online communities of all kinds, crypto, gaming, dev, fan, run on Telegram. BotWave delivers welcome, moderation, AI assistance, and engagement tools.',
    featuredCommands: [{ command: '/welcome', why: 'Rules + intro.' }, { command: '/ai', why: 'On-demand assistant.' }, { command: '/trivia', why: 'Engagement.' }, { command: '/warn', why: 'Mod.' }],
    gettingStarted: ['Set bot up via BotFather.', 'Configure welcome + rules.', 'Enable anti-spam.'],
    faqs: [
      { question: 'Big communities?', answer: 'Tested up to 50k members per group.' },
      { question: 'Mod team?', answer: 'Multiple admins can use the dashboard.' },
    ],
    relatedUseCase: ['crypto', 'gaming-groups', 'creators', 'telegram-bot-for-creators'],
    relatedHowTo: ['telegram-bot-setup', 'telegram-bot-group'],
  },

  'telegram-bot-for-creators': {
    intro: 'Telegram is the creator-economy power platform. BotWave runs fan-channel automation: paid-access drips, exclusive content delivery, and engagement.',
    featuredCommands: [{ command: '/welcome', why: 'Exclusive content rules.' }, { command: '/post', why: 'Scheduled content drops.' }, { command: '/ai', why: 'FAQ.' }],
    gettingStarted: ['Set up channel + bot.', 'Configure scheduled drops.', 'Connect payment-gated invite link.'],
    faqs: [
      { question: 'Paid-access?', answer: 'Use Selar/Stripe to gate the invite link.' },
      { question: 'Drip-feed?', answer: 'Schedule posts at custom intervals.' },
    ],
    relatedUseCase: ['creators', 'telegram-bot-for-communities'],
    relatedHowTo: ['telegram-bot-setup'],
  },

  'telegram-bot-for-education': {
    intro:
      'Online courses, MOOCs, and coaching programs run cohorts on Telegram. BotWave automates onboarding, lesson reminders, and Q&A.',
    featuredCommands: [{ command: '/welcome', why: 'Cohort onboarding.' }, { command: '/schedule', why: 'Lesson reminders.' }, { command: '/ai', why: 'Tutor.' }, { command: '/quiz', why: 'Assessment.' }],
    gettingStarted: ['Set up cohort channel.', 'Configure lesson schedule.', 'Paste course outline in AI context.'],
    faqs: [
      { question: 'Course completion tracking?', answer: 'Yes, quiz scores and progress logged per learner.' },
      { question: 'Multi-cohort?', answer: 'One session can run multiple cohorts simultaneously.' },
    ],
    relatedUseCase: ['schools', 'study-groups', 'telegram-bot-for-school-groups'],
    relatedHowTo: ['telegram-bot-setup'],
  },

  'bot-for-customer-support': {
    intro:
      'A general-purpose customer-support bot for Telegram/Telegram, same engine, more flexibility than the dedicated vertical pages.',
    featuredCommands: [{ command: '!ai', why: 'FAQ.' }, { command: '!escalate', why: 'Hand-off.' }, { command: '!ticket', why: 'Track.' }],
    gettingStarted: ['Build FAQ KB.', 'Configure escalation routing.', 'Train team on triage policy.'],
    faqs: [
      { question: 'Live agent inbox?', answer: 'No, pair with Wati/Respond.io for multi-agent.' },
      { question: 'Webhooks?', answer: 'Yes, escalate hands off to your tools.' },
    ],
    relatedUseCase: ['customer-support', 'businesses', 'vendors'],
    relatedHowTo: ['telegram-ai-auto-reply', 'auto-reply-telegram'],
  },

  'bot-for-hr-teams': {
    intro: 'HR teams run candidate and employee groups on Telegram/Telegram. BotWave automates standard HR FAQs and broadcasts.',
    featuredCommands: [{ command: '!ai', why: 'HR FAQs (leave policy, salary day, contacts).' }, { command: '!tagall', why: 'Company announcements.' }, { command: '!schedule', why: 'Recurring policy reminders.' }],
    gettingStarted: ['Paste HR policies in AI context.', 'Add bot to staff groups.', 'Configure broadcast windows.'],
    faqs: [
      { question: 'Confidential info?', answer: 'AI does not store message bodies; only configured policies in the KB.' },
      { question: 'Multi-department?', answer: 'Separate groups; each with its own settings.' },
    ],
    relatedUseCase: ['businesses', 'customer-support'],
    relatedHowTo: ['telegram-broadcast-messages', 'telegram-scheduled-messages'],
  },

  'bot-for-event-management': {
    intro: 'Event organisers run logistics groups, attendee channels, and post-event follow-ups on Telegram/Telegram. BotWave handles RSVPs, reminders, and attendee Q&A.',
    featuredCommands: [{ command: '!rsvp', why: 'Track attendance.' }, { command: '!remind', why: 'Pre-event reminders.' }, { command: '!ai', why: 'Event FAQ.' }],
    gettingStarted: ['Configure RSVP capture.', 'Schedule reminders 7d/1d/1h.', 'Paste event details in AI context.'],
    faqs: [
      { question: 'Capacity tracking?', answer: 'RSVP count, with waitlist if cap reached.' },
      { question: 'Recurring events?', answer: 'Yes, weekly/monthly recurrence.' },
    ],
    relatedUseCase: ['businesses', 'creators', 'bot-for-political-campaigns'],
    relatedHowTo: ['telegram-broadcast-messages', 'telegram-scheduled-messages'],
  },

  'bot-for-political-campaigns': {
    intro: 'Political campaign teams use Telegram + Telegram for volunteer coordination, voter outreach, and event mobilisation. BotWave automates the high-volume comms without ban risk.',
    featuredCommands: [{ command: '!ai', why: 'Voter FAQ (location, candidate, schedule).' }, { command: '!tagall', why: 'Volunteer mobilisation.' }, { command: '!schedule', why: 'Event reminders.' }],
    gettingStarted: ['Set up campaign group structure.', 'Paste platform + bio in AI context.', 'Configure volunteer mobilisation broadcasts.'],
    faqs: [
      { question: 'Spam risk?', answer: 'Only opted-in volunteers. Anti-ban critical.' },
      { question: 'Multi-language?', answer: 'AI supports the major Nigerian languages.' },
      { question: 'GDPR/data privacy?', answer: 'BotWave honors data subject rights; export on request.' },
    ],
    relatedUseCase: ['bot-for-event-management', 'creators'],
    relatedHowTo: ['telegram-broadcast-messages', 'telegram-anti-ban-setup'],
  },

  'bot-for-delivery-services': {
    intro: 'Delivery companies coordinate riders and customers on Telegram/Telegram. BotWave standardises the comms layer.',
    featuredCommands: [{ command: '!tagall', why: 'Route changes to riders.' }, { command: '!poll', why: 'Shift voting.' }, { command: '!ai', why: 'Customer rate/ETA FAQ.' }],
    gettingStarted: ['Configure rider groups.', 'Set up customer rate FAQ.', 'Schedule shift reminders.'],
    faqs: [
      { question: 'Dispatch integration?', answer: 'Webhook hand-off to your dispatch.' },
      { question: 'GPS tracking?', answer: 'Out of scope, pair with a tracking provider.' },
    ],
    relatedUseCase: ['delivery-services', 'businesses', 'customer-support'],
    relatedHowTo: ['telegram-broadcast-messages', 'auto-reply-telegram'],
  },
};

export function getUseCaseContent(slug: string): UseCaseContent | undefined {
  return useCaseContent[slug];
}
