/**
 * Single source of truth for "every public URL we ever want crawlers
 * (and IndexNow) to see".
 *
 * Co-located with the IndexNow helper so the same URL list feeds:
 *   - `/api/indexnow/submit-all` (cron endpoint that POSTs to IndexNow)
 *   - `scripts/indexnow-bulk-submit.mjs` (one-shot submit)
 *   - any future "ping Bing manually" / "warm up Cloudflare cache" job
 *
 * Why this lives outside `app/sitemap.ts`:
 *   `app/sitemap.ts` returns the `MetadataRoute.Sitemap` shape (with
 *   lastModified / priority etc) chunked across 5+ files because
 *   sitemap protocol caps at 50,000 URLs / 50MB per chunk. IndexNow
 *   only cares about the bare URL list, and the cron endpoint and CLI
 *   script both want one flat array — not a chunked structure. So we
 *   define the URLs here once and import them from both places.
 */

import { telegramCommands, userbotCommands } from '@/lib/commands/data';
import { docPages } from '@/lib/docs/data';
import { faqItems } from '@/lib/faq/data';
import { useCases } from '@/lib/usecases/data';
import { fixPages } from '@/lib/fix/data';
import { howToPages } from '@/lib/howto/data';
import { comparePages as compareData } from '@/lib/compare/data';
import { mailboxPages } from '@/lib/mailbox/data';
import { landingPages } from '@/lib/landing/data';
import { searchEngines } from '@/lib/search-engines/data';

const BASE_URL = 'https://www.botwave.online';

/** Static "evergreen" pages — homepage, signup, features, legal, etc. */
export const CORE_PATHS: string[] = [
  '/',
  '/signup',
  '/login',
  '/features',
  '/features/ai',
  '/features/moderation',
  '/features/media',
  '/telegram-bot',
  '/telegram-bot',
  '/telegram-group-analytics',
  '/status',
  '/changelog',
  '/templates',
  '/integrations',
  '/academy',
  '/case-studies',
  '/security',
  '/privacy',
  '/terms',
  '/pricing',
  '/community-commands',
  '/community',
  '/guest-posts',
  '/about',
  '/what-is-botwave',
  '/faq',
  '/blog',
  '/docs',
  '/how-to',
  '/fix',
  '/compare',
  '/use-cases',
  '/mailbox',
  '/commands',
  '/commands/telegram',
  '/commands/telegram',
  '/commands/userbot',
  '/search-engines',
  '/llms.txt',
  '/llms-full.txt',
];

/** Static long-form blog posts (slug only — keeps the list copy-pasteable). */
export const BLOG_SLUGS: string[] = [
  'how-to-create-free-telegram-bot-2026',
  'best-free-telegram-bot-groups-nigeria',
  'telegram-bot-vs-messenger-bot-africa',
  'telegram-bot-for-business-nigeria',
  'free-telegram-group-management-bot',
  'how-to-automate-telegram-messages-free',
  'best-free-bot-platforms-2026',
  'free-telegram-sticker-bot-how-to-make-stickers',
  'telegram-bot-commands-list-2026',
  'telegram-anti-spam-bot-for-groups',
  'telegram-ai-chatbot-free',
  'telegram-bot-for-schools-campus-groups',
  'telegram-bot-south-africa',
  'telegram-bot-for-groups-nigeria',
  'telegram-userbot-automation',
  'free-telegram-group-management-bot',
  'telegram-bot-vs-discord-bot',
  'telegram-anti-spam-bot',
];

/** Public pricing pages (anchor-friendly per-tier slugs). */
export const PRICING_TIER_SLUGS: string[] = ['free', 'lite', 'standard', 'boss'];

function abs(path: string): string {
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Return every public URL on the site — used by IndexNow submitters and
 * any other "ping all engines" job.
 *
 * Counts as of 2026-05-22:
 *   - core pages: ~40
 *   - blog posts: 18
 *   - pricing tiers: 4 (anchored)
 *   - search-engine deep pages: ~14
 *   - commands: ~150 (wa + tg + userbot)
 *   - docs/faq/use-cases/compare/fix/how-to/mailbox: ~250
 *   - landing pages: 20,000+
 *
 * Output is de-duplicated and stable-sorted.
 */
export function getAllPublicUrls(): string[] {
  const urls = new Set<string>();

  // Core, static pages.
  for (const p of CORE_PATHS) urls.add(abs(p));

  // Blog index + individual posts.
  for (const slug of BLOG_SLUGS) urls.add(abs(`/blog/${slug}`));

  // Pricing landing pages (one per tier, hash-free so each is its own
  // discoverable URL).
  for (const tier of PRICING_TIER_SLUGS) {
    urls.add(abs(`/pricing/${tier}`));
  }

  // Per-engine pages.
  for (const engine of searchEngines) {
    urls.add(abs(`/search-engines/${engine.slug}`));
  }

  // Commands (Telegram / Userbot).
  for (const cmd of telegramCommands) urls.add(abs(`/commands/telegram/${cmd.slug}`));
  for (const cmd of userbotCommands) urls.add(abs(`/commands/userbot/${cmd.slug}`));

  // Long-tail content categories — every slug counts as its own URL.
  for (const doc of docPages) urls.add(abs(`/docs/${doc.slug}`));
  for (const f of faqItems) urls.add(abs(`/faq/${f.slug}`));
  for (const uc of useCases) urls.add(abs(`/use-cases/${uc.slug}`));
  for (const c of compareData) urls.add(abs(`/compare/${c.slug}`));
  for (const fx of fixPages) urls.add(abs(`/fix/${fx.slug}`));
  for (const ht of howToPages) urls.add(abs(`/how-to/${ht.slug}`));
  for (const mb of mailboxPages) urls.add(abs(`/mailbox/${mb.slug}`));

  // Programmatic landing pages (the big 20k+ catalog).
  for (const lp of landingPages) urls.add(abs(`/${lp.slug}`));

  // Stable sort for repeatable batches (IndexNow caps at 10k/batch so we
  // ship in deterministic chunks).
  return Array.from(urls).sort();
}

/**
 * Slice the master URL list into batches of at most `batchSize` URLs each.
 * IndexNow's limit is 10,000 URLs per request, but smaller batches are
 * safer in practice (faster retry on partial failures, easier to log).
 */
export function chunkUrls(urls: string[], batchSize = 500): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    out.push(urls.slice(i, i + batchSize));
  }
  return out;
}
