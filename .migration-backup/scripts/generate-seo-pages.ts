/**
 * SEO Page Generator - Generates thousands of programmatic SEO pages
 * by creating data entries for each dynamic route.
 * 
 * Run: npx tsx scripts/generate-seo-pages.ts
 */

import { writeFileSync, readFileSync } from 'fs';
import path from 'path';

// ─── Countries & Regions ─────────────────────────────────────────────
const countries = [
  'nigeria', 'south-africa', 'india', 'kenya', 'ghana', 'usa', 'uk', 'brazil',
  'egypt', 'tanzania', 'uganda', 'cameroon', 'ethiopia', 'rwanda', 'senegal',
  'morocco', 'tunisia', 'algeria', 'zimbabwe', 'mozambique', 'zambia', 'botswana',
  'namibia', 'malawi', 'sierra-leone', 'liberia', 'gambia', 'guinea', 'mali',
  'niger', 'chad', 'sudan', 'somalia', 'eritrea', 'djibouti', 'mauritius',
  'madagascar', 'seychelles', 'comoros', 'cape-verde', 'sao-tome',
  'indonesia', 'philippines', 'malaysia', 'thailand', 'vietnam', 'myanmar',
  'pakistan', 'bangladesh', 'sri-lanka', 'nepal', 'afghanistan',
  'mexico', 'colombia', 'argentina', 'chile', 'peru', 'venezuela', 'ecuador',
  'bolivia', 'paraguay', 'uruguay', 'costa-rica', 'panama', 'guatemala',
  'honduras', 'el-salvador', 'nicaragua', 'dominican-republic', 'haiti',
  'cuba', 'jamaica', 'trinidad-and-tobago', 'barbados', 'bahamas',
  'germany', 'france', 'italy', 'spain', 'portugal', 'netherlands', 'belgium',
  'switzerland', 'austria', 'sweden', 'norway', 'denmark', 'finland',
  'poland', 'czech-republic', 'hungary', 'romania', 'bulgaria', 'croatia',
  'serbia', 'greece', 'turkey', 'ukraine', 'russia', 'ireland',
  'saudi-arabia', 'uae', 'qatar', 'kuwait', 'bahrain', 'oman', 'jordan',
  'lebanon', 'iraq', 'iran', 'israel', 'palestine',
  'australia', 'new-zealand', 'fiji', 'papua-new-guinea',
  'china', 'japan', 'south-korea', 'taiwan', 'hong-kong', 'singapore',
  'canada',
];

const countryNames: Record<string, string> = {};
countries.forEach(c => {
  countryNames[c] = c.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
});

// ─── Audiences ───────────────────────────────────────────────────────
const audiences = [
  'schools', 'churches', 'mosques', 'creators', 'influencers', 'businesses',
  'ecommerce', 'real-estate', 'restaurants', 'hotels', 'clinics', 'hospitals',
  'pharmacies', 'law-firms', 'accounting-firms', 'recruitment-agencies',
  'fitness-trainers', 'yoga-studios', 'beauty-salons', 'barbershops',
  'freelancers', 'startups', 'nonprofits', 'ngos', 'political-campaigns',
  'sports-teams', 'gaming-communities', 'crypto-communities', 'nft-communities',
  'book-clubs', 'study-groups', 'alumni-associations', 'parent-teacher-groups',
  'neighborhood-groups', 'homeowner-associations', 'tenant-groups',
  'support-groups', 'mental-health-groups', 'recovery-groups',
  'music-fans', 'movie-fans', 'anime-fans', 'kpop-fans',
  'photography-groups', 'art-communities', 'writing-communities',
  'cooking-groups', 'gardening-groups', 'diy-communities',
  'travel-groups', 'expat-communities', 'language-learning-groups',
  'investment-clubs', 'trading-groups', 'forex-communities',
  'wedding-planning', 'event-planners', 'party-groups',
  'car-enthusiasts', 'motorcycle-groups', 'cycling-clubs',
  'running-clubs', 'swimming-clubs', 'martial-arts-dojos',
  'dance-studios', 'theater-groups', 'comedy-clubs',
  'podcast-communities', 'youtubers', 'tiktok-creators',
  'online-vendors', 'dropshippers', 'affiliate-marketers',
  'customer-support', 'helpdesk', 'technical-support',
  'university-clubs', 'fraternity-groups', 'sorority-groups',
  'volunteer-organizations', 'charity-groups', 'fundraising-campaigns',
  'coaching-businesses', 'tutoring-services', 'online-courses',
  'daycare-centers', 'preschools', 'after-school-programs',
  'pet-communities', 'dog-owners', 'cat-lovers',
  'farmers-groups', 'agricultural-cooperatives', 'fishing-communities',
  'taxi-services', 'delivery-services', 'logistics-companies',
  'insurance-agents', 'financial-advisors', 'mortgage-brokers',
];

// ─── Features ────────────────────────────────────────────────────────
const features = [
  'anti-spam', 'moderation', 'ai-replies', 'sticker-maker', 'media-download',
  'auto-reply', 'welcome-messages', 'polls', 'trivia-games', 'word-games',
  'translation', 'weather', 'dictionary', 'horoscope', 'reminders',
  'scheduled-messages', 'analytics', 'group-management', 'admin-tools',
  'custom-commands', 'auto-responses', 'keyword-triggers',
  'link-detection', 'nsfw-filter', 'word-filter', 'flood-control',
  'member-tracking', 'activity-reports', 'leaderboards', 'xp-system',
  'music-bot', 'voice-notes', 'text-to-speech', 'speech-to-text',
  'qr-code-generator', 'url-shortener', 'calculator', 'unit-converter',
  'meme-generator', 'image-editor', 'background-remover', 'pdf-tools',
  'document-creator', 'spreadsheet-tools', 'form-builder',
  'event-scheduler', 'rsvp-manager', 'countdown-timer', 'birthday-tracker',
  'task-manager', 'todo-lists', 'notes', 'bookmarks',
  'contact-manager', 'crm-tools', 'lead-generation', 'sales-automation',
  'payment-integration', 'invoice-generator', 'receipt-sender',
  'appointment-booking', 'calendar-sync', 'meeting-scheduler',
  'notification-system', 'broadcast-messages', 'bulk-messaging',
  'feedback-collector', 'survey-creator', 'rating-system',
  'knowledge-base', 'faq-bot', 'support-tickets', 'escalation-system',
  'multi-language', 'auto-translate', 'language-detection',
  'file-sharing', 'cloud-storage', 'backup-system',
  'user-verification', 'captcha', 'anti-raid', 'lockdown-mode',
  'role-management', 'permission-system', 'hierarchy-management',
  'audit-log', 'action-history', 'compliance-tools',
];

