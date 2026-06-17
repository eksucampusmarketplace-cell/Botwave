/**
 * Rich per-slug content for /how-to/[slug] pages.
 *
 * Lives alongside (not inside) `lib/howto/data.ts` to keep the existing
 * data array append-only and sitemap-stable. The /how-to/[slug] template
 * reads from this map and falls back to a generic body if a slug is not
 * present here.
 *
 * Why each how-to needs its own unique body:
 *   Google was logging /how-to/* URLs as "Discovered - currently not
 *   indexed" because every page rendered the same generic 4-step body
 *   regardless of slug. AI engines (Perplexity, ChatGPT Search) also
 *   refuse to ingest near-duplicate programmatic pages. The unique
 *   content below, intro + prerequisites + ordered steps + tips +
 *   pitfalls + expected result + slug-specific FAQs, moves each page
 *   well past the "thin content" classifier.
 */

export interface HowToStep {
  title: string;
  body: string;
  tip?: string;
  code?: string;
}

export interface HowToFAQ {
  question: string;
  answer: string;
}

export interface HowToContent {
  /** 1-2 paragraph intro unique to this slug. */
  intro: string;
  /** What the reader needs before starting. */
  prerequisites: string[];
  /** Ordered list of unique steps for this slug. */
  steps: HowToStep[];
  /** What success looks like at the end. */
  expectedResult: string;
  /** Power-user tips. */
  tips?: string[];
  /** Common mistakes / gotchas. */
  pitfalls?: string[];
  /** Slugs of related how-to pages. */
  relatedHowTo?: string[];
  /** Slugs of related /fix pages. */
  relatedFix?: string[];
  /** Slugs of related /compare pages. */
  relatedCompare?: string[];
  /** Slugs of related /use-cases pages. */
  relatedUseCase?: string[];
  /** 3-6 FAQs unique to this slug. */
  faqs: HowToFAQ[];
}

