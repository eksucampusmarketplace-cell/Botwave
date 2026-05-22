// Shared sitemap-chunk data layer.
//
// History: this logic used to live inside the Next.js `app/sitemap.ts`
// metadata route, which (with `generateSitemaps`) produced URLs at
// `/sitemap/<id>.xml`. That approach worked but had two pain points:
//   1. Next 14's metadata sitemap route ignores custom Cache-Control set in
//      `next.config.js#headers()` — responses came back as
//      `max-age=0, must-revalidate`, so the edge (Caddy) revalidated every
//      single GSC fetch and slower middle-range chunks (e.g. /sitemap/11.xml,
//      /sitemap/12.xml) occasionally hit GSC's per-URL fetch timeout and got
//      parked in "Couldn't fetch" state.
//   2. `force-static` mode silently skipped chunks under build memory
//      pressure, so some chunk files simply did not exist on disk.
//
// Moving the data into this module lets a plain route handler at
// `app/sitemap/[id]/route.ts` own the response with full control over the
// Cache-Control header (24h s-maxage + 7d stale-while-revalidate) — solving
// both problems above without touching the URL structure or chunk ordering
// GSC already trusts.
import type { MetadataRoute } from 'next';

import { whatsappCommands, telegramCommands, userbotCommands } from '@/lib/commands/data';
import { docPages } from '@/lib/docs/data';
import { faqItems } from '@/lib/faq/data';
import { useCases } from '@/lib/usecases/data';
import { fixPages } from '@/lib/fix/data';
import { howToPages } from '@/lib/howto/data';
import { comparePages as compareData } from '@/lib/compare/data';
import { mailboxPages } from '@/lib/mailbox/data';
import { landingPages } from '@/lib/landing/data';
import { searchEngines } from '@/lib/search-engines/data';
import { PRICING_TIERS } from '@/lib/pricing/tiers';
import { LANDING_CHUNK_SIZE, LANDING_CHUNK_ID_START } from '@/lib/sitemap-config';

export type SitemapEntry = MetadataRoute.Sitemap[number];

// Module-load timestamp doubles as <lastmod> for pages that change with each
// deploy. Re-derived on every cold start, then cached by revalidate / edge.
const BUILD_DATE = new Date();

const BASE_URL = 'https://www.botwave.online';

export function getChunkUrls(id: number): SitemapEntry[] {
  // Per-chunk try/catch so one failing dataset can never take down a whole
  // chunk URL. Returning an empty <urlset> on render error lets GSC retry
  // on the next crawl instead of permanently parking the chunk in
  // "Couldn't fetch" state — empty is interpreted as "no URLs right now",
  // not as a server error.
  try {
    if (id === 0) return corePages(BASE_URL);
    if (id === 1) return commandPages(BASE_URL);
    if (id === 2) return contentPages(BASE_URL);
    if (id === 3) return blogPages(BASE_URL);
    if (id >= LANDING_CHUNK_ID_START) {
      return landingChunk(BASE_URL, id - LANDING_CHUNK_ID_START);
    }
  } catch (err) {
    console.error(`[sitemap] chunk ${id} render failed:`, err);
    return [];
  }
  return [];
}