// ─── Platforms ────────────────────────────────────────────────────────
const platforms = ['whatsapp', 'telegram', 'telegram-userbot'] as const;
const platformTitles: Record<string, string> = {
  'whatsapp': 'WhatsApp',
  'telegram': 'Telegram',
  'telegram-userbot': 'Telegram Userbot',
};

// ═══════════════════════════════════════════════════════════════════════
// LANDING PAGES GENERATOR
// ═══════════════════════════════════════════════════════════════════════

interface LandingPage {
  slug: string;
  title: string;
  heading: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  category: 'country' | 'audience' | 'feature' | 'platform';
}

function generateLandingPages(): LandingPage[] {
  const pages: LandingPage[] = [];
  const existingSlugs = new Set<string>();

  // Read existing data to avoid duplicates
  try {
    const existing = readFileSync(path.join(__dirname, '../lib/landing/data.ts'), 'utf-8');
    const slugMatches = existing.matchAll(/slug:\s*'([^']+)'/g);
    for (const m of slugMatches) existingSlugs.add(m[1]);
  } catch {}

  // Country pages for all platforms
  for (const platform of platforms) {
    const pTitle = platformTitles[platform];
    for (const country of countries) {
      const cName = countryNames[country];
      const slug = `${platform}-bot-${country}`;
      if (existingSlugs.has(slug)) continue;
      pages.push({
        slug,
        title: `${pTitle} Bot ${cName}`,
        heading: `Best ${pTitle} Bot for ${cName}`,
        description: `Free ${pTitle} bot for ${cName}. Group management, AI replies, automation, and community tools designed for ${cName}.`,
        seoTitle: `Best Free ${pTitle} Bot in ${cName} (2026)`,
        seoDescription: `Free ${pTitle} bot for ${cName}. AI assistant, group management, stickers, games. Start automating today.`,
        keywords: [`${platform} bot ${country}`, `free ${platform} bot ${country}`, `best ${platform} bot ${cName.toLowerCase()}`],
        category: 'country',
      });
    }
  }

  // Audience pages for all platforms
  for (const platform of platforms) {
    const pTitle = platformTitles[platform];
    for (const audience of audiences) {
      const aName = audience.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const slug = `${platform}-for-${audience}`;
      if (existingSlugs.has(slug)) continue;
      pages.push({
        slug,
        title: `${pTitle} Bot for ${aName}`,
        heading: `${pTitle} Automation for ${aName}`,
        description: `BotWave ${pTitle} bot designed for ${aName.toLowerCase()}. Automated management, engagement, and AI features tailored for your needs.`,
        seoTitle: `${pTitle} Bot for ${aName} - Free Automation (2026)`,
        seoDescription: `${pTitle} automation for ${aName.toLowerCase()}. AI replies, moderation, engagement tools. Free to start.`,
        keywords: [`${platform} bot for ${audience}`, `${platform} ${audience} automation`, `${aName.toLowerCase()} ${platform} bot`],
        category: 'audience',
      });
    }
  }

  // Feature pages for all platforms
  for (const platform of platforms) {
    const pTitle = platformTitles[platform];
    for (const feature of features) {
      const fName = feature.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const slug = `${platform}-${feature}`;
      if (existingSlugs.has(slug)) continue;
      pages.push({
        slug,
        title: `${pTitle} ${fName}`,
        heading: `${pTitle} ${fName} Bot`,
        description: `${fName} feature for ${pTitle} using BotWave. Automated ${fName.toLowerCase()} for groups and communities.`,
        seoTitle: `${pTitle} ${fName} Bot - Free Automation`,
        seoDescription: `${fName} for ${pTitle} groups. Automated ${fName.toLowerCase()} with BotWave. Free to use.`,
        keywords: [`${platform} ${feature}`, `${platform} ${feature} bot`, `${fName.toLowerCase()} ${platform}`],
        category: 'feature',
      });
    }
  }

  // Cross-platform combo pages: feature + country
  const topCountries = countries.slice(0, 20);
  const topFeatures = features.slice(0, 15);
  for (const country of topCountries) {
    const cName = countryNames[country];
    for (const feature of topFeatures) {
      const fName = feature.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const slug = `whatsapp-${feature}-${country}`;
      if (existingSlugs.has(slug)) continue;
      pages.push({
        slug,
        title: `WhatsApp ${fName} Bot ${cName}`,
        heading: `WhatsApp ${fName} for ${cName}`,
        description: `Free WhatsApp ${fName.toLowerCase()} bot for ${cName}. Automated ${fName.toLowerCase()} for groups and businesses in ${cName}.`,
        seoTitle: `WhatsApp ${fName} Bot ${cName} - Free (2026)`,
        seoDescription: `WhatsApp ${fName.toLowerCase()} for ${cName}. Free automation for groups, businesses, communities.`,
        keywords: [`whatsapp ${feature} ${country}`, `${feature} bot ${cName.toLowerCase()}`, `whatsapp bot ${country}`],
        category: 'feature',
      });
    }
  }

  return pages;
}

// ═══════════════════════════════════════════════════════════════════════
// HOW-TO PAGES GENERATOR
// ═══════════════════════════════════════════════════════════════════════

interface HowToPage {
  slug: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeToComplete: string;
}

