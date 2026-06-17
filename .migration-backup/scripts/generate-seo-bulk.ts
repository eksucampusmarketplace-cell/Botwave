/**
 * Bulk SEO Page Generator - generates cross-product pages for massive scale.
 * Outputs append-ready data for landing/data.ts
 */
import { writeFileSync, readFileSync } from 'fs';
import path from 'path';

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

const features = [
  'anti-spam', 'moderation', 'ai-replies', 'sticker-maker', 'media-download',
  'auto-reply', 'welcome-messages', 'polls', 'trivia-games', 'word-games',
  'translation', 'weather', 'dictionary', 'reminders', 'scheduled-messages',
  'analytics', 'group-management', 'admin-tools', 'custom-commands', 'auto-responses',
  'keyword-triggers', 'link-detection', 'nsfw-filter', 'word-filter', 'flood-control',
  'member-tracking', 'activity-reports', 'leaderboards', 'xp-system', 'music-bot',
  'voice-notes', 'text-to-speech', 'qr-code-generator', 'url-shortener', 'calculator',
  'meme-generator', 'image-editor', 'background-remover', 'pdf-tools', 'event-scheduler',
  'task-manager', 'todo-lists', 'notes', 'contact-manager', 'crm-tools',
  'lead-generation', 'payment-integration', 'appointment-booking', 'broadcast-messages',
  'feedback-collector', 'survey-creator', 'knowledge-base', 'faq-bot', 'support-tickets',
  'multi-language', 'auto-translate', 'file-sharing', 'backup-system', 'captcha',
  'anti-raid', 'lockdown-mode', 'role-management', 'permission-system', 'audit-log',
];

const audiences = [
  'schools', 'churches', 'mosques', 'creators', 'influencers', 'businesses',
  'ecommerce', 'real-estate', 'restaurants', 'hotels', 'clinics', 'pharmacies',
  'freelancers', 'startups', 'nonprofits', 'ngos', 'sports-teams',
  'gaming-communities', 'crypto-communities', 'book-clubs', 'study-groups',
  'alumni-associations', 'support-groups', 'travel-groups', 'investment-clubs',
  'wedding-planning', 'event-planners', 'online-vendors', 'customer-support',
  'university-clubs', 'coaching-businesses', 'tutoring-services', 'delivery-services',
  'insurance-agents', 'fitness-trainers', 'beauty-salons', 'barbershops',
];

function titleCase(s: string): string {
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Read existing slugs
const existingSlugs = new Set<string>();
try {
  const existing = readFileSync(path.join(__dirname, '../lib/landing/data.ts'), 'utf-8');
  const slugMatches = existing.matchAll(/slug:\s*'([^']+)'/g);
  for (const m of slugMatches) existingSlugs.add(m[1]);
} catch {}

interface LP { slug: string; title: string; heading: string; description: string; seoTitle: string; seoDescription: string; keywords: string[]; category: string; }

const pages: LP[] = [];

// 1. Feature x Country for WhatsApp (60 features x 110 countries = 6600)
for (const feature of features) {
  const fName = titleCase(feature);
  for (const country of countries) {
    const cName = titleCase(country);
    const slug = `whatsapp-${feature}-${country}`;
    if (existingSlugs.has(slug)) continue;
    pages.push({
      slug, title: `WhatsApp ${fName} ${cName}`, heading: `WhatsApp ${fName} Bot for ${cName}`,
      description: `Free WhatsApp ${fName.toLowerCase()} bot for ${cName}. Automated ${fName.toLowerCase()} for groups and businesses.`,
      seoTitle: `WhatsApp ${fName} Bot ${cName} (2026)`,
      seoDescription: `Free WhatsApp ${fName.toLowerCase()} for ${cName}. Automation for groups and communities.`,
      keywords: [`whatsapp ${feature} ${country}`, `${feature} bot ${country}`, `whatsapp ${country}`],
      category: 'feature',
    });
  }
}

// 2. Feature x Country for Telegram (30 features x 40 countries = 1200)
const tgFeatures = features.slice(0, 30);
const tgCountries = countries.slice(0, 40);
for (const feature of tgFeatures) {
  const fName = titleCase(feature);
  for (const country of tgCountries) {
    const cName = titleCase(country);
    const slug = `telegram-${feature}-${country}`;
    if (existingSlugs.has(slug)) continue;
    pages.push({
      slug, title: `Telegram ${fName} ${cName}`, heading: `Telegram ${fName} Bot for ${cName}`,
      description: `Free Telegram ${fName.toLowerCase()} bot for ${cName}. Automated ${fName.toLowerCase()} for groups.`,
      seoTitle: `Telegram ${fName} Bot ${cName} (2026)`,
      seoDescription: `Telegram ${fName.toLowerCase()} for ${cName}. Free group automation.`,
      keywords: [`telegram ${feature} ${country}`, `telegram bot ${country}`],
      category: 'feature',
    });
  }
}

// 3. Audience x Country for WhatsApp (37 audiences x 30 countries = 1110)
const topCountries = countries.slice(0, 30);
for (const audience of audiences) {
  const aName = titleCase(audience);
  for (const country of topCountries) {
    const cName = titleCase(country);
    const slug = `whatsapp-for-${audience}-${country}`;
    if (existingSlugs.has(slug)) continue;
    pages.push({
      slug, title: `WhatsApp Bot for ${aName} in ${cName}`, heading: `WhatsApp Automation for ${aName} in ${cName}`,
      description: `WhatsApp bot for ${aName.toLowerCase()} in ${cName}. Automated management and AI features.`,
      seoTitle: `WhatsApp Bot for ${aName} in ${cName} (2026)`,
      seoDescription: `WhatsApp automation for ${aName.toLowerCase()} in ${cName}. Free bot with AI, moderation, engagement.`,
      keywords: [`whatsapp bot ${audience} ${country}`, `${audience} whatsapp bot ${country}`],
      category: 'audience',
    });
  }
}

console.log(`Generated ${pages.length} bulk landing pages`);

// Write as append-ready format
const lines = pages.map(p => {
  const esc = (s: string) => s.replace(/'/g, "\\'");
  return `  { slug: '${esc(p.slug)}', title: '${esc(p.title)}', heading: '${esc(p.heading)}', description: '${esc(p.description)}', seoTitle: '${esc(p.seoTitle)}', seoDescription: '${esc(p.seoDescription)}', keywords: [${p.keywords.map(k => `'${esc(k)}'`).join(', ')}], category: '${p.category}' as const },`;
});

writeFileSync('/tmp/seo-bulk-landing.ts', lines.join('\n'));
console.log('Written to /tmp/seo-bulk-landing.ts');
