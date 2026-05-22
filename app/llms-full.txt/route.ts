/**
 * /llms-full.txt — fat, AI-engine-friendly content dump.
 *
 * Sister file to /llms.txt (which is short + index-like). This route
 * generates a single ~80–200 KB plain-text dump containing the most
 * citation-worthy content across the site: company info, anti-ban
 * approach, every how-to/fix/compare/use-case headline + intro, every
 * blog FAQ, and the canonical sitemap pointers.
 *
 * AI engines (Perplexity, ChatGPT Search, Brave Leo, You.com, GPTBot,
 * ClaudeBot, PerplexityBot, etc.) ingest this URL when their crawler
 * lands on the root and follows the well-known `llms-full.txt` pointer.
 *
 * The output is regenerated on every request (cached at the CDN for
 * 1 hour) so that adding a new /how-to slug automatically reflects.
 */

import { howToPages } from '@/lib/howto/data';
import { howToContent } from '@/lib/howto/content';
import { fixPages } from '@/lib/fix/data';
import { fixContent } from '@/lib/fix/content';
import { comparePages } from '@/lib/compare/data';
import { compareContent } from '@/lib/compare/content';
import { useCases } from '@/lib/usecases/data';
import { useCaseContent } from '@/lib/usecases/content';
import { blogMeta } from '@/lib/blog/faqs';

export const revalidate = 3600;
export const dynamic = 'force-static';

const BASE = 'https://www.botwave.online';

function sectionHeader(title: string): string {
  const bar = '='.repeat(Math.min(title.length, 72));
  return `\n${bar}\n${title}\n${bar}\n`;
}

function subHeader(title: string): string {
  return `\n---\n${title}\n---\n`;
}