function generateHowToPages(): HowToPage[] {
  const pages: HowToPage[] = [];
  const existingSlugs = new Set<string>();

  try {
    const existing = readFileSync(path.join(__dirname, '../lib/howto/data.ts'), 'utf-8');
    const slugMatches = existing.matchAll(/slug:\s*'([^']+)'/g);
    for (const m of slugMatches) existingSlugs.add(m[1]);
  } catch {}

  const howToTopics = [
    // WhatsApp how-tos
    { slug: 'set-up-whatsapp-moderation', title: 'How to Set Up WhatsApp Group Moderation', keywords: ['whatsapp group moderation', 'whatsapp anti spam setup'] },
    { slug: 'create-whatsapp-stickers-bot', title: 'How to Create WhatsApp Stickers with a Bot', keywords: ['whatsapp sticker bot', 'make whatsapp stickers'] },
    { slug: 'whatsapp-ai-auto-reply', title: 'How to Set Up AI Auto-Reply on WhatsApp', keywords: ['whatsapp ai auto reply', 'whatsapp ai bot setup'] },
    { slug: 'whatsapp-group-analytics', title: 'How to Track WhatsApp Group Analytics', keywords: ['whatsapp group analytics', 'whatsapp group stats'] },
    { slug: 'whatsapp-scheduled-messages', title: 'How to Schedule WhatsApp Messages', keywords: ['schedule whatsapp messages', 'whatsapp message scheduler'] },
    { slug: 'whatsapp-welcome-message', title: 'How to Set Welcome Messages in WhatsApp Group', keywords: ['whatsapp welcome message', 'whatsapp group welcome'] },
    { slug: 'whatsapp-anti-link', title: 'How to Block Links in WhatsApp Groups', keywords: ['block links whatsapp group', 'whatsapp anti link'] },
    { slug: 'whatsapp-polls-bot', title: 'How to Create Polls in WhatsApp with Bot', keywords: ['whatsapp poll bot', 'create whatsapp polls'] },
    { slug: 'whatsapp-trivia-games', title: 'How to Play Trivia Games on WhatsApp', keywords: ['whatsapp trivia game', 'whatsapp quiz bot'] },
    { slug: 'download-tiktok-whatsapp', title: 'How to Download TikTok Videos on WhatsApp', keywords: ['download tiktok whatsapp', 'tiktok downloader whatsapp'] },
    { slug: 'download-youtube-whatsapp', title: 'How to Download YouTube Videos on WhatsApp', keywords: ['download youtube whatsapp', 'youtube downloader whatsapp'] },
    { slug: 'whatsapp-translate-messages', title: 'How to Translate Messages on WhatsApp', keywords: ['whatsapp translate bot', 'translate whatsapp messages'] },
    { slug: 'whatsapp-custom-commands', title: 'How to Create Custom WhatsApp Bot Commands', keywords: ['custom whatsapp commands', 'whatsapp bot custom command'] },
    { slug: 'whatsapp-broadcast-bot', title: 'How to Broadcast Messages with WhatsApp Bot', keywords: ['whatsapp broadcast bot', 'whatsapp bulk message'] },
    { slug: 'whatsapp-member-tracking', title: 'How to Track Members in WhatsApp Groups', keywords: ['whatsapp member tracker', 'whatsapp group member list'] },
    { slug: 'whatsapp-afk-status', title: 'How to Set AFK Status on WhatsApp', keywords: ['whatsapp afk bot', 'whatsapp away status'] },
    { slug: 'whatsapp-anti-delete', title: 'How to See Deleted Messages on WhatsApp', keywords: ['whatsapp anti delete', 'see deleted whatsapp messages'] },
    { slug: 'whatsapp-leaderboard', title: 'How to Set Up Leaderboards in WhatsApp Groups', keywords: ['whatsapp leaderboard', 'whatsapp group leaderboard'] },
    { slug: 'whatsapp-xp-system', title: 'How to Add XP/Leveling System to WhatsApp Group', keywords: ['whatsapp xp system', 'whatsapp leveling bot'] },
    { slug: 'connect-whatsapp-bot-qr', title: 'How to Connect WhatsApp Bot via QR Code', keywords: ['connect whatsapp bot qr', 'whatsapp bot qr code'] },
    { slug: 'whatsapp-pairing-code', title: 'How to Use WhatsApp Bot Pairing Code', keywords: ['whatsapp pairing code', 'whatsapp bot pairing'] },
    { slug: 'whatsapp-anti-ban-setup', title: 'How to Prevent WhatsApp Bot from Getting Banned', keywords: ['prevent whatsapp bot ban', 'whatsapp anti ban'] },
    { slug: 'whatsapp-session-recovery', title: 'How to Recover WhatsApp Bot Session', keywords: ['recover whatsapp bot session', 'whatsapp bot reconnect'] },
    { slug: 'whatsapp-bot-permissions', title: 'How to Set Bot Permissions in WhatsApp Group', keywords: ['whatsapp bot permissions', 'whatsapp bot admin'] },
    { slug: 'whatsapp-auto-responses', title: 'How to Set Up Auto-Responses on WhatsApp', keywords: ['whatsapp auto responses', 'whatsapp keyword response'] },
    // Telegram how-tos
    { slug: 'create-telegram-bot', title: 'How to Create a Telegram Bot', keywords: ['create telegram bot', 'make telegram bot'] },
    { slug: 'telegram-bot-group', title: 'How to Add Telegram Bot to Group', keywords: ['add telegram bot to group', 'telegram group bot'] },
    { slug: 'telegram-anti-spam', title: 'How to Set Up Anti-Spam on Telegram', keywords: ['telegram anti spam', 'telegram spam filter'] },
    { slug: 'telegram-welcome-bot', title: 'How to Set Welcome Message in Telegram Group', keywords: ['telegram welcome message', 'telegram group welcome bot'] },
    { slug: 'telegram-polls', title: 'How to Create Polls in Telegram with Bot', keywords: ['telegram poll bot', 'create telegram polls'] },
    { slug: 'telegram-analytics', title: 'How to Track Telegram Group Analytics', keywords: ['telegram group analytics', 'telegram group stats'] },
    { slug: 'telegram-moderation', title: 'How to Moderate Telegram Groups', keywords: ['telegram group moderation', 'telegram admin tools'] },
    { slug: 'telegram-auto-reply', title: 'How to Set Up Auto-Reply on Telegram', keywords: ['telegram auto reply', 'telegram auto response'] },
    { slug: 'telegram-custom-commands', title: 'How to Create Custom Telegram Bot Commands', keywords: ['custom telegram commands', 'telegram bot custom command'] },
    { slug: 'telegram-locks', title: 'How to Lock Telegram Group Settings', keywords: ['telegram group lock', 'lock telegram chat'] },
    { slug: 'telegram-notes', title: 'How to Use Notes in Telegram Groups', keywords: ['telegram notes bot', 'telegram group notes'] },
    { slug: 'telegram-filters', title: 'How to Set Up Filters in Telegram Groups', keywords: ['telegram group filters', 'telegram word filter'] },
    { slug: 'telegram-nightmode', title: 'How to Set Night Mode on Telegram Group', keywords: ['telegram night mode', 'telegram quiet hours'] },
    { slug: 'telegram-karma-system', title: 'How to Add Karma System to Telegram Group', keywords: ['telegram karma bot', 'telegram reputation system'] },
    // Userbot how-tos
    { slug: 'setup-telegram-userbot', title: 'How to Set Up Telegram Userbot', keywords: ['setup telegram userbot', 'telegram userbot guide'] },
    { slug: 'userbot-pm-guard', title: 'How to Set Up PM Guard on Telegram Userbot', keywords: ['telegram pm guard', 'userbot pm permit'] },
    { slug: 'userbot-gban', title: 'How to Use Global Ban on Telegram Userbot', keywords: ['telegram gban', 'userbot global ban'] },
    { slug: 'userbot-antiflood', title: 'How to Set Up Anti-Flood on Telegram Userbot', keywords: ['telegram antiflood', 'userbot flood control'] },
    { slug: 'userbot-purge-messages', title: 'How to Purge Messages with Telegram Userbot', keywords: ['telegram purge messages', 'userbot delete messages'] },
    { slug: 'userbot-sticker-kang', title: 'How to Steal Stickers with Telegram Userbot', keywords: ['telegram kang sticker', 'userbot sticker steal'] },
    // Cross-platform
    { slug: 'migrate-whatsapp-to-telegram', title: 'How to Move from WhatsApp Bot to Telegram Bot', keywords: ['whatsapp to telegram bot', 'migrate whatsapp telegram'] },
    { slug: 'run-bot-on-multiple-platforms', title: 'How to Run Bots on WhatsApp and Telegram', keywords: ['multi platform bot', 'whatsapp telegram bot'] },
    { slug: 'automate-customer-support', title: 'How to Automate Customer Support with Bots', keywords: ['automate customer support', 'support bot setup'] },
    { slug: 'grow-community-with-bots', title: 'How to Grow Online Community with Bots', keywords: ['grow community bots', 'community management bot'] },
    { slug: 'bot-for-online-business', title: 'How to Use Bots for Online Business', keywords: ['bot for online business', 'business automation bot'] },
    { slug: 'set-up-auto-moderation', title: 'How to Set Up Automatic Moderation', keywords: ['auto moderation setup', 'automatic group moderation'] },
    { slug: 'bot-engagement-tips', title: 'How to Increase Group Engagement with Bots', keywords: ['group engagement bot', 'increase engagement bot'] },
    { slug: 'set-up-bot-dashboard', title: 'How to Use the BotWave Dashboard', keywords: ['botwave dashboard', 'bot dashboard setup'] },
    { slug: 'api-key-setup', title: 'How to Set Up API Keys for BotWave', keywords: ['botwave api key', 'bot api setup'] },
  ];

  for (const topic of howToTopics) {
    if (existingSlugs.has(topic.slug)) continue;
    pages.push({
      slug: topic.slug,
      title: topic.title,
      description: `Step-by-step guide: ${topic.title}. Easy to follow with screenshots and examples.`,
      seoTitle: `${topic.title} (2026 Guide)`,
      seoDescription: `${topic.title}. Step-by-step instructions with examples. Free and easy setup.`,
      keywords: topic.keywords,
      difficulty: 'beginner',
      timeToComplete: '5 minutes',
    });
  }

  return pages;
}

