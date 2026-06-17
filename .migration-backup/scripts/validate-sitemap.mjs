#!/usr/bin/env node
/**
 * Pre-build sanity check for the sitemap source data.
 *
 * Run via `node scripts/validate-sitemap.mjs`. The script is intentionally
 * dependency-free (no TS, no imports of `app/*`) so it can run before any
 * Next.js build step or in a thin CI job.
 *
 * It catches the three problems that historically cause Google Search Console
 * to report sitemap errors:
 *
 *   1. Duplicate slugs inside a category (would map to the same URL).
 *   2. Slugs with characters that break a URL or XML serialization
 *      (spaces, control chars, `&` / `<` / `>` / quotes, leading/trailing `-`).
 *   3. Suspicious slug length (0 or > 200 chars).
 *
 * Cross-category dupes are allowed (e.g. `ai` exists for both whatsapp and
 * telegram commands — they live under different path prefixes).
 */
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

/**
 * @typedef {{ file: string, sections?: Array<{ name: string, startMarker: RegExp, endMarker?: RegExp }> }} FileSpec
 */

/** @type {FileSpec[]} */
const FILES_TO_CHECK = [
  { file: 'lib/landing/data.ts' },
  // Commands are scoped by platform — same slug across platforms is fine
  // (different URL prefix), so check each platform array separately.
  {
    file: 'lib/commands/data.ts',
    sections: [
      { name: 'whatsappCommands', startMarker: /export const whatsappCommands\b/, endMarker: /export const telegramCommands\b/ },
      { name: 'telegramCommands', startMarker: /export const telegramCommands\b/, endMarker: /export const userbotCommands\b/ },
      { name: 'userbotCommands',  startMarker: /export const userbotCommands\b/,  endMarker: /export const allCommands\b/ },
    ],
  },
  { file: 'lib/docs/data.ts' },
  { file: 'lib/faq/data.ts' },
  { file: 'lib/usecases/data.ts' },
  { file: 'lib/fix/data.ts' },
  { file: 'lib/howto/data.ts' },
  { file: 'lib/compare/data.ts' },
  { file: 'lib/mailbox/data.ts' },
];

const SLUG_RE = /slug:\s*'([^']+)'/g;
const VALID_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sliceSection(body, startMarker, endMarker) {
  const start = body.search(startMarker);
  if (start === -1) return '';
  const after = body.slice(start);
  if (!endMarker) return after;
  const endIdx = after.search(endMarker);
  return endIdx === -1 ? after : after.slice(0, endIdx);
}

function collectSlugs(body) {
  const out = [];
  for (const match of body.matchAll(SLUG_RE)) {
    out.push(match[1]);
  }
  return out;
}

let totalErrors = 0;

function reportError(file, slug, reason) {
  totalErrors += 1;
  console.error(`  ✗ ${file}: "${slug}" — ${reason}`);
}

function validateGroup(label, slugs) {
  console.log(`${label}: ${slugs.length} slugs`);
  const seen = new Map();
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    if (!slug) {
      reportError(label, '(empty)', 'empty slug');
      continue;
    }
    if (slug.length > 200) {
      reportError(label, slug, `slug too long (${slug.length} chars)`);
    }
    if (!VALID_SLUG_RE.test(slug)) {
      reportError(label, slug, 'invalid characters — only lowercase letters, digits, and single hyphens are allowed');
    }
    const prev = seen.get(slug);
    if (prev !== undefined) {
      reportError(label, slug, `duplicate within group (first at index ${prev})`);
    } else {
      seen.set(slug, i);
    }
  }
}

for (const spec of FILES_TO_CHECK) {
  const abs = path.join(repoRoot, spec.file);
  let body;
  try {
    body = await fs.readFile(abs, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`! ${spec.file} missing — skipping`);
      continue;
    }
    throw err;
  }

  if (spec.sections) {
    for (const section of spec.sections) {
      const slice = sliceSection(body, section.startMarker, section.endMarker);
      validateGroup(`${spec.file}::${section.name}`, collectSlugs(slice));
    }
  } else {
    validateGroup(spec.file, collectSlugs(body));
  }
}

if (totalErrors > 0) {
  console.error(`\nFAIL: ${totalErrors} sitemap data error(s) found.`);
  process.exit(1);
}
console.log('\nOK: sitemap data passes basic validation.');