function corePages(baseUrl: string): SitemapEntry[] {
  return [
    { url: baseUrl, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/signup`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/features`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/features/ai`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/features/moderation`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/features/media`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/whatsapp-bot`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/telegram-bot`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/telegram-group-analytics`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/status`, lastModified: BUILD_DATE, changeFrequency: 'daily', priority: 0.5 },
    { url: `${baseUrl}/changelog`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/templates`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/integrations`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/academy`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/case-studies`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/security`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/pricing`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.9 },
    ...PRICING_TIERS.map((tier) => ({
      url: `${baseUrl}/pricing/${tier.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${baseUrl}/community-commands`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/community`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/guest-posts`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/about`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/what-is-botwave`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/search-engines`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.6 },
    ...searchEngines.map((engine) => ({
      url: `${baseUrl}/search-engines/${engine.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.55,
    })),
  ];
}

function commandPages(baseUrl: string): SitemapEntry[] {
  return [
    { url: `${baseUrl}/commands`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/commands/whatsapp`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/commands/telegram`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/commands/userbot`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.7 },
    ...whatsappCommands.map((cmd) => ({
      url: `${baseUrl}/commands/whatsapp/${cmd.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...telegramCommands.map((cmd) => ({
      url: `${baseUrl}/commands/telegram/${cmd.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...userbotCommands.map((cmd) => ({
      url: `${baseUrl}/commands/userbot/${cmd.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}

function contentPages(baseUrl: string): SitemapEntry[] {
  return [
    { url: `${baseUrl}/docs`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.9 },
    ...docPages.map((doc) => ({
      url: `${baseUrl}/docs/${doc.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${baseUrl}/faq`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.7 },
    ...faqItems.map((faq) => ({
      url: `${baseUrl}/faq/${faq.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    { url: `${baseUrl}/use-cases`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.8 },
    ...useCases.map((uc) => ({
      url: `${baseUrl}/use-cases/${uc.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${baseUrl}/compare`, lastModified: BUILD_DATE, changeFrequency: 'monthly', priority: 0.7 },
    ...compareData.map((page) => ({
      url: `${baseUrl}/compare/${page.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${baseUrl}/fix`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.7 },
    ...fixPages.map((page) => ({
      url: `${baseUrl}/fix/${page.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${baseUrl}/how-to`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.8 },
    ...howToPages.map((page) => ({
      url: `${baseUrl}/how-to/${page.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${baseUrl}/mailbox`, lastModified: BUILD_DATE, changeFrequency: 'weekly', priority: 0.8 },
    ...mailboxPages.map((page) => ({
      url: `${baseUrl}/mailbox/${page.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}

function blogPages(baseUrl: string): SitemapEntry[] {
  return [
    { url: `${baseUrl}/blog`, lastModified: new Date('2026-05-18'), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/blog/how-to-create-free-whatsapp-bot-2026`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/blog/best-free-whatsapp-bot-groups-nigeria`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/whatsapp-bot-vs-telegram-bot-africa`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/whatsapp-bot-for-business-nigeria`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/free-whatsapp-group-management-bot`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/how-to-automate-whatsapp-messages-free`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/best-free-bot-platforms-2026`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/free-whatsapp-sticker-bot-how-to-make-stickers`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/whatsapp-bot-commands-list-2026`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/whatsapp-anti-spam-bot-for-groups`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/whatsapp-ai-chatbot-free`, lastModified: new Date('2026-05-10'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/whatsapp-bot-for-schools-campus-groups`, lastModified: new Date('2026-05-13'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/whatsapp-bot-south-africa`, lastModified: new Date('2026-05-13'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/telegram-bot-for-groups-nigeria`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog/telegram-userbot-automation`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/free-telegram-group-management-bot`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/telegram-bot-vs-whatsapp-bot`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog/telegram-anti-spam-bot`, lastModified: new Date('2026-05-18'), changeFrequency: 'monthly', priority: 0.7 },
  ];
}

function landingChunk(baseUrl: string, chunkIndex: number): SitemapEntry[] {
  const start = chunkIndex * LANDING_CHUNK_SIZE;
  const end = Math.min(start + LANDING_CHUNK_SIZE, landingPages.length);
  const chunk = landingPages.slice(start, end);

  return chunk.map((page) => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: 'monthly' as const,
    priority: page.category === 'country' ? 0.6 : 0.5,
  }));
}

// Serialize entries to the XML urlset format that GSC expects. Matches the
// shape Next.js's metadata sitemap renderer produces so this is a drop-in
// replacement that GSC won't notice.
export function renderSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const loc = escapeXml(typeof entry.url === 'string' ? entry.url : '');
      const lastmod = entry.lastModified
        ? toIso(entry.lastModified)
        : undefined;
      const parts = [`    <loc>${loc}</loc>`];
      if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
      if (entry.changeFrequency) parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
      if (typeof entry.priority === 'number') {
        parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      }
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function toIso(value: Date | string | number): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