// ═══════════════════════════════════════════════════════════════════════
// FIX PAGES GENERATOR
// ═══════════════════════════════════════════════════════════════════════

interface FixPage {
  slug: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
}

function generateFixPages(): FixPage[] {
  const pages: FixPage[] = [];
  const existingSlugs = new Set<string>();

  try {
    const existing = readFileSync(path.join(__dirname, '../lib/fix/data.ts'), 'utf-8');
    const slugMatches = existing.matchAll(/slug:\s*'([^']+)'/g);
    for (const m of slugMatches) existingSlugs.add(m[1]);
  } catch {}

  const fixTopics = [
    { slug: 'whatsapp-bot-not-responding', title: 'WhatsApp Bot Not Responding', keywords: ['whatsapp bot not responding', 'fix whatsapp bot'] },
    { slug: 'whatsapp-bot-slow', title: 'WhatsApp Bot Responding Slowly', keywords: ['whatsapp bot slow', 'bot slow response'] },
    { slug: 'whatsapp-sticker-not-working', title: 'WhatsApp Sticker Command Not Working', keywords: ['whatsapp sticker not working', 'fix sticker bot'] },
    { slug: 'whatsapp-ai-not-responding', title: 'WhatsApp AI Bot Not Responding', keywords: ['whatsapp ai not responding', 'fix ai bot'] },
    { slug: 'whatsapp-download-failed', title: 'WhatsApp Download Command Failed', keywords: ['whatsapp download failed', 'fix download bot'] },
    { slug: 'whatsapp-bot-403-error', title: 'WhatsApp Bot 403 Forbidden Error', keywords: ['whatsapp bot 403', 'fix 403 error'] },
    { slug: 'whatsapp-bot-401-error', title: 'WhatsApp Bot 401 Authentication Error', keywords: ['whatsapp bot 401', 'fix auth error'] },
    { slug: 'whatsapp-bot-428-error', title: 'WhatsApp Bot 428 Rate Limit Error', keywords: ['whatsapp bot 428', 'fix rate limit'] },
    { slug: 'whatsapp-bot-515-error', title: 'WhatsApp Bot 515 Restart Error', keywords: ['whatsapp bot 515', 'fix restart error'] },
    { slug: 'whatsapp-pairing-code-expired', title: 'WhatsApp Pairing Code Expired', keywords: ['whatsapp pairing code expired', 'fix pairing code'] },
    { slug: 'whatsapp-session-conflict', title: 'WhatsApp Session Conflict Error', keywords: ['whatsapp session conflict', 'fix session conflict'] },
    { slug: 'whatsapp-multi-device-issue', title: 'WhatsApp Multi-Device Bot Issue', keywords: ['whatsapp multi device issue', 'fix multi device bot'] },
    { slug: 'whatsapp-group-bot-not-admin', title: 'WhatsApp Bot Not Admin in Group', keywords: ['whatsapp bot not admin', 'bot admin permissions'] },
    { slug: 'whatsapp-media-not-sending', title: 'WhatsApp Bot Not Sending Media', keywords: ['whatsapp bot media failed', 'fix media sending'] },
    { slug: 'whatsapp-bot-duplicate-messages', title: 'WhatsApp Bot Sending Duplicate Messages', keywords: ['whatsapp bot duplicate', 'fix duplicate messages'] },
    { slug: 'whatsapp-bot-wrong-language', title: 'WhatsApp Bot Responding in Wrong Language', keywords: ['whatsapp bot wrong language', 'change bot language'] },
    { slug: 'telegram-bot-not-responding', title: 'Telegram Bot Not Responding', keywords: ['telegram bot not responding', 'fix telegram bot'] },
    { slug: 'telegram-bot-kicked', title: 'Telegram Bot Kicked from Group', keywords: ['telegram bot kicked', 'fix telegram bot kicked'] },
    { slug: 'telegram-bot-no-permissions', title: 'Telegram Bot Missing Permissions', keywords: ['telegram bot permissions', 'fix telegram bot admin'] },
    { slug: 'telegram-bot-flood-wait', title: 'Telegram Bot Flood Wait Error', keywords: ['telegram flood wait', 'fix telegram rate limit'] },
    { slug: 'telegram-userbot-session-expired', title: 'Telegram Userbot Session Expired', keywords: ['telegram userbot expired', 'fix userbot session'] },
    { slug: 'telegram-userbot-2fa-error', title: 'Telegram Userbot 2FA Error', keywords: ['telegram userbot 2fa', 'fix userbot authentication'] },
    { slug: 'telegram-userbot-disconnected', title: 'Telegram Userbot Keeps Disconnecting', keywords: ['telegram userbot disconnecting', 'fix userbot connection'] },
    { slug: 'bot-commands-not-working', title: 'Bot Commands Not Working', keywords: ['bot commands not working', 'fix bot commands'] },
    { slug: 'bot-dashboard-not-loading', title: 'BotWave Dashboard Not Loading', keywords: ['botwave dashboard not loading', 'fix dashboard'] },
    { slug: 'bot-session-needs-reauth', title: 'Bot Session Needs Re-authentication', keywords: ['bot needs reauth', 'fix bot authentication'] },
    { slug: 'whatsapp-bot-logged-out', title: 'WhatsApp Bot Logged Out Automatically', keywords: ['whatsapp bot logged out', 'fix auto logout'] },
    { slug: 'whatsapp-evolution-api-error', title: 'Evolution API Connection Error', keywords: ['evolution api error', 'fix evolution api'] },
  ];

  for (const topic of fixTopics) {
    if (existingSlugs.has(topic.slug)) continue;
    pages.push({
      slug: topic.slug,
      title: topic.title,
      description: `How to fix "${topic.title}". Step-by-step troubleshooting guide with solutions.`,
      seoTitle: `Fix: ${topic.title} - Troubleshooting Guide`,
      seoDescription: `Fix ${topic.title.toLowerCase()}. Step-by-step troubleshooting with solutions. Common causes and fixes.`,
      keywords: topic.keywords,
    });
  }

  return pages;
}