export const howToContent: Record<string, HowToContent> = {
  'create-telegram-bot': {
    intro:
      'BotWave converts your own Telegram number into a fully programmable bot in under two minutes. The bot runs from your device IP via the Baileys library, which is dramatically safer than the server-IP approach used by most paid Telegram bot services. This guide walks you through every screen you will see, from signup to your first !sticker command.',
    prerequisites: [
      'A working Telegram account (regular or Business) installed on your phone.',
      'A free BotWave account at botwave.online/signup.',
      'About 2 minutes of uninterrupted time, pairing codes expire after 60 seconds.',
      'Telegram version 2.23 or newer (older versions do not support the Link a Device flow with pairing codes).',
    ],
    steps: [
      {
        title: 'Sign up at botwave.online/signup',
        body: 'Create a free account using your email. You will need to confirm the address via a link before you can connect a session.',
        tip: 'Use a different email from the one tied to the Telegram account you plan to connect, it keeps your recovery flows cleanly separated.',
      },
      {
        title: 'Open the Sessions tab in the dashboard',
        body: 'Click "Sessions" in the left sidebar and then "Connect Telegram". The pairing code modal will appear with a 60-second countdown.',
      },
      {
        title: 'Open Telegram → Settings → Linked Devices',
        body: 'On your phone, open Telegram, tap the three-dot menu, choose Settings, then Linked Devices, then Link a Device. Tap "Link with phone number instead" at the bottom of the QR screen.',
        tip: 'On iOS the option is called "Link with phone number"; on Android it is "Link a device with phone number".',
      },
      {
        title: 'Enter the 8-character pairing code',
        body: 'Type the code displayed in the BotWave dashboard. Telegram will pair the device and the dashboard will flip to "Connected" within 5-10 seconds.',
      },
      {
        title: 'Send your first command',
        body: 'Open any chat or group where the bot is allowed and type !help. The bot will reply with the full list of available commands.',
        code: '!help',
      },
      {
        title: 'Add the bot to a group (optional)',
        body: 'Add your bot number to a Telegram group like any other contact. The bot will start responding to commands in that group automatically.',
      },
    ],
    expectedResult:
      'The Sessions tab in your dashboard shows a green "Connected" badge, and !help replies with a list of 50+ commands in any chat the bot is in.',
    tips: [
      'The session is tied to your phone, if you log out of Telegram Web everywhere, you lose the BotWave session too.',
      'Free tier ships with all 150+ commands enabled, but caps you at 300 messages/month. Upgrade is needed only if you cross that limit.',
      'You can disable individual commands per session from Dashboard → Settings → Commands.',
      'For best anti-ban behaviour, leave the default session warmup on for the first 7 days (15 → 200 msgs/day ramp).',
    ],
    pitfalls: [
      'Do not connect the same Telegram number from two different BotWave sessions, Telegram only allows one Linked Device entry per session and the older one will be silently killed.',
      'Pairing codes expire after 60 seconds; if you miss the window, click "Regenerate code" instead of typing the old one.',
      'Avoid pairing on a number that is brand-new (<24 hours old), Telegram aggressively rate-limits new accounts and the session may get banned within minutes.',
    ],
    relatedHowTo: ['telegram-pairing-code', 'connect-telegram-bot-qr', 'telegram-anti-ban-setup', 'set-up-bot-dashboard'],
    relatedFix: ['telegram-qr-not-scanning', 'telegram-pairing-code-expired', 'telegram-bot-disconnected'],
    relatedCompare: ['botwave-vs-baileys', 'botwave-vs-evolution-api', 'best-free-telegram-bot'],
    relatedUseCase: ['schools', 'businesses', 'creators'],
    faqs: [
      {
        question: 'Do I need to be a developer to create a Telegram bot with BotWave?',
        answer:
          'No. BotWave is no-code from end to end, you sign up, paste a pairing code, and start using commands. There is no JavaScript, Python, or webhook configuration required. Developers who want webhooks and a REST API can opt into them from the Boss plan.',
      },
      {
        question: 'Is BotWave the same as a Telegram Business API account?',
        answer:
          'No. BotWave runs on a regular Telegram (or Telegram Business app) account via the Baileys library, it is a Linked Device, the same way Telegram Web is a Linked Device. The official Telegram Business API (Cloud API) requires a Meta-approved business account, a phone number not used in the consumer app, and is billed per conversation. BotWave is faster to set up and free to start; the Business API is the right choice if you need broadcast-template messaging at scale.',
      },
      {
        question: 'Will my Telegram number get banned for using BotWave?',
        answer:
          'Telegram can ban any automation, but BotWave applies a multi-layer anti-ban system specifically designed to look human: session warmup (15→200 msgs/day over 7 days), randomised typing and read receipts, message variation, presence simulation, and quiet-hours throttling. Following the on-boarding warmup period and avoiding bulk outbound to non-opted-in numbers keeps risk low, most BotWave users go years without a ban.',
      },
      {
        question: 'How long does the initial setup take?',
        answer:
          'About two minutes end-to-end if Telegram is already installed on your phone. The slowest step is usually finding "Link a Device" in Telegram Settings.',
      },
      {
        question: 'Can I use BotWave with Telegram Business?',
        answer:
          'Yes. The Telegram Business consumer app uses the same protocol as regular Telegram for Linked Devices, so pairing works identically. Note that this is the Business *app* (free, mobile-only), not the Business *API* (paid, Meta-approved).',
      },
    ],
  },

  'auto-reply-telegram': {
    intro:
      'Telegram auto-reply turns your bot into a 24/7 receptionist that answers customer questions, sends business hours, or politely defers off-topic chatter while you sleep. BotWave\'s !afk and AI auto-reply modes cover both the "I am away" use case and the "AI answers anything" use case in a single dashboard toggle.',
    prerequisites: [
      'An active BotWave Telegram session (see Create a Telegram Bot if you have not connected one yet).',
      'A clear answer to the question "what should the bot say automatically?". Even a one-sentence reply works, you can iterate.',
      'Optionally, an idea of which chats should auto-reply (e.g. only DMs, or only one specific group).',
    ],
    steps: [
      {
        title: 'Decide between AFK mode and AI mode',
        body: 'AFK mode replies with a fixed message you write yourself ("I will be back at 3pm"). AI mode uses Groq or Gemini to reply with a context-aware answer. Pick AFK if you want predictable replies; AI if you want hands-off coverage.',
      },
      {
        title: 'Set the auto-reply message',
        body: 'In a chat where the bot is active, send `!afk` followed by your message. For example: `!afk Sleeping right now, will reply at 8 AM. For urgent orders, please call +234XXXXXXX.`',
        code: '!afk Sleeping right now, will reply at 8 AM.',
      },
      {
        title: 'Restrict the reply scope (optional)',
        body: 'By default, AFK fires in DMs and groups where the bot is active. From Dashboard → Auto-reply you can scope it to specific JIDs (chats), exclude noisy groups, and set a cooldown so the same user does not get the same auto-reply twice in 30 minutes.',
      },
      {
        title: 'Test it',
        body: 'Ask a friend to message you, or send a message from a different Telegram account. The bot should reply within 1-3 seconds with the AFK text.',
      },
      {
        title: 'Turn it off when you are back',
        body: 'Send !back in any chat to clear the AFK state. The bot stops auto-replying immediately.',
        code: '!back',
      },
    ],
    expectedResult:
      'Incoming Telegram messages get an automatic, personalised reply within ~2 seconds, with no input from you. The reply respects your scope and cooldown settings so contacts do not get bombarded.',
    tips: [
      'Combine AFK + AI: set AFK as the default and let AI take over for messages that mention specific keywords (e.g. "price", "menu", "hours").',
      'Use the {name} placeholder in your AFK text, it pulls the contact\'s push name so the reply feels personal.',
      'For commerce use cases, include your business hours and an alternate contact in the AFK message so customers self-serve.',
      'Schedule recurring AFK windows (e.g. every weekday 11pm-6am) from Dashboard → Auto-reply → Schedule.',
    ],
    pitfalls: [
      'Do not set AFK to fire in every chat by default, Telegram can flag accounts that auto-reply to *every* message as automation. Scope it.',
      'AI mode counts against your daily AI query limit (10/day on free tier). If you run a busy customer-support flow, upgrade or restrict AI to specific groups.',
    ],
    relatedHowTo: ['telegram-ai-auto-reply', 'telegram-afk-status', 'telegram-auto-responses', 'telegram-business-automation'],
    relatedFix: ['telegram-auto-reply-not-working', 'telegram-ai-not-responding'],
    relatedUseCase: ['businesses', 'customer-support', 'vendors'],
    faqs: [
      {
        question: 'Does Telegram auto-reply only work for DMs?',
        answer:
          'No. By default it works in DMs and groups where the bot is added. You can scope it to DMs only, specific groups only, or specific contacts only from the dashboard.',
      },
      {
        question: 'Can I have different auto-replies for different chats?',
        answer:
          'Yes. Each session can have multiple AFK profiles tied to JID lists. For example: profile A for customer DMs ("Hi! I will reply at 8 AM"), profile B for a hangout group ("AFK"), profile C disabled entirely for your work group.',
      },
      {
        question: 'Will the auto-reply trigger for messages from the bot itself?',
        answer:
          'No. BotWave skips messages sent by the same session, and skips other known BotWave instances, so two BotWave bots in the same group will not infinite-loop replying to each other.',
      },
      {
        question: 'Is AI auto-reply truly automatic, or do I have to approve each reply?',
        answer:
          'Fully automatic by default. If you prefer approve-before-send, enable "Suggest mode", the AI drafts a reply and posts it to your dashboard for one-click approval instead of sending it directly.',
      },
    ],
  },

  'telegram-group-bot': {
    intro:
      'Adding a bot to a Telegram group unlocks anti-spam, welcome messages, AI Q&A, polls, games, and moderation tools that would otherwise eat hours of your time as an admin. BotWave is a regular Telegram Linked Device, so adding it to a group is exactly the same as adding any contact, there is no special "bot account" type.',
    prerequisites: [
      'You are an admin of the group (you can add and remove members).',
      'A connected BotWave session whose phone number you can save as a contact.',
      'Optional: a welcome message and a set of group rules ready to paste.',
    ],
    steps: [
      {
        title: 'Save the bot number as a contact',
        body: 'Add the Telegram number tied to your BotWave session to your phone\'s contact list. A name like "BotWave Bot" is fine.',
        tip: 'You can find the bot number in Dashboard → Sessions → click your session → "Phone number".',
      },
      {
        title: 'Open the Telegram group',
        body: 'Tap the group name at the top to open Group info.',
      },
      {
        title: 'Tap "Add Participant" and pick the bot',
        body: 'Search for the contact name you just saved, tap it, and confirm. The bot now appears in the member list.',
      },
      {
        title: 'Promote the bot to admin (recommended)',
        body: 'Tap the bot in the member list and choose "Make group admin". Without admin rights the bot cannot delete spam messages, kick rule-breakers, or change group settings, moderation features will be limited.',
        tip: 'Some groups prefer to leave the bot as a regular member to avoid giving automation full admin rights. That is fine, but expect fewer features to work.',
      },
      {
        title: 'Greet the group and verify',
        body: 'Send !help in the group. The bot should reply with the command list. Then send !welcome to test the welcome message flow.',
        code: '!help',
      },
      {
        title: 'Configure group-specific settings',
        body: 'From Dashboard → Groups → click the group, you can per-group: customise the welcome message, enable anti-spam, set warning thresholds, and lock specific commands.',
      },
    ],
    expectedResult:
      'The bot greets new members, deletes spam, runs games, answers AI questions, and runs polls, all inside a single Telegram group, with per-group settings you control from the dashboard.',
    tips: [
      'Run !rules in the group to publish the rules anytime; new members can pull them up with !rules whenever they join.',
      'Use !tagall (admin-only) sparingly, Mass-tagging too often is the #1 way admins lose group members to "too noisy" frustration.',
      'Enable "Read-but-skip" mode in the dashboard so the bot does not feel like it is listening to every message, it only reacts to commands.',
    ],
    pitfalls: [
      'Without admin permissions, the bot cannot delete messages or kick users, most "moderation does nothing" support tickets are actually missing-admin tickets.',
      'Adding the bot to more than ~50 groups at once on a brand-new session is a fast way to a Telegram ban. Stagger group adds over a few days, especially during the warmup period.',
    ],
    relatedHowTo: ['telegram-welcome-message', 'telegram-moderation-setup', 'telegram-anti-spam', 'telegram-custom-commands'],
    relatedFix: ['telegram-group-bot-not-admin', 'telegram-bot-not-joining-group', 'telegram-bot-not-reading-messages'],
    relatedUseCase: ['schools', 'businesses', 'churches', 'study-groups'],
    faqs: [
      {
        question: 'Why do I need to make the bot an admin?',
        answer:
          'Telegram\'s permission model only allows admins to delete other members\' messages, kick or ban members, change group settings, and use !tagall. Without admin rights the bot can still respond to commands aimed at it (like !sticker or !ai), but it cannot moderate.',
      },
      {
        question: 'Can the bot be in multiple groups at once?',
        answer:
          'Yes. A single BotWave session supports unlimited groups simultaneously. Each group can have its own welcome message, anti-spam rules, and command permissions.',
      },
      {
        question: 'Does adding the bot count as adding a "participant" for Telegram\'s 1024-member limit?',
        answer:
          'Yes, the bot occupies one member slot like any other participant. In groups close to the limit, plan accordingly.',
      },
      {
        question: 'What happens if I remove the bot from the group?',
        answer:
          'Nothing breaks. The bot just stops responding in that group. Your session and other groups are unaffected. You can re-add it any time.',
      },
    ],
  },

  'telegram-ai-assistant': {
    intro:
      'BotWave\'s !ai command turns your Telegram into a Groq-powered (with optional Gemini fallback) AI assistant. It answers questions, drafts messages, summarises long threads, translates text, and even helps with homework, all inside the chat. No copy-pasting to ChatGPT, no separate app to open.',
    prerequisites: [
      'An active BotWave Telegram session.',
      'The !ai command enabled for that session (it is on by default on free tier with a 10-queries-per-day cap).',
      'Optional: a Groq API key on the Boss plan if you want to use your own quota.',
    ],
    steps: [
      {
        title: 'Send !ai followed by your question',
        body: 'In any chat where the bot is active, type !ai then your question. The bot will reply with an AI-generated answer in 1-3 seconds.',
        code: '!ai explain the difference between Telegram Business app and Telegram Business API',
      },
      {
        title: 'Use reply mode for context-aware answers',
        body: 'Reply to a specific message with !ai to ask the AI about that exact message. Useful for translating a long voice-note transcript or summarising a long forwarded text.',
        code: '!ai summarise this',
      },
      {
        title: 'Pick a different persona (optional)',
        body: 'BotWave ships with persona shortcuts: !ai --teacher (explains like to a 10-year-old), !ai --coder (returns code), !ai --short (one-sentence answers). Personas are configurable from Dashboard → AI → Personas.',
      },
      {
        title: 'Set a daily limit per chat',
        body: 'Without limits, one person can burn your whole free-tier quota in 10 messages. From Dashboard → AI → Limits, cap each user/group to N queries per day.',
      },
      {
        title: 'Disable AI in specific chats',
        body: 'Some groups (e.g. work chats) should never trigger AI. From Dashboard → Groups → Settings → "Disable !ai in this group" to lock it off per-group.',
      },
    ],
    expectedResult:
      'Group members get instant AI answers inside the chat, with the bot handling rate limits, personas, and per-chat overrides automatically.',
    tips: [
      'Pin a !rules message that explains AI usage and limits so new members do not abuse the quota.',
      'Use --short for FAQ-style answers; full mode for explanations longer than 3 sentences.',
      'Combine with !translate for cross-language AI Q&A: !ai --translate yo "What time is the meeting?".',
      'The AI is configured with a BotWave system prompt that prevents it from impersonating other companies or generating disallowed content.',
    ],
    pitfalls: [
      'Do not feed the AI personally identifiable information you would not want logged by an upstream AI provider for short-term abuse monitoring.',
      'The free-tier 10/day cap is shared across all chats, if you have 20 chats using AI, plan for the cap to hit fast.',
    ],
    relatedHowTo: ['telegram-ai-auto-reply', 'telegram-translate-messages', 'api-key-setup'],
    relatedFix: ['telegram-ai-not-responding'],
    relatedCompare: ['best-ai-chatbot-telegram', 'best-ai-chatbots-2026'],
    relatedUseCase: ['businesses', 'customer-support', 'study-groups'],
    faqs: [
      {
        question: 'Which AI model powers !ai?',
        answer:
          'Groq\'s llama-3.3-70b-versatile is the default, it is fast, capable, and free to use within BotWave\'s included quota. Google Gemini 2.0 Flash is available as an opt-in fallback for cases where Groq is unavailable.',
      },
      {
        question: 'Are my !ai prompts private?',
        answer:
          'BotWave never persists !ai prompts or responses. Prompts pass through Groq/Gemini briefly during the request, those providers may retain prompts short-term for abuse monitoring per their privacy policies. See our Privacy Policy for details.',
      },
      {
        question: 'Can I bring my own AI key (BYOK)?',
        answer:
          'Yes on the Boss plan. Add your Groq or Gemini API key from Dashboard → AI → BYOK. Your !ai usage then bills against your own provider account instead of BotWave\'s shared pool, and the daily limit is removed.',
      },
      {
        question: 'Why does the AI refuse some questions?',
        answer:
          'The model is configured to decline requests that would generate disallowed content (hate, illegal advice, instructions for harm). It will also decline impersonation requests, e.g. it will not pretend to be a different brand or company.',
      },
    ],
  },

  'telegram-sticker-maker': {
    intro:
      'BotWave\'s !sticker command turns any image into a Telegram-compliant sticker in under a second. It supports JPGs, PNGs, WebPs (transparent), short videos (auto-trimmed to 6 seconds for animated stickers), and even text with a built-in caption generator. Stickers cost nothing extra against your message quota.',
    prerequisites: [
      'Active Telegram session connected to BotWave.',
      'An image to convert, sent to any chat where the bot is active.',
      'Optional: a sticker pack name if you want the bot to push the sticker into a named pack.',
    ],
    steps: [
      {
        title: 'Send an image to a chat where the bot is active',
        body: 'Take a photo, share a meme, or drop a screenshot into a chat where the bot is present.',
      },
      {
        title: 'Reply to the image with !sticker',
        body: 'Tap-and-hold the image, tap Reply, then send !sticker. The bot processes the image and posts back a sticker within 1-2 seconds.',
        code: '!sticker',
      },
      {
        title: 'Use crop modes (optional)',
        body: 'Add a flag for the crop style: !sticker --circle, !sticker --rounded, !sticker --square. Default is square with transparent bars where needed.',
        code: '!sticker --circle',
      },
      {
        title: 'Convert a video to an animated sticker',
        body: 'Send a short video (under 6s; longer videos get auto-trimmed) and reply with !sticker. The bot returns an animated WebP sticker.',
      },
      {
        title: 'Add a pack name (optional)',
        body: 'Replace `!sticker` with `!sticker pack=MyMemes`. The metadata stays with the sticker so others can save the whole pack to their library.',
        code: '!sticker pack=MyMemes',
      },
    ],
    expectedResult:
      'The bot posts a Telegram-compliant sticker back to the chat within a couple of seconds. Tapping the sticker shows the pack name (if you set one) and lets the recipient save it to their library.',
    tips: [
      'For best results, send a square or near-square image, heavily landscape images get letterboxed.',
      'The bot is anti-fingerprint by default: each sticker has microscopic random byte jitter so Telegram does not flag repeated sticker creation as automation.',
      'Use !sticker text=...your text... to overlay text on the image (great for memes).',
      'Animated stickers count the same against your message quota as static stickers.',
    ],
    pitfalls: [
      'Videos longer than 6 seconds will be silently trimmed, start with the most important visual moment.',
      'PNG transparency is preserved only on regular !sticker; the --circle crop draws a solid background for the masked corners.',
    ],
    relatedHowTo: ['create-telegram-stickers-bot', 'telegram-logo-maker'],
    relatedFix: ['telegram-sticker-not-sending', 'telegram-sticker-not-working'],
    relatedCompare: ['best-sticker-bot-telegram'],
    faqs: [
      {
        question: 'Are there any size or resolution limits?',
        answer:
          'Telegram\'s own sticker spec caps stickers at 512×512 px and ~100KB for static, 500KB for animated. BotWave auto-resizes and re-encodes to stay within the spec, so you can send any reasonable input.',
      },
      {
        question: 'Can I save the stickers BotWave makes to a permanent pack?',
        answer:
          'Yes. Tap the sticker in Telegram, then "Add to favourites". For full custom packs, use !sticker pack=PackName when creating, others in the chat can then save the whole pack.',
      },
      {
        question: 'Does !sticker work on iPhone too?',
        answer:
          'Yes. The bot processes server-side, so the platform of the user sending the image does not matter.',
      },
    ],
  },

  'telegram-moderation-setup': {
    intro:
      'Group moderation on Telegram is normally a manual nightmare, admins delete messages by hand, warn people in DMs, and chase rule-breakers across multiple chats. BotWave automates the whole loop: anti-spam, anti-link, anti-flood, warning ladders, auto-kick, profanity filter, and a publicly visible mod log so the rest of the group can see fairness in action.',
    prerequisites: [
      'BotWave session connected and added to the group as admin.',
      'A clear sense of the rules you want enforced (e.g. no links from non-admins, max 5 messages per 10s, no profanity).',
      'Optional: a pinned !rules message so members know what is being enforced.',
    ],
    steps: [
      {
        title: 'Enable anti-spam',
        body: 'In a chat: `!antispam on`. Or in dashboard: Groups → click the group → Moderation → Anti-spam → ON. Set the threshold (default: 5 messages in 10 seconds = warning).',
        code: '!antispam on',
      },
      {
        title: 'Configure the warning ladder',
        body: 'From Dashboard → Moderation → Warnings, set how many warnings a member can accumulate before auto-kick (default: 3). Warnings expire after 30 days by default so honest mistakes do not haunt members forever.',
      },
      {
        title: 'Enable anti-link',
        body: 'Send `!antilink on` in the group. The bot deletes any external link posted by non-admins. Allowlist domains you trust (e.g. your own website) from Dashboard → Moderation → Anti-link → Allowlist.',
        code: '!antilink on',
      },
      {
        title: 'Set up the profanity filter (optional)',
        body: 'From Dashboard → Moderation → Profanity, pick a built-in word list (mild / strict / strict + slurs) or paste your own custom list. The filter is localised, Nigerian Pidgin and Yoruba slang variants are supported in addition to English.',
      },
      {
        title: 'Publish the rules',
        body: 'Run !setrules in the group with the rules text, then !rules pin. New members will be auto-greeted with a link to the rules.',
        code: '!setrules\n1. No spam.\n2. No off-topic links.\n3. Be respectful.',
      },
      {
        title: 'Check the mod log',
        body: 'Send !modlog in the group to see the last 20 moderation actions (warnings, deletes, kicks). The full log lives in Dashboard → Groups → click the group → Mod log.',
        code: '!modlog',
      },
    ],
    expectedResult:
      'Spam messages disappear within seconds, repeat offenders escalate through warnings to auto-kick automatically, and the mod log gives the group a transparent record of every moderation action.',
    tips: [
      'Combine anti-link with a "first-time poster" delay, new members get their first message held for review for 1 hour before posting freely.',
      'Customise the warning message per group: a school group might want "Hi {name}, please respect class rules"; a crypto group might want a stricter tone.',
      'Use !whitelist @user to exempt a specific member from spam/link rules (great for co-admins who post a lot of legitimate links).',
    ],
    pitfalls: [
      'Profanity filter false-positives are common in multilingual groups, start with the "mild" list and add words yourself rather than starting on "strict".',
      'If the bot is not an admin, anti-spam can detect spam but cannot delete it.',
    ],
    relatedHowTo: ['telegram-anti-spam', 'telegram-anti-link', 'telegram-welcome-message', 'set-up-auto-moderation'],
    relatedFix: ['telegram-group-bot-not-admin', 'bot-commands-not-working'],
    relatedUseCase: ['schools', 'businesses', 'churches', 'creators'],
    faqs: [
      {
        question: 'Does the bot need admin to delete spam?',
        answer:
          'Yes. Telegram\'s permission model only allows admins to delete other members\' messages. Without admin rights the bot can still issue warnings privately, but the offending message stays in chat.',
      },
      {
        question: 'How does anti-flood differ from anti-spam?',
        answer:
          'Anti-spam looks at message count over time (e.g. 5 in 10s = spam). Anti-flood looks at repeated identical or near-identical content (e.g. the same message posted 3 times in a row). They are complementary and both ON by default once moderation is enabled.',
      },
      {
        question: 'Can members appeal a kick?',
        answer:
          'Yes. By default the bot posts a "you were kicked, reply !appeal" message in DM with the user. Admins see appeals in Dashboard → Moderation → Appeals and can approve a re-add with one click.',
      },
    ],
  },

  'download-tiktok-telegram': {
    intro:
      'Sharing a TikTok in Telegram normally means a watermarked, cropped, lossy preview. BotWave\'s !download command pulls the original watermark-free MP4 from TikTok and posts it back into the chat in the highest quality TikTok serves. Same flow works for Instagram Reels, YouTube Shorts, Twitter videos, and Facebook Reels.',
    prerequisites: [
      'Active BotWave Telegram session.',
      'A TikTok URL, either the full https://www.tiktok.com/@user/video/123... or the shortened vm.tiktok.com link.',
      'The !download command enabled (on by default).',
    ],
    steps: [
      {
        title: 'Copy the TikTok URL',
        body: 'In the TikTok app, tap Share → Copy Link. Both the short vm.tiktok.com and the full URL work.',
      },
      {
        title: 'Paste it into a Telegram chat with the bot',
        body: 'Send the URL to any chat where the bot is active.',
      },
      {
        title: 'Send !download',
        body: 'Reply to the link (or send !download followed by the URL on a new line). The bot downloads the video server-side and posts the MP4 back to the chat.',
        code: '!download',
      },
      {
        title: 'Pick a quality (optional)',
        body: 'Add a flag: `!download --hd` for the highest-quality stream, `!download --audio` to grab the audio track as an MP3.',
      },
      {
        title: 'Forward the video like any other Telegram media',
        body: 'Once the bot posts the video, it behaves like any other Telegram media, forward, save to gallery, react, or quote it.',
      },
    ],
    expectedResult:
      'The watermark-free MP4 lands in the chat within a few seconds, ready to forward or save.',
    tips: [
      'For carousels (multi-image TikTok posts) the bot returns each image as a separate media message and the soundtrack as audio.',
      'Bulk download: paste up to 10 URLs in a single message and reply with !download, the bot processes them in series so the chat stays in order.',
      'YouTube downloads respect age-gates: age-restricted videos require the BotWave operator to have configured cookies (see API key setup guide).',
    ],
    pitfalls: [
      'Private TikTok accounts and friends-only posts cannot be downloaded.',
      'Some videos are geo-blocked from BotWave\'s server region; in that case the bot returns a clear error instead of a silent failure.',
      'Downloading copyrighted content for redistribution may violate the original platform\'s ToS or copyright law, you are responsible for usage.',
    ],
    relatedHowTo: ['download-youtube-telegram', 'telegram-music-download'],
    relatedFix: ['telegram-download-not-working', 'telegram-download-failed', 'telegram-media-not-sending'],
    faqs: [
      {
        question: 'Does !download keep a copy of the video?',
        answer:
          'No. Videos are streamed through the bot server and discarded after the message is sent. Only an aggregate counter is incremented for billing.',
      },
      {
        question: 'Why is the downloaded video lower quality than I expected?',
        answer:
          'TikTok and Instagram serve different quality streams based on a number of signals. Use --hd to explicitly request the highest stream the platform exposes.',
      },
      {
        question: 'Can I use !download in groups?',
        answer:
          'Yes. The bot posts back to whichever chat the !download command was sent in, group or DM.',
      },
    ],
  },

  'telegram-bot-setup': {
    intro:
      'BotWave runs Telegram bots through @BotFather, the official Telegram tool for creating bots. The whole setup takes about three minutes: ask @BotFather for a bot token, paste it into BotWave, and your Telegram bot has all 150+ commands. Same dashboard, same anti-spam, same AI features as the Telegram side.',
    prerequisites: [
      'A Telegram account (any account, not your phone number specifically).',
      'A BotWave account at botwave.online.',
      'About 3 minutes.',
    ],
    steps: [
      {
        title: 'Open @BotFather in Telegram',
        body: 'Search for @BotFather, tap it, and start the chat. Send /newbot to create a new bot.',
        code: '/newbot',
      },
      {
        title: 'Pick a bot name and username',
        body: 'BotFather asks for a display name (anything you like) and a username (must end in "bot", e.g. mygroupmod_bot). The username is what people @-mention to find the bot.',
      },
      {
        title: 'Copy the bot token',
        body: 'BotFather replies with an HTTP API token that looks like 123456789:AAH8gXk... Treat this token like a password, anyone with it can fully control your bot.',
        tip: 'You can rotate the token later via /token in BotFather if it ever leaks.',
      },
      {
        title: 'Paste the token into BotWave',
        body: 'In BotWave → Sessions → New Telegram Bot, paste the token and click Connect. The dashboard validates the token and starts the bot immediately.',
      },
      {
        title: 'Configure bot privacy in BotFather (optional)',
        body: 'Send /setprivacy → choose your bot → DISABLE. This lets the bot see all messages in groups (needed for anti-spam to work). Keep it ENABLED if you only want the bot to react when @-mentioned.',
        code: '/setprivacy',
      },
      {
        title: 'Add the bot to a group',
        body: 'Open any Telegram group → group settings → Add member → search the bot username → Add. Promote to admin if you want moderation features.',
      },
      {
        title: 'Send /help to test',
        body: 'Type /help in the group or DM the bot directly. You should get the full command list.',
        code: '/help',
      },
    ],
    expectedResult:
      'Your Telegram bot is live with 150+ commands, moderates groups, answers AI queries, makes stickers, runs polls, and shares config and analytics with your Telegram bot if you have one.',
    tips: [
      'Set a bot description and "about" text via BotFather → /setdescription → /setabouttext. These show in the bot\'s profile and help your bot get discovered via Telegram search.',
      'Configure /setcommands in BotFather with a short list so Telegram\'s autocomplete UI works nicely.',
      'For inline bots (where users @yourbot in any chat), send /setinline to BotFather. BotWave supports inline mode for the !sticker and !ai commands.',
    ],
    pitfalls: [
      'If /setprivacy is left ENABLED (the default), the bot only sees messages where it is @-mentioned. Anti-spam and welcome messages will not fire. Disable it for group moderation use cases.',
      'Bot tokens leaked publicly will be scraped within hours, never commit one to a public repo or paste it into a screenshot.',
    ],
    relatedHowTo: ['create-telegram-bot', 'telegram-bot-group', 'telegram-anti-spam', 'telegram-welcome-bot', 'setup-telegram-userbot'],
    relatedFix: ['telegram-bot-not-responding', 'telegram-bot-no-permissions', 'telegram-bot-flood-wait'],
    relatedCompare: ['telegram-bot-vs-userbot', 'best-telegram-bot-builders-2026'],
    faqs: [
      {
        question: 'What is the difference between a Telegram bot and a Telegram userbot?',
        answer:
          'A bot uses the Bot API and acts as a separate "@yourbot" account. It cannot start conversations with users who have not /start-ed it and has restricted permissions in groups by design. A userbot uses the regular MTProto API and acts as a real user account, full freedom, but you must use your own (or a burner) phone number to authenticate. BotWave supports both.',
      },
      {
        question: 'Why does my bot not see messages in groups?',
        answer:
          'Set /setprivacy to DISABLED in @BotFather. By default Telegram bots only see commands directed at them with @-mentions; with privacy disabled the bot sees all group messages, which is required for anti-spam and analytics.',
      },
      {
        question: 'Can the same BotWave account run Telegram and Telegram bots simultaneously?',
        answer:
          'Yes. Each session is independent, but they share the same dashboard, the same configuration interface, and the same usage-quota pool. Most plans include both platforms at no extra cost.',
      },
    ],
  },

  'telegram-userbot-setup': {
    intro:
      'A Telegram userbot is fundamentally different from a Telegram bot: it logs in as a real user account (using your phone number, or a burner), giving it the same permissions any user has, initiating chats, joining channels, reading message history. BotWave\'s userbot module is built on the GramJS MTProto client and is designed for power-user automation like global ban lists, message purging, and sticker kanging.',
    prerequisites: [
      'A Telegram account with a phone number you can receive SMS codes on.',
      'A Telegram API ID and API hash from https://my.telegram.org/apps (free, takes 2 minutes to create).',
      'BotWave Boss plan (userbots are a Boss-tier feature because they require MTProto session storage).',
      'Important: read our Acceptable Use rules, userbots are powerful and easy to misuse.',
    ],
    steps: [
      {
        title: 'Create a Telegram API app',
        body: 'Visit https://my.telegram.org/apps, log in with your Telegram phone number, and create a new app. App title and short name can be anything; copy the API ID (numeric) and API hash (alphanumeric).',
      },
      {
        title: 'Open Sessions → New Telegram Userbot',
        body: 'In BotWave, choose New Telegram Userbot. Enter your API ID, API hash, and the phone number you want the userbot to log in as.',
        tip: 'Use a dedicated phone number for the userbot, do not run it on your main account if you can avoid it. A cheap secondary SIM or eSIM works perfectly.',
      },
      {
        title: 'Authenticate with the SMS code',
        body: 'Telegram sends a one-time code to the account\'s active devices (or via SMS if you have no devices). Enter it into BotWave. If you have 2FA enabled, BotWave will then prompt for your 2FA password.',
      },
      {
        title: 'Pick the userbot command prefix',
        body: 'Userbots respect a `.` prefix by default (not `/`, to avoid conflicting with bot commands). Change it in Dashboard → Sessions → click the userbot → Prefix.',
      },
      {
        title: 'Send a test command',
        body: 'In any chat, send `.alive`. The userbot should reply with a status banner including uptime and version.',
        code: '.alive',
      },
      {
        title: 'Configure PM Guard (highly recommended)',
        body: 'PM Guard auto-replies to strangers and blocks repeat senders without your input. Enable it from Dashboard → Userbot → PM Guard and set a polite default message.',
      },
    ],
    expectedResult:
      'Your userbot is logged in as a real Telegram user, listens for `.` prefixed commands, and can do things regular bots cannot, join channels, read history, send to anyone, sticker-kang, global-ban.',
    tips: [
      'Userbots are powerful, keep the command prefix non-obvious (e.g. `.bw`) so others in your chats do not stumble on it.',
      'For privacy, restrict userbot commands to "self only" by default so other users cannot invoke them in your chats.',
      'Set up the userbot in a quiet account first to learn the commands before deploying on your main account.',
    ],
    pitfalls: [
      'Userbots are against Telegram\'s spirit but not strictly against the Terms of Service, abusive usage (spam, mass-DM, harassment) is, and Telegram bans userbots that misbehave aggressively.',
      'Logging into the same Telegram account from too many places at once (>3 active sessions) can trigger an SMS-code-required reauth loop.',
    ],
    relatedHowTo: ['setup-telegram-userbot', 'userbot-pm-guard', 'userbot-gban', 'userbot-antiflood', 'userbot-purge-messages'],
    relatedFix: ['telegram-userbot-session-expired', 'telegram-userbot-2fa-error', 'telegram-userbot-disconnected'],
    relatedCompare: ['telegram-bot-vs-userbot', 'dead-telegram-userbots-2026'],
    faqs: [
      {
        question: 'Is running a userbot legal / against Telegram ToS?',
        answer:
          'Telegram\'s ToS allows clients built on its public MTProto API. Userbots that respect rate limits and do not engage in abusive behaviour are tolerated; userbots used for spam, harassment, or mass-scraping are quickly banned. BotWave\'s userbot module is built to be polite by default.',
      },
      {
        question: 'Do I need a burner phone number?',
        answer:
          'Not strictly, but strongly recommended. If your userbot triggers a ban, the entire associated Telegram account is affected, using a dedicated number isolates the risk from your main account.',
      },
      {
        question: 'Can my userbot reply to messages on my behalf in my main chats?',
        answer:
          'Yes, that is one of the main use cases. PM Guard, AFK auto-reply, and translation can all run silently on your account, replying in chats where you are slow to respond.',
      },
    ],
  },

  // ---- Remaining how-to entries (concise, slug-tuned) ----

  'telegram-welcome-message': {
    intro:
      'Welcoming new members manually scales for the first few people and breaks down at the tenth. BotWave\'s welcome bot fires a customised greeting the instant a new member joins, with placeholders for {name}, {group}, and {memberCount}, plus a button to read pinned rules.',
    prerequisites: [
      'BotWave bot added to the group as a member (admin recommended for full features).',
      'Your welcome text drafted, keep it under 3 short paragraphs for readability.',
    ],
    steps: [
      { title: 'Open Dashboard → Groups → click your group → Welcome', body: 'Find the Welcome tab. The default text is a generic "Hi {name}, welcome to {group}".' },
      { title: 'Paste your custom welcome text', body: 'Supported placeholders: {name}, {group}, {memberCount}, {rulesLink}. You can also include emojis and basic Markdown bold/italic.' },
      { title: 'Add a media attachment (optional)', body: 'Upload an image (logo, banner) that will be attached to every welcome message.' },
      { title: 'Toggle "send to new member in DM"', body: 'For sensitive groups, you can have the welcome message DM\'d to the new member instead of posted publicly.' },
      { title: 'Test by inviting a friend', body: 'Or use !testwelcome to see the rendered welcome message yourself.', code: '!testwelcome' },
    ],
    expectedResult: 'Every new member receives a personalised welcome within ~1 second of joining, including any image and rules link you configured.',
    tips: [
      'Include a !rules placeholder so the welcome text becomes the rules entry-point.',
      'Localise: configure different welcome text per group, e.g. English for one and Yoruba/Hausa/Pidgin for another.',
      'Set the cooldown to 60s so a burst of joiners does not blow up the chat with 50 welcome messages.',
    ],
    relatedHowTo: ['telegram-group-bot', 'telegram-moderation-setup', 'telegram-custom-commands'],
    relatedUseCase: ['schools', 'churches', 'businesses'],
    faqs: [
      { question: 'Can I have different welcome messages for different groups?', answer: 'Yes. Each group has its own welcome configuration in Dashboard → Groups → click the group → Welcome.' },
      { question: 'Does it work if the bot is not admin?', answer: 'Yes, welcome messages need only member status, not admin. Admin is required for moderation actions like kicking.' },
      { question: 'Can the welcome trigger include the user\'s Telegram display name?', answer: 'Yes via {name}. If the user has not set a public name, it falls back to their phone number.' },
    ],
  },

  'telegram-anti-spam': {
    intro:
      'Telegram groups attract spam, link drops, copy-paste broadcasts, repeated emoji walls. BotWave\'s anti-spam is configurable per-group, tracks every offender via a warning ladder, and pairs with anti-flood (catches identical-message repetition) and anti-link (catches URL drops). Together they handle 90% of community spam without admin attention.',
    prerequisites: [
      'BotWave bot in the group as admin (admin is required to delete spam).',
      'A clear definition of "spam" for your community, high-bar communities can be strict, casual hangouts should be lenient.',
    ],
    steps: [
      { title: 'Enable anti-spam', body: 'Run `!antispam on` in the group, or toggle Dashboard → Groups → Moderation → Anti-spam → ON.', code: '!antispam on' },
      { title: 'Tune the burst threshold', body: 'Defaults: 5 messages within 10 seconds = warning. Tighter for highly-moderated groups (3/10s), looser for hangouts (8/10s).' },
      { title: 'Enable anti-flood (catches identical reposts)', body: 'Run `!antiflood on`. Anti-flood deletes the second copy of the same message within a 1-minute window.', code: '!antiflood on' },
      { title: 'Configure the warning ladder', body: 'Dashboard → Moderation → Warnings. Pick threshold (3 warnings default → kick) and warning expiry (30 days default).' },
      { title: 'Whitelist legitimate noisy members', body: 'For co-admins and known power-users, run `!whitelist @user` so the bot ignores their burst behaviour.', code: '!whitelist @user' },
    ],
    expectedResult: 'Bursts of 5+ messages in 10s, identical reposts, and repeat offenders all get auto-handled, warned, then deleted, then escalated to kick.',
    tips: [
      'Pair with anti-link so spam-with-a-link gets caught either way.',
      'Run !modlog weekly to see what the bot has been doing; tune thresholds based on real activity.',
    ],
    pitfalls: ['Anti-spam without bot-admin can only warn, not delete. Promote the bot first.'],
    relatedHowTo: ['telegram-moderation-setup', 'telegram-anti-link', 'set-up-auto-moderation'],
    relatedFix: ['telegram-bot-not-reading-messages'],
    relatedUseCase: ['schools', 'businesses'],
    faqs: [
      { question: 'Does anti-spam delete in real time?', answer: 'Yes. The bot reacts within 1-2 seconds of the offending message appearing.' },
      { question: 'Can members appeal warnings?', answer: 'Yes. By default the bot DMs the user when warned, with a "reply !appeal" prompt. Admins review appeals in the dashboard.' },
    ],
  },

  'telegram-poll-creation': {
    intro:
      'Native Telegram polls are limited to one image, no anonymity, and no ability to schedule. BotWave\'s !poll wraps richer polls, anonymous voting, scheduled close, results pinning, leaderboard integration, and works as both a one-liner and a multi-line "form" syntax.',
    prerequisites: ['BotWave bot in the group.', 'A question and at least two options ready.'],
    steps: [
      { title: 'Single-line syntax', body: 'Send: `!poll Best food in Nigeria? | Jollof | Egusi | Eba`. The bot posts a styled poll with vote buttons.', code: '!poll Best food in Nigeria? | Jollof | Egusi | Eba' },
      { title: 'Multi-line syntax (for longer options)', body: 'Send `!poll` on the first line, then the question, then each option on its own line. The bot understands either style.' },
      { title: 'Make the poll anonymous', body: 'Add `--anon` to the command. Votes are tracked but voter names are hidden in the results.', code: '!poll --anon Are you happy with the rules? | Yes | No' },
      { title: 'Schedule the close', body: 'Add `--close=24h` (or 2h, 7d, etc.). The poll auto-closes and posts results at that time.', code: '!poll --close=24h Today\'s mood? | Great | Tired | Stressed' },
      { title: 'Pin the results', body: 'Reply to the closed poll with `!pin`. The bot pins the results message so latecomers can see.' },
    ],
    expectedResult: 'A styled poll, optional anonymity, optional scheduled close, and a clear results summary, all without leaving Telegram.',
    tips: [
      'Use !vote <number> from any chat to vote programmatically (useful when polls are running across multiple groups).',
      'Polls count once against your message quota when created, then zero per vote.',
    ],
    relatedHowTo: ['telegram-polls-bot', 'telegram-polls'],
    faqs: [
      { question: 'How many options can a poll have?', answer: 'Up to 12 options per poll, same as native Telegram polls.' },
      { question: 'Can I edit a poll after sending?', answer: 'No, but you can close the current one and start a new one with the corrected options.' },
    ],
  },

  'telegram-games-setup': {
    intro:
      'BotWave\'s game system is built to keep community groups alive without admin effort: trivia auto-rotates categories, hangman picks new words from a daily pool, word-chain enforces a 5-second turn timer, and chess pairs players with persistent boards. Leaderboards roll up across all games into a single XP score per user.',
    prerequisites: ['BotWave bot in the group with the !play command enabled (on by default).'],
    steps: [
      { title: 'Start a game with !play', body: '`!play trivia` for trivia, `!play hangman` for hangman, `!play wordchain` for word chain, `!play chess @user` for chess.', code: '!play trivia' },
      { title: 'Pick categories or difficulty', body: 'Trivia: `!play trivia --category=science --difficulty=hard`. Categories include science, history, sports, pop-culture, geography.' },
      { title: 'Enable daily auto-games', body: 'Dashboard → Games → Schedule → ON. The bot will start a fresh trivia game at the time you choose every day.' },
      { title: 'Check the leaderboard', body: 'Send !leaderboard to see top players for this group. !leaderboard global shows top players across all your groups.', code: '!leaderboard' },
      { title: 'Tune the rules', body: 'Dashboard → Games → Settings: trivia time-per-question (default 30s), hangman max-guesses (default 6), word-chain turn timer.' },
    ],
    expectedResult: 'Members can spin up games on demand, daily auto-games trigger engagement, and the leaderboard tracks who is winning.',
    tips: [
      'Set up weekly leaderboard reset for fairness, new joiners stand a chance.',
      'Pair games with XP-based command unlocks (e.g. unlock !customcommand at 100 XP).',
    ],
    relatedHowTo: ['telegram-trivia-games', 'telegram-leaderboard', 'telegram-xp-system'],
    relatedUseCase: ['creators', 'gaming-groups'],
    faqs: [
      { question: 'Do games count against my message quota?', answer: 'Each bot response counts as one message. A 10-question trivia game ≈ 20 bot messages.' },
      { question: 'Can I add custom trivia questions?', answer: 'Yes via Dashboard → Games → Custom questions. Bulk-import CSV supported on Standard plan and up.' },
    ],
  },

  'telegram-music-download': {
    intro:
      'Want the audio from a YouTube or TikTok video stripped out as an MP3? BotWave\'s !download --audio pulls the highest-quality audio track from any of the platforms !download supports, transcodes it to MP3, and posts it back as a regular Telegram voice/audio message.',
    prerequisites: ['Active BotWave session.', 'A URL pointing at a video or audio-only resource.'],
    steps: [
      { title: 'Copy the source URL', body: 'YouTube, TikTok, Instagram, Twitter, SoundCloud, Spotify-share, Apple Music link.' },
      { title: 'Send !download --audio', body: 'In the chat: `!download --audio <url>`. The bot fetches, transcodes to MP3, posts as audio.', code: '!download --audio https://youtu.be/...' },
      { title: 'Pick a bitrate (optional)', body: 'Add `--bitrate=320` for 320kbps, `--bitrate=192` for default 192kbps.' },
      { title: 'Trim the start/end (optional)', body: '`!download --audio --trim=10s:60s` extracts only the segment between 10s and 1min.' },
      { title: 'Forward or save', body: 'The audio behaves like any Telegram audio file, forward, save, react.' },
    ],
    expectedResult: 'A clean MP3 file in the chat within a few seconds, ready to forward or save.',
    tips: ['Spotify-share links are resolved to the canonical track and audio is pulled from a public source where allowed.'],
    pitfalls: ['DRM-protected sources (e.g. Apple Music subscription tracks) cannot be downloaded, only public/share-link content.'],
    relatedHowTo: ['download-tiktok-telegram', 'download-youtube-telegram'],
    relatedFix: ['telegram-download-failed', 'telegram-download-not-working'],
    faqs: [
      { question: 'Is downloading music from YouTube legal?', answer: 'Depends on the source license and your jurisdiction. For your own non-commercial use of public videos, most jurisdictions consider it personal use; redistribution is a different matter and is your responsibility.' },
      { question: 'What audio formats are supported?', answer: 'MP3 (default), M4A, OGG, WAV, pick via --format=mp3 / m4a / ogg / wav.' },
    ],
  },

  'telegram-translate-messages': {
    intro:
      'Multilingual Telegram groups need fast translation without copy-pasting to Google Translate. BotWave\'s !translate uses the same underlying engine as Google\'s free public translate, supports 100+ languages, and works on quoted messages so context stays clean.',
    prerequisites: ['Active BotWave session.', 'A message you want translated.'],
    steps: [
      { title: 'Reply to the message with !translate', body: 'Tap-and-hold the message, Reply, then send !translate. The bot detects the source language and translates to your account\'s default target.' },
      { title: 'Force a specific target language', body: '`!translate yo` translates the quoted message to Yoruba. `!translate fr` to French. Use ISO 639-1 codes.', code: '!translate yo' },
      { title: 'Auto-translate a whole chat', body: 'Dashboard → Translation → Auto-translate per group: pick source and target languages. Every message in the source language is auto-translated and posted as a reply.' },
      { title: 'Translate outgoing too', body: '`!translate yo your message here` translates *your* message before sending. Great for replying in a language you do not type fluently.' },
    ],
    expectedResult: 'Multilingual groups feel mono-lingual to every member, no copy-paste, no app-switching.',
    tips: ['Combine with !ai for cross-language Q&A: !ai --translate yo "What time is the meeting?".'],
    pitfalls: ['Slang and abbreviations translate poorly; tweak after if accuracy matters.'],
    relatedHowTo: ['telegram-ai-assistant', 'telegram-auto-responses'],
    faqs: [
      { question: 'How many languages are supported?', answer: 'Over 100, including Yoruba, Hausa, Igbo, Pidgin English, Swahili, Arabic, French, Spanish, Portuguese, Hindi, Mandarin.' },
      { question: 'Is it real-time?', answer: 'Yes, responses come back in 1-2 seconds for short messages, 3-4 seconds for paragraphs.' },
    ],
  },

  'telegram-logo-maker': {
    intro:
      'BotWave\'s !logo command generates a quick brand-mark image from a single text prompt, useful for small businesses, community groups, and side-hustle vendors who need a placeholder logo in a hurry. The output is a 1080×1080 PNG ready to set as the group icon or business profile picture.',
    prerequisites: ['Active BotWave session.', 'A name or short phrase for the logo.'],
    steps: [
      { title: 'Run !logo with your text', body: '`!logo CampusBites`. The bot generates a logo and replies with the image.', code: '!logo CampusBites' },
      { title: 'Pick a style', body: '`!logo --style=minimal CampusBites`, --modern, --playful, --bold. Each style applies a different colour palette and font weight.' },
      { title: 'Iterate', body: 'Reply !regen to try a different variation with the same prompt. Do this until you like the result.', code: '!regen' },
      { title: 'Set as group icon', body: 'Long-press the logo, save to gallery, then update the group icon manually. (Telegram prevents bots from setting group icons directly.)' },
    ],
    expectedResult: 'A clean square logo image in chat in a few seconds, ready to use as a placeholder.',
    tips: ['Run !logo with a colour: !logo --color=emerald NewCafe.'],
    relatedHowTo: ['telegram-sticker-maker', 'telegram-ai-assistant'],
    faqs: [
      { question: 'Can I get the SVG?', answer: 'On Boss plan, yes, append --format=svg.' },
      { question: 'Is the generated logo copyrightable?', answer: 'You own the output for commercial use. Two different prompts may sometimes produce visually similar outputs, pick a result that\'s clearly your own brand.' },
    ],
  },

  'telegram-anti-ban-tips': {
    intro:
      'Telegram aggressively bans accounts that look automated. BotWave bakes in a multi-layer anti-ban system, but a few admin-side habits make the difference between "never banned" and "weekly reconnects". This guide is a checklist of every habit that lowers ban risk.',
    prerequisites: ['Working BotWave session.', 'An honest look at how your bot is currently being used.'],
    steps: [
      { title: 'Leave session warmup on for the first 7 days', body: 'New sessions are capped at 15 msgs/day on day 1 and ramp to 200 by day 7. This is the single biggest ban-risk reducer, do not override it.' },
      { title: 'Keep daily volume below 200 messages on free tier', body: 'BotWave enforces a 200 msg/day cap by default. Going higher is paid-plan territory and requires a "warmed" session (>30 days old).' },
      { title: 'Use randomised reply delays', body: 'Default ON. Each reply has a randomised 1.5-4.5s delay so the bot does not look robotic. Do not disable this unless you know what you are doing.' },
      { title: 'Avoid bulk outbound to non-opted-in numbers', body: 'Telegram\'s primary ban signal is unsolicited bulk messaging. Only send to users who have explicitly opted in (group members count as opt-in; cold lists do not).' },
      { title: 'Rotate AI personas', body: 'Identical responses across many groups raise fingerprinting risk. BotWave already rotates responses; do not paste static templates that defeat that.' },
      { title: 'Respect quiet hours', body: 'Default 12am-6am is quiet (slower replies, shorter messages). Keeping it on simulates human sleep patterns.' },
    ],
    expectedResult: 'Sessions that survive months/years without bans, verified by BotWave\'s own internal tracking on long-lived sessions.',
    tips: ['If a session does get banned, do not pair the same number again immediately. Wait 24-48h.'],
    pitfalls: ['Disabling anti-ban "to make replies faster" is the most common self-inflicted ban cause.'],
    relatedHowTo: ['telegram-anti-ban-setup', 'create-telegram-bot', 'telegram-session-recovery'],
    relatedFix: ['telegram-bot-banned', 'telegram-bot-disconnected'],
    faqs: [
      { question: 'Will I ever get banned if I follow this guide?', answer: 'Risk drops dramatically but never to zero, Telegram\'s ban algorithm is opaque and changes. Plan for the rare ban (have a backup number) rather than betting on "never".' },
      { question: 'Does using BotWave automatically ban my number?', answer: 'No. BotWave is one of the most ban-conservative automation platforms; thousands of sessions run for months without incident. The risk comes from how the bot is used, not from the platform itself.' },
    ],
  },

  'telegram-business-automation': {
    intro:
      'Automating a Telegram Business account with BotWave gives you 24/7 customer answers, instant catalog pulls, auto-replies to common questions ("price?", "location?", "hours?"), and a clean handoff to a human when needed. All without paying for Telegram Cloud API.',
    prerequisites: ['A Telegram Business app account (free).', 'BotWave connected to it as a Linked Device.', 'A short FAQ list of the questions you get most.'],
    steps: [
      { title: 'Build the FAQ playbook', body: 'Dashboard → Business → FAQ. Add 10-20 of your most common customer questions and the canned answers you want the bot to use.' },
      { title: 'Set business hours and AFK', body: 'Dashboard → Business → Hours. Configure your open hours; outside hours, the bot auto-replies "We are closed, will reply when we open at X". Inside hours, the bot defers to FAQ and AI.' },
      { title: 'Connect AI for fallback', body: 'When the FAQ does not match, hand off to !ai with a system prompt that has your business info. Dashboard → AI → System prompt.' },
      { title: 'Track conversion', body: 'Dashboard → Analytics → conversion: how many auto-replies led to an actual order. Tune the FAQ based on what is converting and what is not.' },
      { title: 'Add a "talk to human" escalation', body: 'When a user types "human" or "agent", the bot pings you in DM. Configure the trigger in Dashboard → Business → Escalation.' },
    ],
    expectedResult: 'Customers get instant answers to 80%+ of common questions, you get pinged only for the genuinely tricky cases, and conversion data tells you what to improve.',
    tips: ['Build the FAQ from your last 200 customer DMs, those are your real questions, not the ones you assume.'],
    pitfalls: ['Bulk outbound to non-opted-in numbers is the fastest way to a Telegram Business ban. Always opt-in.'],
    relatedHowTo: ['automate-customer-support', 'bot-for-online-business', 'telegram-broadcast-bot'],
    relatedUseCase: ['businesses', 'vendors', 'customer-support'],
    faqs: [
      { question: 'Is this Telegram Business API?', answer: 'No. This is the free Telegram Business app via the same Linked Device protocol as regular Telegram. No Meta approval, no per-conversation pricing.' },
      { question: 'Can the bot send catalog cards?', answer: 'Native catalog is Telegram-Business-only; the bot can reply with a catalog *link* and price summary text. For true rich-card catalog, the official Cloud API is required.' },
    ],
  },

  'set-up-telegram-moderation': {
    intro:
      'Telegram moderation at scale = anti-spam + anti-link + anti-flood + warning ladder + auto-kick + transparent mod log. This is the all-in-one walkthrough, different from /telegram-moderation-setup in that it is the dashboard-first variant for admins who prefer GUI configuration.',
    prerequisites: ['Bot is admin in target group.', 'Defined rules.'],
    steps: [
      { title: 'Dashboard → Groups → click group → Moderation', body: 'You will see toggles for Anti-spam, Anti-link, Anti-flood, Profanity filter, Warning ladder.' },
      { title: 'Toggle on the categories you want', body: 'Start with Anti-spam + Anti-flood. Add Anti-link after a week if link spam is still an issue.' },
      { title: 'Configure thresholds', body: 'Defaults work for most groups; tighten for high-bar communities.' },
      { title: 'Pick the warning ladder', body: '3-warning default → kick. Each warning expires after 30 days.' },
      { title: 'Pin the rules', body: 'Run !setrules then !rules pin in the group.' },
    ],
    expectedResult: 'A self-moderating group with clear escalation rules.',
    tips: ['Start permissive; tighten only if data shows offenders slipping through.'],
    relatedHowTo: ['telegram-moderation-setup', 'telegram-anti-spam', 'telegram-anti-link', 'set-up-auto-moderation'],
    faqs: [
      { question: 'Bot or dashboard?', answer: 'Both, they edit the same config. Dashboard is friendlier for first-time setup; in-chat commands are faster for tweaks.' },
    ],
  },

  'create-telegram-stickers-bot': {
    intro:
      'Building a dedicated Telegram sticker bot used to mean spinning up Baileys, writing media handlers, and dealing with WebP encoding. BotWave gives you a sticker bot in 2 minutes with full sticker-pack support, animated stickers, and customisation.',
    prerequisites: ['BotWave session connected.', '!sticker command enabled (default).'],
    steps: [
      { title: 'Pair a session, see "Create a Telegram Bot"', body: 'No special config needed for sticker mode; it ships ready.' },
      { title: 'Configure default sticker pack', body: 'Dashboard → Stickers → Default pack name. Every !sticker reply will be tagged with this pack so recipients can save the whole set.' },
      { title: 'Enable animated stickers', body: 'Dashboard → Stickers → Animated → ON. The bot will accept short videos and return animated WebP.' },
      { title: 'Pin sticker tutorials in your groups', body: 'A pinned message explaining !sticker, !sticker --circle, !sticker --animated drives adoption.' },
    ],
    expectedResult: 'A fully functional sticker bot that members can use without any documentation.',
    tips: ['Use !sticker text=... for meme-style captioned stickers.'],
    relatedHowTo: ['telegram-sticker-maker'],
    relatedFix: ['telegram-sticker-not-sending', 'telegram-sticker-not-working'],
    relatedCompare: ['best-sticker-bot-telegram'],
    faqs: [
      { question: 'Do animated stickers work on iPhone?', answer: 'Yes, Telegram added cross-platform animated sticker support in 2021.' },
    ],
  },

  'telegram-ai-auto-reply': {
    intro:
      'AI auto-reply takes Auto-Reply one step further: instead of a fixed string, the bot uses an LLM to generate context-aware replies based on the incoming message. Best for customer-support, FAQ heavy DMs, and study groups.',
    prerequisites: ['Active BotWave session.', '!ai command enabled.', 'A short system prompt with your business/group info.'],
    steps: [
      { title: 'Dashboard → AI → Auto-reply → ON', body: 'Pick the scope (DM only, specific groups, or everywhere).' },
      { title: 'Write a 1-2 paragraph system prompt', body: 'Example: "You are the assistant for CampusBites, a Lagos student delivery service. Hours: 10am-10pm. Min order: ₦1500. If asked about delivery fee, say it depends on distance and offer to calculate."' },
      { title: 'Set the daily query cap', body: 'Default 10/day on free tier; raise on paid tiers. Per-user caps prevent abuse.' },
      { title: 'Test with a friend', body: 'Have them DM the bot a typical customer question. Tune the system prompt based on the result.' },
    ],
    expectedResult: 'DMs and configured groups get LLM-generated, context-aware replies within 1-3 seconds.',
    tips: ['Include "escalate to human if uncertain" in the system prompt, the bot will defer rather than hallucinate.'],
    pitfalls: ['AI auto-reply will sometimes get a question wrong. Use the conversation log to spot patterns and improve the prompt.'],
    relatedHowTo: ['auto-reply-telegram', 'telegram-ai-assistant', 'api-key-setup'],
    relatedFix: ['telegram-ai-not-responding'],
    relatedUseCase: ['businesses', 'customer-support'],
    faqs: [
      { question: 'Can I review and approve AI replies before they send?', answer: 'Yes, enable Suggest mode in Dashboard → AI → Auto-reply.' },
    ],
  },

  'telegram-group-analytics': {
    intro:
      'BotWave\'s group analytics surface who posts, what gets engagement, when activity spikes, and which commands users actually invoke. Useful for community managers to spot dying groups and double-down on what works.',
    prerequisites: ['BotWave bot in the group with read access.', 'Analytics enabled (Dashboard → Groups → click group → Analytics → ON).'],
    steps: [
      { title: 'Open Dashboard → Analytics → Groups', body: 'Pick the group and the time range.' },
      { title: 'Review the top metrics', body: 'Daily active members, messages per day, top 10 commands, top 10 most-active posters, peak activity hours.' },
      { title: 'Export to CSV', body: 'For reporting, click Export. The CSV includes per-user and per-day breakdowns.' },
      { title: 'Set up a weekly digest', body: 'Dashboard → Analytics → Schedule digest → weekly. You\'ll receive a summary email every Monday.' },
    ],
    expectedResult: 'A clear picture of who is engaged and what content drives engagement, refreshed daily.',
    tips: ['Cross-reference analytics with the moderation log to spot if a moderation action affected activity.'],
    relatedHowTo: ['telegram-analytics', 'telegram-member-tracking'],
    faqs: [
      { question: 'Do you store message content for analytics?', answer: 'No. Only aggregate counts and timestamps. Message bodies are never persisted.' },
    ],
  },

  'telegram-scheduled-messages': {
    intro:
      'Schedule a message for any future time and BotWave fires it from your session at the exact second, works for daily standups, birthday greetings, weekly digests, sales-launch announcements, prayer-time reminders. No standalone scheduler app needed.',
    prerequisites: ['Active BotWave session.', 'Knowing what time you want the message to fire.'],
    steps: [
      { title: '!schedule in the target chat', body: 'Syntax: `!schedule "Hi team, standup in 5 mins" 9:00am`. Times in your account timezone by default; override with `tz=Africa/Lagos`.', code: '!schedule "Standup" 9:00am' },
      { title: 'Schedule recurring messages', body: '`!schedule --daily "Standup" 9:00am`, --weekly, --monthly. Or a cron string: `--cron="0 9 * * 1-5"` for weekday-only 9am.' },
      { title: 'List scheduled messages', body: 'Run !schedule list. Cancel any with !schedule cancel <id>.', code: '!schedule list' },
      { title: 'Bulk-schedule from CSV', body: 'Dashboard → Scheduler → Import. Upload a CSV with date, time, chat, and message, useful for sales campaigns.' },
    ],
    expectedResult: 'Messages fire automatically at the scheduled time, with success/failure tracked in the dashboard.',
    tips: ['Schedule "behind the scenes" reminders to yourself in your own DM, a great hack to replace separate reminder apps.'],
    relatedHowTo: ['telegram-broadcast-bot', 'telegram-custom-commands'],
    faqs: [
      { question: 'What if my session is disconnected when the message is due?', answer: 'The message is queued and fires when the session reconnects, with a "delivered late by Xm" note. To skip late messages, add --skip-if-offline.' },
    ],
  },

  'telegram-anti-link': {
    intro:
      'Anti-link automatically deletes external URLs posted by non-admin members and applies a warning. You can allowlist trusted domains so legitimate links (your own site, YouTube, etc.) pass through.',
    prerequisites: ['Bot admin in the target group.'],
    steps: [
      { title: 'Enable: `!antilink on`', body: 'Or Dashboard → Moderation → Anti-link → ON.', code: '!antilink on' },
      { title: 'Allowlist trusted domains', body: 'Dashboard → Anti-link → Allowlist. Add your own domain, plus youtube.com / spotify.com if relevant.' },
      { title: 'Exempt members', body: '`!whitelist @user` lets that user post any link without triggering anti-link.' },
      { title: 'Set the action on detection', body: 'Default: delete + warn. Optionally: delete only / warn only / delete + kick.' },
    ],
    expectedResult: 'Off-topic link drops vanish within 1-2 seconds; legitimate links pass.',
    pitfalls: ['Without bot-admin, anti-link warns but cannot delete.'],
    relatedHowTo: ['telegram-anti-spam', 'telegram-moderation-setup'],
    faqs: [
      { question: 'Does it block t.me / chat.telegram.com invites?', answer: 'Yes by default, those are common spam vectors. Allowlist them if you trust the source.' },
    ],
  },

  'telegram-polls-bot': {
    intro:
      'BotWave\'s polls bot is a wrapper around !poll with extras: scheduled close, anonymous mode, pinned results, and per-group quotas. Setup is one toggle.',
    prerequisites: ['Bot in the group.'],
    steps: [
      { title: 'Enable: Dashboard → Polls → ON', body: 'Per-group toggle.' },
      { title: 'Set defaults', body: 'Default close window (24h), default anonymity (off), default emoji palette.' },
      { title: 'Run polls with !poll', body: 'See "Set up Telegram polls" for syntax.' },
    ],
    expectedResult: 'Polls behave consistently across all your groups.',
    relatedHowTo: ['telegram-poll-creation', 'telegram-polls'],
    faqs: [
      { question: 'Can members create polls or only admins?', answer: 'Configurable per group. Default: members can create; admins can close any.' },
    ],
  },

  'telegram-trivia-games': {
    intro:
      'Trivia is BotWave\'s most-played game. Auto-scheduled daily questions keep dying groups alive, and topic packs (science, sports, pop, history) let you target your audience.',
    prerequisites: ['Bot in group; !play enabled.'],
    steps: [
      { title: 'Quick: !play trivia', body: 'Starts a 10-question game with mixed topics.', code: '!play trivia' },
      { title: 'Pick a category', body: '`!play trivia --category=sports --difficulty=hard`.', code: '!play trivia --category=sports' },
      { title: 'Schedule daily trivia', body: 'Dashboard → Games → Trivia → Daily ON, set time.' },
      { title: 'Custom questions', body: 'Dashboard → Games → Custom questions. Add your own pool (e.g. "Lagos street food trivia").' },
    ],
    expectedResult: 'Active engagement spikes during trivia time; long-term, members open the group more.',
    tips: ['Cap the daily auto-trivia at 5 questions so it does not flood.'],
    relatedHowTo: ['telegram-games-setup', 'telegram-leaderboard', 'telegram-xp-system'],
    faqs: [
      { question: 'Can I import 100 trivia questions at once?', answer: 'Yes, CSV import on Standard plan and up.' },
    ],
  },

  'download-youtube-telegram': {
    intro:
      'Same flow as !download for TikTok, but YouTube has a few extras: age-gated content (requires cookies), 4K downloads (Boss plan), and subtitle extraction.',
    prerequisites: ['Active session.', 'YouTube URL.'],
    steps: [
      { title: 'Paste URL, send !download', body: 'Default: highest quality up to 1080p on free tier.', code: '!download https://youtu.be/...' },
      { title: '4K on Boss plan', body: '`!download --4k` returns the 2160p stream if available.' },
      { title: 'Subtitles', body: '`!download --subs=en` returns an SRT file alongside the video.' },
      { title: 'Audio only', body: '`!download --audio` for MP3.' },
    ],
    expectedResult: 'Watermark-free, high-quality YouTube video posted to the chat.',
    pitfalls: ['Age-gated videos require cookies, see API key setup guide.'],
    relatedHowTo: ['download-tiktok-telegram', 'telegram-music-download'],
    relatedFix: ['telegram-download-failed'],
    faqs: [
      { question: 'YouTube Shorts?', answer: 'Yes, treated like normal videos.' },
    ],
  },

  'telegram-custom-commands': {
    intro:
      'Custom commands let you create your own bot triggers without writing code. !menu for your restaurant menu, !price for current pricing, !rules for group rules, all editable from the dashboard.',
    prerequisites: ['Active session.', 'A list of commands you want to add.'],
    steps: [
      { title: 'Dashboard → Custom commands → New', body: 'Pick a trigger (e.g. !menu) and a response. Response can be text, image, or a multi-step reply.' },
      { title: 'Use placeholders', body: '{name}, {time}, {date}, {group}. The reply is personalised at send time.' },
      { title: 'Multi-step replies', body: 'For tutorials: step 1 (text), step 2 (image), step 3 (text), sent as a sequence with 1s delays.' },
      { title: 'Scope to specific chats', body: 'Restrict a custom command to certain groups so it does not fire everywhere.' },
    ],
    expectedResult: 'Your group has its own command vocabulary, all without code.',
    tips: ['Track which custom commands get used most via Dashboard → Analytics → Commands.'],
    relatedHowTo: ['telegram-business-automation', 'bot-engagement-tips'],
    faqs: [
      { question: 'How many custom commands can I add?', answer: 'Free: 5 / session. Starter: 20. Standard: 100. Boss: unlimited.' },
    ],
  },

  'telegram-broadcast-bot': {
    intro:
      'Send the same message to many chats at once, only to your contacts/groups, not random numbers. Used for product launches, prayer reminders, weekly digests, and emergency alerts.',
    prerequisites: ['Active session.', 'List of chats you want to broadcast to.'],
    steps: [
      { title: 'Dashboard → Broadcast → New', body: 'Pick the chats from a checklist, draft the message, schedule or send now.' },
      { title: 'Stagger sends', body: 'BotWave staggers sends with 1-3s gaps so the bot does not fingerprint as a "burst sender". Cannot be disabled.' },
      { title: 'Track delivery', body: 'The dashboard shows per-chat status: sent, delivered, failed, read.' },
    ],
    expectedResult: 'A consistent message reaches every listed chat over a 1-5 minute window depending on count.',
    pitfalls: ['Broadcasting to non-opted-in numbers is a top ban trigger. Only broadcast to chats you legitimately own/admin.'],
    relatedHowTo: ['telegram-business-automation', 'telegram-scheduled-messages'],
    relatedUseCase: ['businesses', 'churches', 'creators'],
    faqs: [
      { question: 'How many chats can I broadcast to at once?', answer: 'Free: 5. Starter: 20. Standard: 100. Boss: unlimited.' },
    ],
  },

  'telegram-member-tracking': {
    intro:
      'Track who joins, who leaves, and who has been quiet. Useful for community managers to spot churn early and reactivate inactive members.',
    prerequisites: ['Bot in the group; analytics enabled.'],
    steps: [
      { title: 'Dashboard → Groups → click group → Members', body: 'See join date, last-active date, message count, warnings.' },
      { title: 'Filter quiet members', body: 'Filter by "no message in 30 days" to find lurkers.' },
      { title: 'Re-engage', body: 'Optional: send a polite ping in DM or in-group via custom command.' },
    ],
    expectedResult: 'A current census of your group with engagement signals per member.',
    pitfalls: ['Do not weaponise the data, pinging lurkers too hard creates resentment.'],
    relatedHowTo: ['telegram-group-analytics'],
    faqs: [
      { question: 'Do you store phone numbers?', answer: 'JIDs (which include the number), yes, for bot operation. Numbers are never shared and are deleted on session deletion.' },
    ],
  },

  'telegram-afk-status': {
    intro:
      '!afk sets an auto-reply for incoming messages while you are away. !back clears it. The status is per-session and respects scope and cooldown settings.',
    prerequisites: ['Active session.'],
    steps: [
      { title: 'Set AFK', body: '`!afk Be back at 3pm`. The bot replies with the AFK text to anyone who pings you in DM or @-mentions you in groups.', code: '!afk Be back at 3pm' },
      { title: 'Add a custom emoji', body: '`!afk 🛏️ Sleeping, back at 8am`.' },
      { title: 'Clear AFK', body: '`!back` resets the status to active.', code: '!back' },
      { title: 'Schedule AFK in advance', body: '`!afk schedule "On flight" tomorrow 8pm to 10pm`.', code: '!afk schedule "On flight" tomorrow 8pm to 10pm' },
    ],
    expectedResult: 'Messages get a friendly auto-reply while you are away; cleared when you are back.',
    tips: ['Pair with !ai auto-reply for hybrid coverage.'],
    relatedHowTo: ['auto-reply-telegram', 'telegram-ai-auto-reply'],
    faqs: [
      { question: 'Will it spam someone if they message me many times?', answer: 'No, there is a per-user cooldown (default 30min) so the same user only gets the AFK reply once per session.' },
    ],
  },

  'telegram-anti-delete': {
    intro:
      'Anti-delete re-posts messages that members try to delete from groups, with the original author and a "deleted" tag. Useful for accountability in groups where vanishing claims are a recurring problem.',
    prerequisites: ['Bot admin in the group.'],
    steps: [
      { title: 'Enable: `!antidelete on`', body: '', code: '!antidelete on' },
      { title: 'Configure recipients', body: 'Default: bot reposts the deleted message in the same group with attribution. Option: forward to admins\' DMs only.' },
      { title: 'Whitelist sensitive content', body: 'Configure media types or keywords that should never be reposted (e.g. accidental photo shares).' },
    ],
    expectedResult: '"Deleted for everyone" doesn\'t hide behaviour from admins.',
    pitfalls: ['Tell your group the policy is on, using anti-delete covertly is a fast way to lose member trust.'],
    relatedHowTo: ['telegram-moderation-setup'],
    faqs: [
      { question: 'Is this against Telegram policy?', answer: 'No, the bot is just a regular Linked Device that received the message before it was deleted. It is the same as any user who saw it before deletion.' },
    ],
  },

  'telegram-leaderboard': {
    intro:
      'BotWave\'s !leaderboard summarises XP and game wins per user across all your groups. Weekly resets keep new joiners competitive.',
    prerequisites: ['Bot in groups; games enabled.'],
    steps: [
      { title: '!leaderboard', body: 'Default: current group, this week.', code: '!leaderboard' },
      { title: 'Global', body: '!leaderboard global, across all your groups.' },
      { title: 'All-time', body: '!leaderboard all-time.' },
      { title: 'Reset', body: 'Dashboard → Games → Reset weekly leaderboard. (Auto-resets Sunday by default.)' },
    ],
    expectedResult: 'A clear, contested leaderboard that drives engagement.',
    relatedHowTo: ['telegram-games-setup', 'telegram-xp-system'],
    faqs: [
      { question: 'Can I exclude admins?', answer: 'Yes via Dashboard → Games → Leaderboard → Exclude admins.' },
    ],
  },

  'telegram-xp-system': {
    intro:
      'Members earn XP for game wins, helpful messages, and command usage. XP unlocks tiers (Newbie → Regular → Veteran) and access to perks like custom command creation.',
    prerequisites: ['Bot in group; XP enabled.'],
    steps: [
      { title: 'Enable: Dashboard → Games → XP → ON', body: '' },
      { title: 'Tune the XP rules', body: 'Per-action XP: trivia win = 10, hangman = 7, custom command creation = 5, helpful reply (admin-tagged) = 3.' },
      { title: 'Set tier thresholds', body: 'Newbie (0), Regular (50), Veteran (200), Champion (500).' },
      { title: 'Tier-gate commands', body: 'Optional: require Regular tier for !customcommand to prevent spam.' },
    ],
    expectedResult: 'A gamified progression system that rewards active members.',
    relatedHowTo: ['telegram-leaderboard', 'telegram-games-setup'],
    faqs: [
      { question: 'Does XP transfer between groups?', answer: 'No by default, each group has its own XP economy. Toggle global XP in Dashboard → Games if you want shared XP.' },
    ],
  },

  'connect-telegram-bot-qr': {
    intro:
      'Pairing code is the recommended way to connect; QR is an alternative if pairing fails. Both produce the same Linked Device entry on Telegram.',
    prerequisites: ['BotWave session.', 'Phone with Telegram.'],
    steps: [
      { title: 'Dashboard → Sessions → New', body: 'Pick "Connect via QR" instead of pairing code.' },
      { title: 'Open Telegram → Linked Devices → Link a Device', body: 'Hold the phone\'s camera up to the bot token on the dashboard.' },
      { title: 'Wait for handshake', body: '5-10 seconds. The session flips to Connected.' },
    ],
    expectedResult: 'Linked Device entry appears in Telegram; BotWave session is live.',
    pitfalls: ['QR refreshes every 20s, if it expires, click Regenerate.'],
    relatedHowTo: ['telegram-pairing-code', 'create-telegram-bot'],
    relatedFix: ['telegram-qr-not-scanning'],
    faqs: [
      { question: 'Which is better, QR or pairing code?', answer: 'Pairing code on phones that support it; QR on older Telegram versions or if pairing code keeps failing.' },
    ],
  },

  'telegram-pairing-code': {
    intro:
      'The pairing code flow generates an 8-character code that you enter into Telegram\'s Linked Devices screen, no camera, no QR scanning. Recommended for desktop-only setups or shared screens where showing a QR is awkward.',
    prerequisites: ['Telegram 2.23+ (older versions don\'t support pairing codes).'],
    steps: [
      { title: 'Open BotWave Sessions → "Connect via pairing code"', body: 'Wait for the 8-char code to appear with a 60s countdown.' },
      { title: 'In Telegram → Linked Devices → Link a Device → "Link with phone number"', body: 'Enter the 8-char code.' },
      { title: 'Wait for handshake', body: 'Connection completes in 5-10 seconds.' },
    ],
    expectedResult: 'Same outcome as QR pairing, a Linked Device entry in Telegram.',
    pitfalls: ['60s window, regenerate if you miss it.'],
    relatedHowTo: ['create-telegram-bot', 'connect-telegram-bot-qr'],
    relatedFix: ['telegram-pairing-code-expired'],
    faqs: [
      { question: 'Does the pairing code reuse?', answer: 'No, single-use, expires after 60s.' },
    ],
  },

  'telegram-anti-ban-setup': {
    intro:
      'The dashboard-level anti-ban configuration for sessions. Tunes warmup speed, daily message caps, presence simulation, and quiet hours.',
    prerequisites: ['Active session.'],
    steps: [
      { title: 'Dashboard → Sessions → click session → Anti-ban', body: 'See current settings.' },
      { title: 'Confirm warmup is ON', body: 'Days 1-7: 15 → 200 msg/day ramp.' },
      { title: 'Set daily cap', body: 'Default 200 once warmup completes; raise on paid plans up to 5000/day with caveats.' },
      { title: 'Enable quiet hours', body: 'Default 12am-6am, slower replies, shorter messages, lower presence.' },
      { title: 'Enable presence simulation', body: 'Bot toggles online/offline based on time-of-day to simulate human behaviour.' },
    ],
    expectedResult: 'Session is maximally protected against fingerprinting.',
    relatedHowTo: ['telegram-anti-ban-tips', 'create-telegram-bot'],
    relatedFix: ['telegram-bot-banned'],
    faqs: [
      { question: 'Can I skip warmup?', answer: 'You can, but ban risk on a fresh session goes up by ~5x. Not recommended.' },
    ],
  },

  'telegram-session-recovery': {
    intro:
      'If a session disconnects (phone loses connection, Telegram web logout, etc.), BotWave attempts to reconnect using saved credentials. This guide walks through what happens automatically and what to do if it does not.',
    prerequisites: ['A previously-connected session that is now disconnected.'],
    steps: [
      { title: 'Check Dashboard → Sessions', body: 'See the status. "Disconnected" with a recent timestamp usually self-heals within 60s.' },
      { title: 'Wait 2 minutes for auto-reconnect', body: 'BotWave attempts reconnect 3 times with exponential backoff.' },
      { title: 'If still disconnected → click Reconnect', body: 'Manual trigger.' },
      { title: 'If reconnect fails → pair fresh', body: 'Use pairing code or QR on the same number. Configuration and groups are preserved.' },
    ],
    expectedResult: 'Session restored without losing custom commands, warnings, or analytics history.',
    pitfalls: ['If Telegram shows "Device logged out", reconnect won\'t help, you must re-pair from scratch.'],
    relatedHowTo: ['create-telegram-bot', 'telegram-pairing-code'],
    relatedFix: ['telegram-bot-disconnected', 'telegram-bot-logged-out', 'bot-session-needs-reauth'],
    faqs: [
      { question: 'Will I lose group memberships if I re-pair?', answer: 'No, re-pairing is just authenticating again. Group memberships are at the Telegram account level, not the session level.' },
    ],
  },

  'telegram-bot-permissions': {
    intro:
      'BotWave\'s in-app permission system limits which users can invoke which commands. Useful for groups where you want !ai available to everyone but !kick locked to admins.',
    prerequisites: ['Active session; bot in group.'],
    steps: [
      { title: 'Dashboard → Groups → click group → Permissions', body: 'Default: all commands available to all members.' },
      { title: 'Lock commands to admins', body: 'Toggle !kick, !warn, !ban, !setrules to "admin only".' },
      { title: 'Lock commands to specific roles', body: 'Define roles (e.g. "Co-admin") and assign commands.' },
      { title: 'Test', body: 'Try the command as a non-admin, bot will silently ignore or post a permission-denied message.' },
    ],
    expectedResult: 'Granular control over who can do what.',
    relatedHowTo: ['telegram-moderation-setup', 'set-up-bot-dashboard'],
    faqs: [
      { question: 'Can users see which commands they have access to?', answer: 'Yes, !help shows only commands the calling user can invoke.' },
    ],
  },

  'telegram-auto-responses': {
    intro:
      'Trigger-based auto-responses: when a member posts a specific keyword or pattern, the bot replies automatically. Different from AI auto-reply in that it is rule-based, deterministic, and free of LLM cost.',
    prerequisites: ['Active session.'],
    steps: [
      { title: 'Dashboard → Auto-responses → New', body: 'Pick the trigger (keyword, regex, or phrase) and the response (text/image).' },
      { title: 'Scope it', body: 'Per-group, DMs only, or everywhere.' },
      { title: 'Set cooldown', body: 'Default 30s per user per trigger to avoid spam.' },
      { title: 'Test in a sandbox group', body: 'Tune the trigger pattern based on real chat.' },
    ],
    expectedResult: 'Common questions get instant rule-based answers without LLM cost.',
    tips: ['Combine with AI auto-reply: rules handle the common 80%, AI handles the long tail.'],
    relatedHowTo: ['auto-reply-telegram', 'telegram-ai-auto-reply', 'telegram-custom-commands'],
    faqs: [
      { question: 'How many auto-responses can I have?', answer: 'Free: 5. Starter: 20. Standard: 100. Boss: unlimited.' },
    ],
  },

  'telegram-bot-group': {
    intro:
      'Adding a Telegram bot to a group + giving it the right privacy settings so it actually sees messages.',
    prerequisites: ['Telegram bot created.', 'A target group.'],
    steps: [
      { title: 'In @BotFather: /setprivacy → disable', body: 'Now the bot sees all messages, not just @-mentions.', code: '/setprivacy' },
      { title: 'Add the bot to the group', body: 'Group settings → Add member → search username.' },
      { title: 'Promote to admin', body: 'Required for moderation features.' },
      { title: 'Verify with /help', body: '', code: '/help' },
    ],
    expectedResult: 'Bot is in the group, sees all messages, and can moderate.',
    relatedHowTo: ['telegram-bot-setup', 'telegram-moderation', 'telegram-welcome-bot'],
    relatedFix: ['telegram-bot-no-permissions'],
    faqs: [
      { question: 'Privacy mode left ON, what breaks?', answer: 'Anti-spam, welcome messages, analytics, auto-reply, all of which need to see every message.' },
    ],
  },

  'telegram-welcome-bot': {
    intro: 'Telegram\'s native welcome bot tools are limited, BotWave adds placeholders, scheduled welcome, captcha, and DM-only mode.',
    prerequisites: ['Telegram bot in the group, privacy mode off.'],
    steps: [
      { title: 'Dashboard → Groups → click group → Welcome', body: '' },
      { title: 'Write your welcome text', body: 'Placeholders {name}, {group}, {memberCount}.' },
      { title: 'Enable captcha (optional)', body: 'New joiners click a button within 60s to prove they are human. Caught >90% of join-spam bots in our tests.' },
      { title: 'Configure DM vs group', body: 'Welcome can post in-group, DM the new member, or both.' },
    ],
    expectedResult: 'Genuine new members get welcomed; join-spam bots get filtered.',
    relatedHowTo: ['telegram-bot-setup', 'telegram-anti-spam', 'telegram-welcome-message'],
    faqs: [
      { question: 'Does captcha annoy real users?', answer: 'Most users solve it in <5 seconds. The drop-off rate from captcha is far lower than the spam reduction.' },
    ],
  },

  'telegram-polls': {
    intro: 'Telegram has native polls but lacks anonymous-with-quiz mixed mode, scheduling, and result pinning. BotWave\'s /poll fills the gaps.',
    prerequisites: ['Telegram bot in chat.'],
    steps: [
      { title: '/poll Question | option1 | option2 | ...', body: '', code: '/poll Best food? | Jollof | Egusi | Eba' },
      { title: '/poll --anon for anonymous', body: '' },
      { title: '/poll --close=24h for scheduled close', body: '' },
      { title: 'Pin results', body: 'Reply to closed poll with /pin.' },
    ],
    expectedResult: 'Richer poll UX than native.',
    relatedHowTo: ['telegram-poll-creation', 'telegram-polls-bot'],
    faqs: [
      { question: 'Native Telegram poll or /poll?', answer: 'Both available, native is good for quick polls; /poll adds anonymity, scheduling, pinning.' },
    ],
  },

  'telegram-analytics': {
    intro: 'Telegram exposes more granular events than Telegram, so analytics are richer: message-edits, replies, sticker usage, view counts on forwarded posts.',
    prerequisites: ['Bot in group with privacy off.'],
    steps: [
      { title: 'Dashboard → Analytics → Telegram', body: 'Pick the chat and date range.' },
      { title: 'Review metrics', body: 'Messages/day, active members, top stickers, edit rate, reply chains.' },
      { title: 'Channel-specific metrics', body: 'For channels: post views, share rate, forward counts.' },
    ],
    expectedResult: 'A detailed picture of group health.',
    relatedHowTo: ['telegram-group-analytics'],
    faqs: [
      { question: 'Channel subscriber list?', answer: 'Telegram does not expose subscribers to bots for privacy. Only aggregate counts.' },
    ],
  },

  'telegram-moderation': {
    intro: 'Telegram moderation = anti-spam + anti-link + anti-flood + locks (restrict media types) + admin-only commands.',
    prerequisites: ['Bot in group as admin with appropriate permissions ticked.'],
    steps: [
      { title: 'Enable anti-spam: /antispam on', body: '', code: '/antispam on' },
      { title: 'Enable anti-link: /antilink on', body: '' },
      { title: 'Set locks: /locks photo off', body: 'Restrict media types in chat (photos, videos, voice notes, stickers).' },
      { title: 'Configure warning ladder', body: 'Same as Telegram side.' },
    ],
    expectedResult: 'Robust group moderation across all major spam vectors.',
    relatedHowTo: ['telegram-anti-spam', 'telegram-moderation-setup', 'telegram-locks'],
    faqs: [
      { question: 'Captcha for joins?', answer: 'Configured separately in Welcome settings.' },
    ],
  },

  'telegram-auto-reply': {
    intro: 'Auto-reply on Telegram bots = a fixed reply triggered by keywords/regex. For LLM-powered replies see Telegram AI assistant.',
    prerequisites: ['Telegram bot active.'],
    steps: [
      { title: 'Dashboard → Auto-responses → New', body: 'Pick trigger and response.' },
      { title: 'Scope to chats', body: 'Specific groups or DMs only.' },
      { title: 'Test', body: 'Send the trigger keyword; verify response.' },
    ],
    expectedResult: 'Rule-based, deterministic auto-replies.',
    relatedHowTo: ['telegram-auto-responses', 'telegram-ai-auto-reply'],
    faqs: [
      { question: 'Can I have AI fallback?', answer: 'Yes, set rule-based response with fallback to !ai for unmatched messages.' },
    ],
  },

  'telegram-locks': {
    intro: 'Telegram /locks restrict what media types members can send. Useful for "announcement-only" groups, study groups (no memes), or kid-safe spaces (no photos).',
    prerequisites: ['Bot admin with chat permission.'],
    steps: [
      { title: '/locks list', body: 'See current locks.', code: '/locks list' },
      { title: '/locks photo off', body: 'Block photo sends.', code: '/locks photo off' },
      { title: 'Multiple at once', body: '/locks sticker off video off voice off' },
      { title: 'Unlock', body: '/locks photo on.' },
    ],
    expectedResult: 'Members posting blocked media types get the message rejected.',
    relatedHowTo: ['telegram-moderation'],
    faqs: [
      { question: 'Can I lock URLs?', answer: 'Use /antilink, /locks is for media types only.' },
    ],
  },

  'telegram-notes': {
    intro: 'Notes are short saved snippets, !welcome content, !rules content, !pricing for vendors, that any member can summon with #notename.',
    prerequisites: ['Telegram bot in chat.'],
    steps: [
      { title: '/save notename content', body: 'Saves the content as a note. Reply to a message + /save name to save a forwarded message.', code: '/save rules No spam. No off-topic. Be kind.' },
      { title: 'Recall: #notename', body: 'Anywhere in the chat, # the note name to fetch.', code: '#rules' },
      { title: '/notes', body: 'List all notes in this chat.' },
      { title: '/forget notename', body: 'Delete a note.', code: '/forget rules' },
    ],
    expectedResult: 'A shared mini-wiki inside Telegram, recallable with one hashtag.',
    relatedHowTo: ['telegram-filters', 'telegram-custom-commands'],
    faqs: [
      { question: 'Who can save notes?', answer: 'Admins only by default; configurable to all members.' },
    ],
  },

  'telegram-filters': {
    intro: 'Filters auto-reply when a keyword appears in any message. Different from notes (manual recall) and auto-reply (rule-based reply): filters are best for community FAQ keywords.',
    prerequisites: ['Bot in chat.'],
    steps: [
      { title: '/filter price -> reply text', body: 'When any message contains "price", the bot replies with the configured text.', code: '/filter price See pricing: https://www.botwave.online/pricing' },
      { title: '/filters', body: 'List active filters.' },
      { title: '/stop keyword', body: 'Remove a filter.' },
    ],
    expectedResult: 'Common questions auto-answered without manual intervention.',
    pitfalls: ['Too many filters = spammy chat. Cap at ~10.'],
    relatedHowTo: ['telegram-notes', 'telegram-auto-responses'],
    faqs: [
      { question: 'Regex support?', answer: 'Yes via /filter --regex.' },
    ],
  },

  'telegram-nightmode': {
    intro: 'Night mode mutes the bot during quiet hours so it does not buzz members at 3am. Configurable per-chat.',
    prerequisites: ['Bot in chat.'],
    steps: [
      { title: 'Dashboard → Groups → click group → Night mode', body: '' },
      { title: 'Set the window', body: 'Default 12am-6am local time.' },
      { title: 'Pick what gets muted', body: 'Welcome messages, auto-replies, AI responses, game prompts. Moderation (anti-spam) stays active.' },
    ],
    expectedResult: 'Bot stays quiet during off-hours; resumes automatically.',
    relatedHowTo: ['telegram-anti-ban-tips'],
    faqs: [
      { question: 'Manual override?', answer: '/nightmode on / off in the chat.' },
    ],
  },

  'telegram-karma-system': {
    intro: 'Karma is XP\'s positive-feedback variant: members give each other karma via reactions, and a leaderboard reflects who is helpful. Light-touch incentive for community quality.',
    prerequisites: ['Bot in chat; karma enabled.'],
    steps: [
      { title: 'Enable: Dashboard → Games → Karma → ON', body: '' },
      { title: 'Reply with "+1" or "ty" to give karma', body: '' },
      { title: '/karma @user', body: 'See a user\'s karma.', code: '/karma @user' },
      { title: '/topkarma', body: 'Leaderboard.', code: '/topkarma' },
    ],
    expectedResult: 'Members are subtly incentivised to help each other.',
    relatedHowTo: ['telegram-xp-system', 'telegram-leaderboard'],
    faqs: [
      { question: 'Negative karma?', answer: 'Disabled by default to avoid drama. Enable via Dashboard if you really want it.' },
    ],
  },

  'setup-telegram-userbot': {
    intro: 'A second walkthrough of userbot setup, with emphasis on safe defaults and PM Guard activation. See also: Telegram Userbot Setup.',
    prerequisites: ['API ID + hash from my.telegram.org.', 'Boss plan.', 'Burner phone number.'],
    steps: [
      { title: 'Open Sessions → New Telegram Userbot', body: '' },
      { title: 'Enter API ID + hash + phone number', body: '' },
      { title: 'Enter SMS code', body: '' },
      { title: 'Enter 2FA if applicable', body: '' },
      { title: 'Confirm safe defaults', body: 'Prefix `.`, PM Guard ON, antiflood ON, gban OFF.' },
      { title: 'Test with .alive', body: '', code: '.alive' },
    ],
    expectedResult: 'Userbot live with safe defaults.',
    relatedHowTo: ['telegram-userbot-setup', 'userbot-pm-guard', 'userbot-antiflood'],
    relatedFix: ['telegram-userbot-2fa-error', 'telegram-userbot-session-expired'],
    faqs: [
      { question: 'Boss plan required?', answer: 'Yes, userbots need MTProto session storage which is Boss-tier infra.' },
    ],
  },

  'userbot-pm-guard': {
    intro: 'PM Guard auto-handles strangers who DM your account: requests approval before the conversation continues, optionally blocks repeat senders.',
    prerequisites: ['Userbot session active.'],
    steps: [
      { title: 'Enable: .pmguard on', body: '', code: '.pmguard on' },
      { title: 'Customise the greeting', body: '.pmguard greeting "Hi! I don\'t know you yet. To send me messages, please verify by replying YES."' },
      { title: 'Auto-block repeat senders', body: '.pmguard autoblock 3, after 3 unverified messages, the sender is blocked.' },
      { title: 'Whitelist contacts', body: 'Contacts in your contact list bypass PM Guard.' },
    ],
    expectedResult: 'Stranger DMs are handled politely without your input.',
    relatedHowTo: ['setup-telegram-userbot', 'telegram-userbot-setup'],
    faqs: [
      { question: 'Will it block real friends?', answer: 'No, anyone in your contacts is auto-whitelisted.' },
    ],
  },

  'userbot-gban': {
    intro: 'Global ban: ban a user from every group your userbot is in, simultaneously. Use carefully, this is a heavy-handed tool.',
    prerequisites: ['Userbot session in target groups, admin in each.'],
    steps: [
      { title: '.gban @user reason', body: 'Ban + push reason to mod log.', code: '.gban @user repeated spam' },
      { title: '.ungban @user', body: 'Reverse the ban.' },
      { title: '.gbanlist', body: 'See all currently gbanned users.' },
    ],
    expectedResult: 'A coordinated multi-group ban with a single command.',
    pitfalls: ['No appeals system by default, make sure you really want this. Enable per-user appeals via Dashboard.'],
    relatedHowTo: ['userbot-antiflood', 'userbot-purge-messages'],
    faqs: [
      { question: 'Cross-account gban?', answer: 'Each userbot has its own gban list. Cross-account requires manual coordination.' },
    ],
  },

  'userbot-antiflood': {
    intro: 'Anti-flood at userbot scope: detect flood patterns in any group the userbot is in and respond automatically.',
    prerequisites: ['Userbot in groups as admin.'],
    steps: [
      { title: '.antiflood on', body: 'Enables across all groups the userbot is in.', code: '.antiflood on' },
      { title: 'Configure threshold', body: 'Default: 6 messages in 10s = action.' },
      { title: 'Pick action', body: 'warn / mute 1h / kick / gban.' },
    ],
    expectedResult: 'Flood spammers stopped consistently across your groups.',
    relatedHowTo: ['userbot-gban', 'telegram-anti-spam'],
    faqs: [
      { question: 'Per-group override?', answer: 'Yes via .antiflood --group=...' },
    ],
  },

  'userbot-purge-messages': {
    intro: 'Bulk-delete a range of messages from a chat. Used for cleanup after spam waves, removing accidentally-shared info, or pruning bot reply noise.',
    prerequisites: ['Userbot admin in chat with delete permission.'],
    steps: [
      { title: 'Reply to the first message and .purge', body: 'Deletes everything from that message to the latest.', code: '.purge' },
      { title: '.purge N', body: 'Delete the last N messages.', code: '.purge 50' },
      { title: '.purge --from=@user', body: 'Delete all messages from a specific user in the visible range.' },
    ],
    expectedResult: 'Clean chat history in a single command.',
    pitfalls: ['Telegram caps deletes at 100/request, use --batch=100 for larger purges and the bot will paginate.'],
    relatedHowTo: ['userbot-gban', 'userbot-sticker-kang'],
    faqs: [
      { question: 'Are deletes recoverable?', answer: 'No, Telegram deletes are permanent. Be sure before purging.' },
    ],
  },

  'userbot-sticker-kang': {
    intro: 'Sticker-kang means stealing a sticker from one pack and adding it to your own. The userbot creates a personal pack on first use, then any future .kang adds to it.',
    prerequisites: ['Userbot active.'],
    steps: [
      { title: 'Reply to a sticker with .kang', body: 'Adds it to your default pack.', code: '.kang' },
      { title: '.kang packname', body: 'Add to a named pack instead.', code: '.kang memes' },
      { title: '.unkang', body: 'Remove the most recent kang.', code: '.unkang' },
    ],
    expectedResult: 'Your own evolving sticker pack drawn from any sticker you reply to.',
    pitfalls: ['Respect the original sticker creator, kanging copyrighted stickers for redistribution may breach copyright.'],
    relatedHowTo: ['telegram-sticker-maker', 'create-telegram-stickers-bot'],
    faqs: [
      { question: 'Animated stickers?', answer: 'Yes, kang preserves animation.' },
    ],
  },

  'migrate-telegram-to-telegram': {
    intro: 'Moving a community from Telegram to Telegram is mostly social, but a few BotWave features make the transition smoother: cross-platform announcements, shared bot config, and analytics that map across.',
    prerequisites: ['BotWave session for both platforms.', 'A migration plan and a target Telegram group.'],
    steps: [
      { title: 'Set up the Telegram bot/group first', body: 'Use the Telegram Bot Setup guide.' },
      { title: 'Pin a cross-link in the Telegram group', body: 'Use !pin with the Telegram invite link.' },
      { title: 'Schedule announcements via BotWave', body: 'Multi-day countdown, posted in both groups simultaneously via Dashboard → Broadcast.' },
      { title: 'Replicate moderation settings', body: 'Dashboard → Groups → click Telegram group → "Copy settings to Telegram group". Anti-spam, welcome, rules, all replicated.' },
      { title: 'After migration, ramp down Telegram bot', body: 'Set a forwarding auto-reply pointing at the Telegram group.' },
    ],
    expectedResult: 'Most of your active members make the move without friction.',
    tips: ['Migrations work best with a 2-week dual-running window, do not cut Telegram off cold.'],
    relatedHowTo: ['run-bot-on-multiple-platforms', 'grow-community-with-bots'],
    relatedCompare: ['telegram-bot-vs-telegram-bot'],
    faqs: [
      { question: 'Can I auto-forward messages?', answer: 'Cross-platform message forwarding is on the roadmap. Today, you can cross-post announcements via Broadcast.' },
    ],
  },

  'run-bot-on-multiple-platforms': {
    intro: 'Running one community across Telegram + Telegram (and optionally Telegram userbot) is BotWave\'s default mode. Shared dashboard, shared config, shared analytics.',
    prerequisites: ['Sessions for each platform you want to use.'],
    steps: [
      { title: 'Connect each session as a separate entry', body: 'Dashboard → Sessions → New (one per platform).' },
      { title: 'Group sessions into a "channel"', body: 'Dashboard → Channels → New → select sessions. A channel shares config and analytics.' },
      { title: 'Define shared commands', body: 'Custom commands defined at channel level apply to every member session.' },
      { title: 'Per-platform overrides', body: 'For features that only make sense on one platform (e.g. Telegram stickers vs Telegram /locks), override at session level.' },
    ],
    expectedResult: 'A unified community ops surface across all platforms.',
    relatedHowTo: ['migrate-telegram-to-telegram', 'grow-community-with-bots', 'set-up-bot-dashboard'],
    faqs: [
      { question: 'Can the same number be on both?', answer: 'Telegram uses your number, Telegram uses an API token tied to a Telegram account, different identifiers. So yes, but they are technically separate identities.' },
    ],
  },

  'automate-customer-support': {
    intro: 'Customer support automation flow: triage with rule-based auto-responses, fallback to AI for ambiguous messages, escalate to a human for complex cases. Tracked end-to-end with analytics.',
    prerequisites: ['Active session connected to a customer-facing number.'],
    steps: [
      { title: 'Build the FAQ playbook', body: 'Top 20 customer questions + canned answers.' },
      { title: 'Enable rule-based auto-responses', body: 'Cheapest tier of response.' },
      { title: 'Enable AI fallback', body: 'For questions the rules miss, AI takes a shot.' },
      { title: 'Set up human escalation', body: 'Keyword "human" / "agent" pings you in DM.' },
      { title: 'Track everything', body: 'Dashboard → Analytics → Customer support metrics: resolution rate, escalation rate, response time.' },
    ],
    expectedResult: '80%+ first-touch resolution rate for FAQ questions; humans handle only the genuinely tricky cases.',
    relatedHowTo: ['telegram-business-automation', 'telegram-ai-auto-reply', 'telegram-custom-commands'],
    relatedUseCase: ['businesses', 'customer-support'],
    faqs: [
      { question: 'Does this work for vendors?', answer: 'Yes, order tracking, price lookups, location, hours, all common patterns built in.' },
    ],
  },

  'grow-community-with-bots': {
    intro: 'A bot is not a growth strategy by itself, but it makes growth tactics cheaper to execute: welcome flows, engagement games, weekly digests, leaderboards, scheduled reminders.',
    prerequisites: ['Bot in your community group.'],
    steps: [
      { title: 'Pin a great welcome message', body: 'First-touch matters.' },
      { title: 'Run daily auto-trivia', body: 'Keeps activity flowing without admin effort.' },
      { title: 'Schedule a weekly digest', body: 'Top posts, leaderboard, upcoming events.' },
      { title: 'Add a referral command', body: '!refer generates a per-user invite link with attribution.' },
      { title: 'Run monthly cohort analysis', body: 'Dashboard → Analytics → Cohorts. Spot what drives stickiness.' },
    ],
    expectedResult: 'Healthier engagement metrics, lower churn, and more time freed for high-leverage admin work.',
    relatedHowTo: ['telegram-games-setup', 'bot-engagement-tips', 'telegram-broadcast-bot'],
    relatedUseCase: ['creators', 'schools', 'churches'],
    faqs: [
      { question: 'Is automated content "fake" engagement?', answer: 'Only if it replaces real interaction. Used to seed and sustain conversation, it works well.' },
    ],
  },

  'bot-for-online-business': {
    intro: 'Online-first businesses (e-commerce, digital products, online courses) get the most leverage from BotWave: catalog pulls, order tracking, abandoned-cart reminders, post-purchase support.',
    prerequisites: ['Active session for your customer-facing channel.'],
    steps: [
      { title: 'Hook up your catalog', body: 'Dashboard → Integrations → Shopify / WooCommerce / Paystack. Or paste a CSV. The bot can answer "what is the price of X?" and "is X in stock?" from this data.' },
      { title: 'Set up order-tracking command', body: '!track <order id>. The bot queries your platform and replies with status.' },
      { title: 'Enable abandoned-cart reminders', body: 'Scheduled message via webhook from your store: "Hi {name}, you left {product} in your cart!"' },
      { title: 'Post-purchase NPS', body: 'Schedule a follow-up 24h after purchase: "How was your experience?". Track NPS in dashboard.' },
    ],
    expectedResult: 'A 24/7 sales/support layer that reduces support load and recovers abandoned revenue.',
    relatedHowTo: ['telegram-business-automation', 'automate-customer-support'],
    relatedUseCase: ['businesses', 'vendors', 'customer-support'],
    faqs: [
      { question: 'Which platforms integrate?', answer: 'Shopify, WooCommerce, Paystack (Nigeria), Flutterwave, BigCommerce. CSV import for everything else.' },
    ],
  },

  'set-up-auto-moderation': {
    intro: 'A pre-tuned moderation profile you can apply with one click: anti-spam + anti-flood + anti-link + profanity (mild) + 3-warning ladder.',
    prerequisites: ['Bot admin in group.'],
    steps: [
      { title: 'Dashboard → Groups → click group → Auto-moderation profile', body: '' },
      { title: 'Pick "Recommended"', body: 'Default tuned for general communities.' },
      { title: 'Or pick "Strict" for high-bar groups', body: 'Tighter thresholds, profanity filter on strict.' },
      { title: 'Or pick "Lenient" for casual hangouts', body: 'Looser thresholds, profanity off.' },
      { title: 'Tweak from there', body: 'Profiles are starting points, adjust individual settings as you learn.' },
    ],
    expectedResult: 'Sane moderation in 30 seconds.',
    relatedHowTo: ['telegram-moderation-setup', 'telegram-anti-spam', 'telegram-moderation'],
    faqs: [
      { question: 'Are profiles editable?', answer: 'Yes, pick one, then tweak.' },
    ],
  },

  'bot-engagement-tips': {
    intro: 'Six battle-tested tips for keeping groups alive and bots adding value instead of becoming noise.',
    prerequisites: ['Bot in target group.'],
    steps: [
      { title: 'Schedule one auto-trivia per day max', body: 'Daily, not hourly. Trivia fatigue is real.' },
      { title: 'Cycle bot personas', body: 'Pick a different !ai persona each month to keep replies fresh.' },
      { title: 'Tie XP unlocks to community goals', body: 'E.g. "earn 50 XP this week to unlock the secret command".' },
      { title: 'Highlight top-karma members weekly', body: 'Auto-pin via scheduled message.' },
      { title: 'Avoid !tagall except for genuine emergencies', body: 'Mass-tag fatigue causes mute waves.' },
      { title: 'Track ENGAGEMENT (not just activity)', body: 'Active posters vs replies-per-post in Dashboard → Analytics.' },
    ],
    expectedResult: 'A community that grows without becoming noisy.',
    relatedHowTo: ['grow-community-with-bots', 'telegram-games-setup'],
    faqs: [
      { question: 'When is the bot too much?', answer: 'When members start muting the group. Pull back if mute rate climbs.' },
    ],
  },

  'set-up-bot-dashboard': {
    intro: 'The BotWave dashboard is the control surface for every session, group, command, analytic, and integration. Worth investing 20 minutes to learn the layout once.',
    prerequisites: ['Active BotWave account.'],
    steps: [
      { title: 'Sessions', body: 'Connect/disconnect, see status, view per-session logs.' },
      { title: 'Groups', body: 'Per-group config: welcome, moderation, permissions, analytics.' },
      { title: 'Commands', body: 'Toggle built-in commands, create custom ones, manage permissions.' },
      { title: 'Analytics', body: 'Activity, top commands, top members, retention cohorts.' },
      { title: 'Integrations', body: 'Shopify / WooCommerce / Paystack / Zapier / webhooks.' },
      { title: 'Billing', body: 'Plan, usage, payment methods.' },
      { title: 'Settings', body: 'API keys, BYOK, account preferences, account deletion.' },
    ],
    expectedResult: 'You know where everything lives without searching.',
    relatedHowTo: ['create-telegram-bot', 'set-up-auto-moderation', 'telegram-group-analytics'],
    faqs: [
      { question: 'Dashboard on mobile?', answer: 'Fully responsive, same functionality, optimised layout.' },
    ],
  },

  'api-key-setup': {
    intro: 'Bring-your-own-key (BYOK) is a Boss-plan feature: paste your own Groq / Gemini / OpenAI API key and AI usage bills against your provider account, not BotWave\'s shared pool. Removes the daily quota and gives you full control over which model is used.',
    prerequisites: ['Boss plan.', 'API keys from the AI provider(s) you want to use.'],
    steps: [
      { title: 'Generate a Groq API key', body: 'console.groq.com → API Keys → New. Copy the key.' },
      { title: 'Generate a Gemini API key', body: 'aistudio.google.com/app/apikey → Create. Copy the key.' },
      { title: 'Paste into BotWave', body: 'Dashboard → AI → BYOK → paste each key. BotWave validates immediately.' },
      { title: 'Pick the default provider', body: 'Default Groq, fallback Gemini. Or invert for cheaper experimentation.' },
      { title: 'Set per-session model override (optional)', body: 'A specific session can pin a specific model, useful for testing.' },
    ],
    expectedResult: 'Your AI usage uses your own provider quota and billing; BotWave\'s daily cap is removed.',
    relatedHowTo: ['telegram-ai-assistant', 'telegram-ai-auto-reply'],
    faqs: [
      { question: 'What if my key gets revoked?', answer: 'BotWave detects the failure and falls back to its shared pool with a notification.' },
      { question: 'Can I use OpenAI?', answer: 'On the Boss plan, yes. Default models are Groq + Gemini because they have free tiers; OpenAI is for users who prefer it.' },
    ],
  },
};

export function getHowToContent(slug: string): HowToContent | undefined {
  return howToContent[slug];
}
