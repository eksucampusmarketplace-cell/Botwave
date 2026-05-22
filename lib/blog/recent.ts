/**
 * Hand-curated list of the latest blog posts.
 *
 * Used by <LatestPostsCompact /> on landing and marketing pages so the
 * rendered HTML on every page legitimately changes whenever a new post
 * is published. That makes the sitemap `<lastmod>` signal honest:
 * when this file changes and a new deploy ships, search engines see a
 * real HTML diff on every landing page (a new "Latest" card appears),
 * not just an advanced timestamp.
 *
 * Keep the list short (4-6 entries) and ordered newest-first. When a
 * new post lands, prepend it here and drop the oldest entry. This is
 * the only place to update; the component will pick up the new list
 * on next deploy.
 */
export interface RecentPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date string (UTC, day precision is fine).
  readMinutes: number;
}

export const recentBlogPosts: RecentPost[] = [
  {
    slug: 'telegram-bot-for-groups-nigeria',
    title: 'Telegram Bot for Groups in Nigeria',
    description: 'Free Telegram group bot built for Nigerian communities. Anti-spam, polls, games, AI replies.',
    publishedAt: '2026-05-18',
    readMinutes: 7,
  },
  {
    slug: 'telegram-userbot-automation',
    title: 'Telegram Userbot Automation',
    description: 'Run your own personal Telegram userbot. 200+ commands, auto-reply, AFK mode, anti-spam.',
    publishedAt: '2026-05-18',
    readMinutes: 9,
  },
  {
    slug: 'free-telegram-group-management-bot',
    title: 'Free Telegram Group Management Bot',
    description: 'Manage Telegram groups without paying for premium tools. Welcome messages, mod commands, analytics.',
    publishedAt: '2026-05-18',
    readMinutes: 6,
  },
  {
    slug: 'telegram-bot-vs-whatsapp-bot',
    title: 'Telegram Bot vs WhatsApp Bot',
    description: 'Side-by-side comparison: which bot platform fits your community better in 2026.',
    publishedAt: '2026-05-18',
    readMinutes: 8,
  },
  {
    slug: 'whatsapp-bot-for-schools-campus-groups',
    title: 'WhatsApp Bot for Schools and Campus Groups',
    description: 'How student leaders use BotWave to keep 500+ member campus groups running cleanly.',
    publishedAt: '2026-05-13',
    readMinutes: 6,
  },
  {
    slug: 'whatsapp-bot-south-africa',
    title: 'WhatsApp Bot for South Africa',
    description: 'Free WhatsApp group automation tuned for South African communities and businesses.',
    publishedAt: '2026-05-13',
    readMinutes: 5,
  },
];