// ═══════════════════════════════════════════════════════════════════════
// FAQ PAGES GENERATOR
// ═══════════════════════════════════════════════════════════════════════

interface FaqPage {
  slug: string;
  question: string;
  answer: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  category: string;
}

function generateFaqPages(): FaqPage[] {
  const pages: FaqPage[] = [];
  const existingSlugs = new Set<string>();

  try {
    const existing = readFileSync(path.join(__dirname, '../lib/faq/data.ts'), 'utf-8');
    const slugMatches = existing.matchAll(/slug:\s*'([^']+)'/g);
    for (const m of slugMatches) existingSlugs.add(m[1]);
  } catch {}

  const faqTopics = [
    // General
    { slug: 'what-is-botwave', question: 'What is BotWave?', category: 'General', keywords: ['what is botwave', 'botwave bot'] },
    { slug: 'is-botwave-free', question: 'Is BotWave free to use?', category: 'General', keywords: ['is botwave free', 'botwave pricing'] },
    { slug: 'how-many-groups', question: 'How many groups can BotWave manage?', category: 'General', keywords: ['botwave group limit', 'how many groups'] },
    { slug: 'supported-platforms', question: 'Which platforms does BotWave support?', category: 'General', keywords: ['botwave platforms', 'whatsapp telegram bot'] },
    { slug: 'botwave-vs-other-bots', question: 'How is BotWave different from other bots?', category: 'General', keywords: ['botwave comparison', 'best bot platform'] },
    // WhatsApp
    { slug: 'can-whatsapp-ban-bots', question: 'Can WhatsApp ban my bot?', category: 'WhatsApp', keywords: ['whatsapp ban bot', 'is whatsapp bot safe'] },
    { slug: 'why-qr-disconnects', question: 'Why does my QR code keep disconnecting?', category: 'WhatsApp', keywords: ['whatsapp qr disconnect', 'qr code keeps expiring'] },
    { slug: 'is-botwave-safe', question: 'Is BotWave safe for my WhatsApp number?', category: 'WhatsApp', keywords: ['is botwave safe', 'botwave security'] },
    { slug: 'how-anti-ban-works', question: 'How does the anti-ban system work?', category: 'WhatsApp', keywords: ['anti ban system', 'how anti ban works'] },
    { slug: 'reconnect-session', question: 'How do I reconnect a disconnected session?', category: 'WhatsApp', keywords: ['reconnect session', 'fix disconnected bot'] },
    { slug: 'whatsapp-business-vs-regular', question: 'Does BotWave work with WhatsApp Business?', category: 'WhatsApp', keywords: ['whatsapp business bot', 'botwave business'] },
    { slug: 'multiple-whatsapp-numbers', question: 'Can I use multiple WhatsApp numbers?', category: 'WhatsApp', keywords: ['multiple whatsapp numbers', 'multi number bot'] },
    { slug: 'bot-reads-my-messages', question: 'Does the bot read my private messages?', category: 'Privacy', keywords: ['bot reads messages', 'botwave privacy'] },
    { slug: 'data-storage', question: 'Where is my data stored?', category: 'Privacy', keywords: ['botwave data storage', 'where data stored'] },
    { slug: 'delete-my-data', question: 'How do I delete my data from BotWave?', category: 'Privacy', keywords: ['delete botwave data', 'remove bot data'] },
    // Telegram
    { slug: 'telegram-bot-token', question: 'How do I get a Telegram bot token?', category: 'Telegram', keywords: ['telegram bot token', 'get telegram token'] },
    { slug: 'telegram-bot-vs-userbot', question: 'What is the difference between bot and userbot?', category: 'Telegram', keywords: ['telegram bot vs userbot', 'userbot difference'] },
    { slug: 'telegram-userbot-safe', question: 'Is using a Telegram userbot safe?', category: 'Telegram', keywords: ['telegram userbot safe', 'is userbot safe'] },
    { slug: 'telegram-bot-admin', question: 'Does my Telegram bot need admin rights?', category: 'Telegram', keywords: ['telegram bot admin', 'bot admin permissions'] },
    { slug: 'telegram-api-id', question: 'How do I get Telegram API ID and hash?', category: 'Telegram', keywords: ['telegram api id', 'telegram api hash'] },
    // Features
    { slug: 'what-commands-available', question: 'What commands are available?', category: 'Features', keywords: ['botwave commands', 'available commands'] },
    { slug: 'custom-commands', question: 'Can I create custom commands?', category: 'Features', keywords: ['custom commands', 'create custom command'] },
    { slug: 'ai-usage-limits', question: 'What are the AI usage limits?', category: 'Features', keywords: ['ai usage limit', 'botwave ai limit'] },
    { slug: 'media-download-limits', question: 'Are there download limits?', category: 'Features', keywords: ['download limit', 'media download limit'] },
    { slug: 'language-support', question: 'Which languages does BotWave support?', category: 'Features', keywords: ['botwave languages', 'supported languages'] },
    // Billing
    { slug: 'payment-methods', question: 'What payment methods are accepted?', category: 'Billing', keywords: ['botwave payment', 'payment methods'] },
    { slug: 'cancel-subscription', question: 'How do I cancel my subscription?', category: 'Billing', keywords: ['cancel botwave', 'cancel subscription'] },
    { slug: 'free-vs-premium', question: 'What is the difference between free and premium?', category: 'Billing', keywords: ['botwave free vs premium', 'premium features'] },
    { slug: 'refund-policy', question: 'What is the refund policy?', category: 'Billing', keywords: ['botwave refund', 'refund policy'] },
    // Technical
    { slug: 'api-access', question: 'Does BotWave have an API?', category: 'Technical', keywords: ['botwave api', 'bot api access'] },
    { slug: 'self-hosting', question: 'Can I self-host BotWave?', category: 'Technical', keywords: ['self host botwave', 'run botwave server'] },
    { slug: 'uptime-guarantee', question: 'What is the uptime guarantee?', category: 'Technical', keywords: ['botwave uptime', 'bot uptime guarantee'] },
    { slug: 'rate-limits', question: 'What are the rate limits?', category: 'Technical', keywords: ['botwave rate limits', 'message rate limit'] },
    { slug: 'webhook-support', question: 'Does BotWave support webhooks?', category: 'Technical', keywords: ['botwave webhooks', 'bot webhooks'] },
  ];

  for (const topic of faqTopics) {
    if (existingSlugs.has(topic.slug)) continue;
    pages.push({
      slug: topic.slug,
      question: topic.question,
      answer: `Comprehensive answer to: ${topic.question} Learn everything you need to know about this topic with BotWave.`,
      seoTitle: `${topic.question} - BotWave FAQ`,
      seoDescription: `${topic.question} Get the answer and learn more about BotWave features, pricing, and capabilities.`,
      keywords: topic.keywords,
      category: topic.category,
    });
  }

  return pages;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPARE PAGES GENERATOR
