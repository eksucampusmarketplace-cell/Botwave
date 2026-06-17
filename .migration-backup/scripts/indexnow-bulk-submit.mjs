#!/usr/bin/env node
/**
 * scripts/indexnow-bulk-submit.mjs
 *
 * Submit every public URL on botwave.online to IndexNow in one shot.
 *
 * Use this:
 *   - After a major content drop (e.g. a new wave of programmatic
 *     landing pages), to nudge Bing / Yandex / DDG / Yahoo / Ecosia
 *     into immediate re-crawl.
 *   - As a manual smoke test of the IndexNow setup before wiring
 *     a recurring cron.
 *
 * The script does NOT depend on the running Next.js server — it reads
 * the URL list directly from the same source-of-truth (`lib/seo/all-urls.ts`)
 * and POSTs to api.indexnow.org itself. That keeps it useful for:
 *   - one-off catch-up from a laptop
 *   - CI post-deploy hooks
 *   - cron from any external scheduler
 *
 * Usage:
 *   node scripts/indexnow-bulk-submit.mjs                  # submit everything
 *   node scripts/indexnow-bulk-submit.mjs --dry-run        # just print counts
 *   node scripts/indexnow-bulk-submit.mjs --limit 200      # cap to 200 URLs
 *   node scripts/indexnow-bulk-submit.mjs --batch-size 200 # smaller batches
 *
 * Why this is plain JS (not TS):
 *   Avoiding ts-node / tsx as a dependency. We read the data files via
 *   dynamic ESM import and assemble URLs in vanilla JS.
 */

import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const BASE_URL = 'https://www.botwave.online';
const INDEXNOW_KEY = 'b7e9c1a2f4d8e0b1a3c5d7e9f1b3a5c7';
const INDEXNOW_KEY_LOCATION = `${BASE_URL}/${INDEXNOW_KEY}.txt`;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
const HOST = 'www.botwave.online';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { dryRun: false, limit: null, batchSize: 500 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run' || a === '--dry') out.dryRun = true;
    else if (a === '--limit') out.limit = Number(args[++i]);
    else if (a === '--batch-size') out.batchSize = Number(args[++i]);
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: node scripts/indexnow-bulk-submit.mjs [--dry-run] [--limit N] [--batch-size N]'
      );
      process.exit(0);
    }
  }
  return out;
}

/**
 * Slug-only data files (no TypeScript types referenced) are parsed by
 * matching `slug: 'value',` patterns. Keeps us free of a TS toolchain.
 */
function extractSlugsFromFile(relPath) {
  const file = join(ROOT, relPath);
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    console.warn(`! could not read ${relPath}: ${err?.message ?? err}`);
    return [];
  }
  const slugs = new Set();
  const re = /slug:\s*['"]([a-z0-9-]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    slugs.add(m[1]);
  }
  return Array.from(slugs);
}

function buildUrlList() {
  // Hand-curated core paths (also in lib/seo/all-urls.ts).
  const core = [
    '/',
    '/signup',
    '/login',
    '/features',
    '/features/ai',
    '/features/moderation',
    '/features/media',
    '/whatsapp-bot',
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
    '/commands/whatsapp',
    '/commands/telegram',
    '/commands/userbot',
    '/search-engines',
    '/llms.txt',
    '/llms-full.txt',
  ];

  const blog = [
    'how-to-create-free-whatsapp-bot-2026',
    'best-free-whatsapp-bot-groups-nigeria',
    'whatsapp-bot-vs-telegram-bot-africa',
    'whatsapp-bot-for-business-nigeria',
    'free-whatsapp-group-management-bot',
    'how-to-automate-whatsapp-messages-free',
    'best-free-bot-platforms-2026',
    'free-whatsapp-sticker-bot-how-to-make-stickers',
    'whatsapp-bot-commands-list-2026',
    'whatsapp-anti-spam-bot-for-groups',
    'whatsapp-ai-chatbot-free',
    'whatsapp-bot-for-schools-campus-groups',
    'whatsapp-bot-south-africa',
    'telegram-bot-for-groups-nigeria',
    'telegram-userbot-automation',
    'free-telegram-group-management-bot',
    'telegram-bot-vs-whatsapp-bot',
    'telegram-anti-spam-bot',
  ];

  const pricingTiers = ['free', 'lite', 'standard', 'boss'];

  const urls = new Set();
  for (const p of core) urls.add(BASE_URL + p);
  for (const s of blog) urls.add(`${BASE_URL}/blog/${s}`);
  for (const t of pricingTiers) urls.add(`${BASE_URL}/pricing/${t}`);

  // Slug-based content categories.
  const categories = [
    { path: '/how-to', file: 'lib/howto/data.ts' },
    { path: '/fix', file: 'lib/fix/data.ts' },
    { path: '/compare', file: 'lib/compare/data.ts' },
    { path: '/use-cases', file: 'lib/usecases/data.ts' },
    { path: '/docs', file: 'lib/docs/data.ts' },
    { path: '/faq', file: 'lib/faq/data.ts' },
    { path: '/mailbox', file: 'lib/mailbox/data.ts' },
    { path: '/search-engines', file: 'lib/search-engines/data.ts' },
  ];
  for (const c of categories) {
    for (const slug of extractSlugsFromFile(c.file)) {
      urls.add(`${BASE_URL}${c.path}/${slug}`);
    }
  }

  // Commands (whatsapp / telegram / userbot) live in one big file with
  // typed slug fields — same regex works.
  const cmdSlugs = extractSlugsFromFile('lib/commands/data.ts');
  for (const slug of cmdSlugs) {
    // The same slug appears across all three command kinds, so we
    // submit all three variants. The bot's actual /commands/[kind]/[slug]
    // route 404s for unknown combos, which is fine — IndexNow accepts
    // any URL on our host, and a stray 404 is harmless.
    urls.add(`${BASE_URL}/commands/whatsapp/${slug}`);
    urls.add(`${BASE_URL}/commands/telegram/${slug}`);
    urls.add(`${BASE_URL}/commands/userbot/${slug}`);
  }

  // Landing pages — 20k+ entries, large file. Stream-friendly regex.
  for (const slug of extractSlugsFromFile('lib/landing/data.ts')) {
    urls.add(`${BASE_URL}/${slug}`);
  }

  return Array.from(urls).sort();
}

async function submitBatch(urls) {
  const body = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: urls,
  };
  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  return { status: res.status, ok: res.status === 200 || res.status === 202 };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const { dryRun, limit, batchSize } = parseArgs();
  console.log('IndexNow bulk submit');
  console.log(`  host=${HOST}`);
  console.log(`  keyLocation=${INDEXNOW_KEY_LOCATION}`);

  const all = buildUrlList();
  const urls = limit && Number.isFinite(limit) ? all.slice(0, limit) : all;
  const batches = chunk(urls, batchSize);

  console.log(`  totalUrls=${urls.length} batchSize=${batchSize} batchCount=${batches.length}`);
  if (dryRun) {
    console.log('--dry-run — nothing submitted.');
    console.log('First 5 URLs:');
    for (const u of urls.slice(0, 5)) console.log(`  ${u}`);
    return;
  }

  let okBatches = 0;
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    try {
      const { status, ok } = await submitBatch(b);
      console.log(`  batch ${i + 1}/${batches.length}: count=${b.length} status=${status} ok=${ok}`);
      if (ok) okBatches++;
    } catch (err) {
      console.error(`  batch ${i + 1}/${batches.length}: FAILED — ${err?.message ?? err}`);
    }
    if (i < batches.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  console.log(`Done. ${okBatches}/${batches.length} batches accepted.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