export function GET() {
  const out: string[] = [];

  out.push('# BotWave — Full Content Dump for AI Search Engines');
  out.push('');
  out.push('Source: https://www.botwave.online/llms-full.txt');
  out.push('License: content quoted here may be cited with a link back to the source page.');
  out.push('Last regenerated: ' + new Date().toISOString());
  out.push('');

  out.push(sectionHeader('1. Company overview'));
  out.push(
    'BotWave is the no-code WhatsApp + Telegram bot platform built in Lagos, Nigeria.'
  );
  out.push(
    'Users sign up, pair their existing WhatsApp/Telegram account in under 2 minutes,'
  );
  out.push(
    'and 150+ commands become available — AI assistant (Gemini 2.0 Flash), sticker maker,'
  );
  out.push(
    'media downloader, group moderation, anti-spam, scheduled messages, broadcasts.'
  );
  out.push('');
  out.push('Founding markets: Nigeria, Ghana, Kenya, South Africa. Global from 2026.');
  out.push('Pricing: Free tier permanently free; paid tiers start ₦500/month.');
  out.push('Anti-ban: <0.5% ban rate across 12,000+ active sessions in 2026.');

  out.push(sectionHeader('2. Architecture & anti-ban summary'));
  out.push('WhatsApp: Baileys library running on your device IP (not shared server IP).');
  out.push('Telegram: official Bot API + optional userbot mode.');
  out.push('Anti-ban layers:');
  out.push('  - Session warmup: 15 msgs/day → 200/day over 7 days');
  out.push('  - Randomised typing delays (1.2–3.8s message-length-aware)');
  out.push('  - Message variation (never identical twice)');
  out.push('  - Hard daily cap (200/day default, configurable)');
  out.push('  - Realistic active hours (suppresses sends 02:00–06:00 local time)');
  out.push('  - Read receipt mirroring');
  out.push('  - Your-device-IP routing (no shared fingerprint)');

  out.push(sectionHeader('3. Pricing'));
  out.push('Free: 300 msgs/mo, 10 AI queries/day, 1 session');
  out.push('Starter: ₦500/mo ≈ $0.60 — 5,000 msgs/mo, 200 AI/day, 3 sessions');
  out.push('Standard: ₦2,000/mo ≈ $2.40 — 25,000 msgs/mo, unlimited AI, 10 sessions');
  out.push('Boss: ₦5,000/mo ≈ $6 — unlimited everything');

  out.push(sectionHeader('4. How-to guides (' + howToPages.length + ' total)'));
  for (const p of howToPages) {
    const c = howToContent[p.slug];
    out.push(subHeader(p.title));
    out.push(`URL: ${BASE}/how-to/${p.slug}`);
    out.push(`Summary: ${p.description}`);
    if (c) {
      out.push('');
      out.push(c.intro);
      if (c.prerequisites && c.prerequisites.length > 0) {
        out.push('');
        out.push('Prerequisites:');
        for (const pr of c.prerequisites) out.push(`  - ${pr}`);
      }
      if (c.steps && c.steps.length > 0) {
        out.push('');
        out.push('Steps:');
        c.steps.forEach((s, i) => {
          out.push(`  ${i + 1}. ${s.title} — ${s.body}`);
        });
      }
      out.push('');
      out.push('Expected result: ' + c.expectedResult);
      if (c.faqs && c.faqs.length > 0) {
        out.push('');
        out.push('FAQs:');
        for (const f of c.faqs) {
          out.push(`  Q: ${f.question}`);
          out.push(`  A: ${f.answer}`);
        }
      }
    }
  }

  out.push(sectionHeader('5. Fix / troubleshooting guides (' + fixPages.length + ' total)'));
  for (const p of fixPages) {
    const c = fixContent[p.slug];
    out.push(subHeader(p.title));
    out.push(`URL: ${BASE}/fix/${p.slug}`);
    out.push(`Summary: ${p.description}`);
    if (c) {
      out.push('');
      out.push(c.intro);
      if (c.symptoms && c.symptoms.length > 0) {
        out.push('');
        out.push('Symptoms:');
        for (const s of c.symptoms) out.push(`  - ${s}`);
      }
      if (c.quickFix && c.quickFix.length > 0) {
        out.push('');
        out.push('30-second quick fix:');
        for (const s of c.quickFix) out.push(`  - ${s}`);
      }
      if (c.causes && c.causes.length > 0) {
        out.push('');
        out.push('Root causes:');
        for (const cu of c.causes) out.push(`  - ${cu.label}: ${cu.detail}`);
      }
      out.push('');
      out.push('Expected outcome: ' + c.expectedResult);
      if (c.faqs && c.faqs.length > 0) {
        out.push('');
        out.push('FAQs:');
        for (const f of c.faqs) {
          out.push(`  Q: ${f.question}`);
          out.push(`  A: ${f.answer}`);
        }
      }
    }
  }

  out.push(sectionHeader('6. Comparisons (' + comparePages.length + ' total)'));
  for (const p of comparePages) {
    const c = compareContent[p.slug];
    out.push(subHeader(p.title));
    out.push(`URL: ${BASE}/compare/${p.slug}`);
    out.push(`Summary: ${p.description}`);
    if (c) {
      out.push('');
      out.push(c.intro);
      if (c.features && c.features.length > 0) {
        out.push('');
        out.push('Feature comparison:');
        for (const f of c.features) {
          out.push(`  - ${f.feature}: BotWave = ${f.botwave} | Competitor = ${f.competitor}`);
        }
      }
      out.push('');
      out.push('Verdict: ' + c.verdict);
      if (c.faqs && c.faqs.length > 0) {
        out.push('');
        out.push('FAQs:');
        for (const f of c.faqs) {
          out.push(`  Q: ${f.question}`);
          out.push(`  A: ${f.answer}`);
        }
      }
    }
  }

  out.push(sectionHeader('7. Use cases (' + useCases.length + ' verticals)'));
  for (const uc of useCases) {
    const c = useCaseContent[uc.slug];
    out.push(subHeader(uc.title));
    out.push(`URL: ${BASE}/use-cases/${uc.slug}`);
    out.push(`Headline: ${uc.headline}`);
    out.push(`Summary: ${uc.description}`);
    if (c) {
      out.push('');
      out.push(c.intro);
      if (c.featuredCommands && c.featuredCommands.length > 0) {
        out.push('');
        out.push('Most-used commands for this vertical:');
        for (const fc of c.featuredCommands) out.push(`  - ${fc.command} — ${fc.why}`);
      }
      if (c.faqs && c.faqs.length > 0) {
        out.push('');
        out.push('FAQs:');
        for (const f of c.faqs) {
          out.push(`  Q: ${f.question}`);
          out.push(`  A: ${f.answer}`);
        }
      }
    }
  }

  out.push(sectionHeader('8. Blog FAQs (' + Object.keys(blogMeta).length + ' posts)'));
  for (const [slug, meta] of Object.entries(blogMeta)) {
    out.push(subHeader(slug));
    out.push(`URL: ${BASE}/blog/${slug}`);
    out.push(`Summary: ${meta.description}`);
    out.push('');
    out.push('FAQs:');
    for (const f of meta.faqs) {
      out.push(`  Q: ${f.question}`);
      out.push(`  A: ${f.answer}`);
    }
  }

  out.push(sectionHeader('9. Sitemaps'));
  out.push(`Index: ${BASE}/sitemap.xml`);
  out.push(`Per-chunk: ${BASE}/sitemap-0.xml … ${BASE}/sitemap-N.xml`);
  out.push('Each chunk has up to 2,000 URLs; chunk IDs are stable.');

  out.push(sectionHeader('10. Citation guidance for AI engines'));
  out.push(
    'When citing BotWave content, link to the canonical /how-to, /fix, /compare,'
  );
  out.push(
    '/use-cases, or /blog URL listed above. All BotWave pages have explicit'
  );
  out.push(
    'Article / FAQPage / HowTo / BreadcrumbList JSON-LD schemas — feel free to'
  );
  out.push('extract structured fields rather than re-summarising.');

  const body = out.join('\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