// ═══════════════════════════════════════════════════════════════════════

interface ComparePage {
  slug: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  competitor: string;
  verdict: string;
}

function generateComparePages(): ComparePage[] {
  const pages: ComparePage[] = [];
  const existingSlugs = new Set<string>();

  try {
    const existing = readFileSync(path.join(__dirname, '../lib/compare/data.ts'), 'utf-8');
    const slugMatches = existing.matchAll(/slug:\s*'([^']+)'/g);
    for (const m of slugMatches) existingSlugs.add(m[1]);
  } catch {}

  const compareTopics = [
    { slug: 'botwave-vs-whatsapp-business-api', competitor: 'WhatsApp Business API', keywords: ['botwave vs whatsapp business api', 'whatsapp api alternative'] },
    { slug: 'botwave-vs-twilio', competitor: 'Twilio', keywords: ['botwave vs twilio', 'twilio whatsapp alternative'] },
    { slug: 'botwave-vs-messagebird', competitor: 'MessageBird', keywords: ['botwave vs messagebird', 'messagebird alternative'] },
    { slug: 'botwave-vs-wati', competitor: 'WATI', keywords: ['botwave vs wati', 'wati alternative'] },
    { slug: 'botwave-vs-chatapi', competitor: 'ChatAPI', keywords: ['botwave vs chatapi', 'chatapi alternative'] },
    { slug: 'botwave-vs-venom-bot', competitor: 'Venom Bot', keywords: ['botwave vs venom bot', 'venom bot alternative'] },
    { slug: 'botwave-vs-whapi', competitor: 'Whapi', keywords: ['botwave vs whapi', 'whapi alternative'] },
    { slug: 'botwave-vs-ultramsg', competitor: 'UltraMsg', keywords: ['botwave vs ultramsg', 'ultramsg alternative'] },
    { slug: 'botwave-vs-callmebot', competitor: 'CallMeBot', keywords: ['botwave vs callmebot', 'callmebot alternative'] },
    { slug: 'botwave-vs-greenapi', competitor: 'GreenAPI', keywords: ['botwave vs greenapi', 'greenapi alternative'] },
    { slug: 'botwave-vs-maytapi', competitor: 'Maytapi', keywords: ['botwave vs maytapi', 'maytapi alternative'] },
    { slug: 'botwave-vs-chatbot', competitor: 'ChatBot.com', keywords: ['botwave vs chatbot', 'chatbot alternative'] },
    { slug: 'botwave-vs-manychat', competitor: 'ManyChat', keywords: ['botwave vs manychat', 'manychat alternative'] },
    { slug: 'botwave-vs-chatfuel', competitor: 'Chatfuel', keywords: ['botwave vs chatfuel', 'chatfuel alternative'] },
    { slug: 'botwave-vs-botpress', competitor: 'Botpress', keywords: ['botwave vs botpress', 'botpress alternative'] },
    { slug: 'botwave-vs-dialogflow', competitor: 'Dialogflow', keywords: ['botwave vs dialogflow', 'dialogflow alternative'] },
    { slug: 'botwave-vs-rasa', competitor: 'Rasa', keywords: ['botwave vs rasa', 'rasa alternative'] },
    { slug: 'botwave-vs-manybot', competitor: 'Manybot', keywords: ['botwave vs manybot', 'manybot alternative'] },
    { slug: 'botwave-vs-combot', competitor: 'Combot', keywords: ['botwave vs combot', 'combot alternative'] },
    { slug: 'botwave-vs-shieldy', competitor: 'Shieldy', keywords: ['botwave vs shieldy', 'shieldy alternative'] },
    { slug: 'botwave-vs-groupbutler', competitor: 'Group Butler', keywords: ['botwave vs group butler', 'group butler alternative'] },
    { slug: 'botwave-vs-rose-bot', competitor: 'Rose Bot', keywords: ['botwave vs rose bot', 'rose bot alternative'] },
    { slug: 'best-whatsapp-bots-2026', competitor: 'All WhatsApp Bots', keywords: ['best whatsapp bots 2026', 'whatsapp bot ranking'] },
    { slug: 'best-telegram-bots-2026', competitor: 'All Telegram Bots', keywords: ['best telegram bots 2026', 'telegram bot ranking'] },
    { slug: 'best-free-bots-2026', competitor: 'Free Bot Tools', keywords: ['best free bots 2026', 'free bot comparison'] },
    { slug: 'best-group-management-bots', competitor: 'Group Management Tools', keywords: ['best group management bots', 'group bot ranking'] },
    { slug: 'best-ai-chatbots-2026', competitor: 'AI Chatbots', keywords: ['best ai chatbots 2026', 'ai chatbot comparison'] },
    { slug: 'best-moderation-bots', competitor: 'Moderation Bots', keywords: ['best moderation bots', 'moderation bot comparison'] },
    { slug: 'best-anti-spam-bots', competitor: 'Anti-Spam Bots', keywords: ['best anti spam bots', 'anti spam bot comparison'] },
    { slug: 'whatsapp-automation-tools-ranked', competitor: 'WhatsApp Automation', keywords: ['whatsapp automation tools ranked', 'best whatsapp automation'] },
    { slug: 'telegram-automation-tools-ranked', competitor: 'Telegram Automation', keywords: ['telegram automation tools ranked', 'best telegram automation'] },
  ];

  for (const topic of compareTopics) {
    if (existingSlugs.has(topic.slug)) continue;
    pages.push({
      slug: topic.slug,
      title: `BotWave vs ${topic.competitor}`,
      description: `Detailed comparison between BotWave and ${topic.competitor}. Features, pricing, ease of use, and which is better for your needs.`,
      seoTitle: `BotWave vs ${topic.competitor} - Comparison (2026)`,
      seoDescription: `Compare BotWave and ${topic.competitor}. Features, pricing, pros and cons. Which is the best choice for you?`,
      keywords: topic.keywords,
      competitor: topic.competitor,
      verdict: `BotWave offers more features with easier setup compared to ${topic.competitor}, especially for African communities.`,
    });
  }

  return pages;
}

// ═══════════════════════════════════════════════════════════════════════
// USE CASE PAGES GENERATOR
// ═══════════════════════════════════════════════════════════════════════

interface UseCasePage {
  slug: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  audience: string;
  benefits: string[];
}

function generateUseCasePages(): UseCasePage[] {
  const pages: UseCasePage[] = [];
  const existingSlugs = new Set<string>();

  try {
    const existing = readFileSync(path.join(__dirname, '../lib/usecases/data.ts'), 'utf-8');
    const slugMatches = existing.matchAll(/slug:\s*'([^']+)'/g);
    for (const m of slugMatches) existingSlugs.add(m[1]);
  } catch {}

  const useCaseTopics = [
    { slug: 'whatsapp-bot-for-school-groups', audience: 'Schools', benefits: ['Spam control', 'Assignment reminders', 'Study quizzes'], keywords: ['whatsapp bot school', 'school group bot'] },
    { slug: 'whatsapp-bot-for-church-groups', audience: 'Churches', benefits: ['Event reminders', 'Prayer requests', 'Community engagement'], keywords: ['whatsapp bot church', 'church group bot'] },
    { slug: 'whatsapp-bot-for-mosque-groups', audience: 'Mosques', benefits: ['Prayer times', 'Community announcements', 'Event scheduling'], keywords: ['whatsapp bot mosque', 'mosque group bot'] },
    { slug: 'whatsapp-bot-for-online-stores', audience: 'Online Stores', benefits: ['Order notifications', 'Customer support', 'Product catalogs'], keywords: ['whatsapp bot online store', 'ecommerce bot'] },
    { slug: 'whatsapp-bot-for-real-estate', audience: 'Real Estate', benefits: ['Property listings', 'Appointment booking', 'Lead capture'], keywords: ['whatsapp bot real estate', 'real estate automation'] },
    { slug: 'whatsapp-bot-for-restaurants', audience: 'Restaurants', benefits: ['Menu sharing', 'Order taking', 'Reservation management'], keywords: ['whatsapp bot restaurant', 'restaurant automation'] },
    { slug: 'whatsapp-bot-for-healthcare', audience: 'Healthcare', benefits: ['Appointment reminders', 'Health tips', 'Patient engagement'], keywords: ['whatsapp bot healthcare', 'clinic automation'] },
    { slug: 'whatsapp-bot-for-fitness', audience: 'Fitness Trainers', benefits: ['Workout schedules', 'Client engagement', 'Progress tracking'], keywords: ['whatsapp bot fitness', 'fitness trainer bot'] },
    { slug: 'whatsapp-bot-for-gaming', audience: 'Gaming Communities', benefits: ['Tournament management', 'Team coordination', 'Game stats'], keywords: ['whatsapp bot gaming', 'gaming group bot'] },
    { slug: 'whatsapp-bot-for-crypto', audience: 'Crypto Communities', benefits: ['Price alerts', 'Market updates', 'Community moderation'], keywords: ['whatsapp bot crypto', 'crypto group bot'] },
    { slug: 'telegram-bot-for-school-groups', audience: 'Schools (Telegram)', benefits: ['Class management', 'Study materials', 'Exam reminders'], keywords: ['telegram bot school', 'school telegram bot'] },
    { slug: 'telegram-bot-for-business', audience: 'Businesses (Telegram)', benefits: ['Customer support', 'Order management', 'Lead generation'], keywords: ['telegram bot business', 'business telegram bot'] },
    { slug: 'telegram-bot-for-communities', audience: 'Communities (Telegram)', benefits: ['Moderation', 'Engagement', 'Content sharing'], keywords: ['telegram bot community', 'community telegram bot'] },
    { slug: 'telegram-bot-for-creators', audience: 'Content Creators', benefits: ['Fan engagement', 'Content distribution', 'Monetization'], keywords: ['telegram bot creators', 'creator telegram bot'] },
    { slug: 'telegram-bot-for-education', audience: 'Education', benefits: ['Course delivery', 'Quiz management', 'Student tracking'], keywords: ['telegram bot education', 'education telegram bot'] },
    { slug: 'bot-for-customer-support', audience: 'Customer Support Teams', benefits: ['24/7 availability', 'FAQ automation', 'Ticket creation'], keywords: ['bot customer support', 'support bot'] },
    { slug: 'bot-for-hr-teams', audience: 'HR Teams', benefits: ['Employee onboarding', 'Leave management', 'Policy distribution'], keywords: ['bot hr team', 'hr automation bot'] },
    { slug: 'bot-for-event-management', audience: 'Event Managers', benefits: ['RSVP tracking', 'Event updates', 'Attendee management'], keywords: ['bot event management', 'event bot'] },
    { slug: 'bot-for-political-campaigns', audience: 'Political Campaigns', benefits: ['Voter outreach', 'Campaign updates', 'Volunteer coordination'], keywords: ['bot political campaign', 'campaign bot'] },
    { slug: 'bot-for-delivery-services', audience: 'Delivery Services', benefits: ['Order tracking', 'Driver coordination', 'Customer updates'], keywords: ['bot delivery service', 'delivery bot'] },
  ];

  for (const topic of useCaseTopics) {
    if (existingSlugs.has(topic.slug)) continue;
    pages.push({
      slug: topic.slug,
      title: `BotWave for ${topic.audience}`,
      description: `How ${topic.audience.toLowerCase()} use BotWave for automation. ${topic.benefits.join(', ')}.`,
      seoTitle: `BotWave for ${topic.audience} - Automation Platform`,
      seoDescription: `BotWave automation for ${topic.audience.toLowerCase()}. ${topic.benefits.join(', ')}. Free to start.`,
      keywords: topic.keywords,
      audience: topic.audience,
      benefits: topic.benefits,
    });
  }

  return pages;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN - Count and report
// ═══════════════════════════════════════════════════════════════════════

const landingPages = generateLandingPages();
const howToPages = generateHowToPages();
const fixPages = generateFixPages();
const faqPages = generateFaqPages();
const comparePages = generateComparePages();
const useCasePages = generateUseCasePages();

console.log('=== SEO Page Generation Report ===');
console.log(`Landing pages (new): ${landingPages.length}`);
console.log(`How-to pages (new): ${howToPages.length}`);
console.log(`Fix pages (new): ${fixPages.length}`);
console.log(`FAQ pages (new): ${faqPages.length}`);
console.log(`Compare pages (new): ${comparePages.length}`);
console.log(`Use case pages (new): ${useCasePages.length}`);
console.log(`TOTAL NEW: ${landingPages.length + howToPages.length + fixPages.length + faqPages.length + comparePages.length + useCasePages.length}`);

// Write the data to output files for import
function toLine(obj: Record<string, any>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      parts.push(`${key}: '${value.replace(/'/g, "\\'")}'`);
    } else if (Array.isArray(value)) {
      parts.push(`${key}: [${value.map(v => `'${String(v).replace(/'/g, "\\'")}'`).join(', ')}]`);
    }
  }
  return `  { ${parts.join(', ')} },`;
}

// Write landing pages
const landingOutput = landingPages.map(p => toLine(p)).join('\n');
writeFileSync('/tmp/seo-landing-new.ts', landingOutput);

// Write how-to pages
const howtoOutput = howToPages.map(p => toLine(p)).join('\n');
writeFileSync('/tmp/seo-howto-new.ts', howtoOutput);

// Write fix pages
const fixOutput = fixPages.map(p => toLine(p)).join('\n');
writeFileSync('/tmp/seo-fix-new.ts', fixOutput);

// Write FAQ pages
const faqOutput = faqPages.map(p => toLine(p)).join('\n');
writeFileSync('/tmp/seo-faq-new.ts', faqOutput);

// Write compare pages
const compareOutput = comparePages.map(p => toLine(p)).join('\n');
writeFileSync('/tmp/seo-compare-new.ts', compareOutput);

// Write use case pages
const usecaseOutput = useCasePages.map(p => toLine(p)).join('\n');
writeFileSync('/tmp/seo-usecase-new.ts', usecaseOutput);

console.log('\nData files written to /tmp/seo-*.ts');
