# BotWave — SEO Scaling Guide (2026)

Last updated: 2026-05-22.

This document is the canonical reference for **everything BotWave does to be discoverable**, ranking strategy by engine, and how to extend the system without breaking GSC indexing signals.

## 0. Why this document exists

Two previous PRs damaged Google Search Console indexing because contributors:
- Reordered or resized the chunked landing-page sitemap arrays (forces GSC to re-discover thousands of URLs).
- Created programmatic pages with identical rendered HTML across 100+ slugs (Google flags as thin content).

This guide locks down what is safe to change and what must stay stable.

---

## 1. Search-engine landscape (2026)

There are now **three umbrellas** to optimise for, not just Google.

### 1a. The Google umbrella

| Engine | Index source | Notes |
|---|---|---|
| Google Search | Google's own index | Primary target. Crawls via `Googlebot`. |
| Google Discover | Google index | Surfaces fresh content with strong topical authority. |
| Startpage | Google index (proxied) | If we rank on Google we rank here automatically. |

Coverage: optimise for `Googlebot` and `Google-Extended` (the AI-training UA).

### 1b. The Bing umbrella

| Engine | Index source | Notes |
|---|---|---|
| Bing | Microsoft index | Primary fallback to Google. Crawl via `Bingbot`. |
| Yahoo Search | Bing index | Free coverage. |
| DuckDuckGo | Bing index + own crawlers | Crawl via `DuckDuckBot`. |
| Ecosia | Bing index | No additional work. |
| Swisscows | Bing index | No additional work. |
| AOL | Bing index | No additional work. |

Coverage: optimise for `Bingbot` and `DuckDuckBot`.

### 1c. The AI-answer-engine umbrella

These are the new wave — LLM-powered engines that synthesise live web data into answers.

| Engine | Crawler UA | Notes |
|---|---|---|
| Perplexity AI | `PerplexityBot`, `Perplexity-User` | Indexes for both training + live search. Aggressive crawler. |
| ChatGPT Search | `OAI-SearchBot`, `ChatGPT-User`, `GPTBot` | Three distinct UAs (training, live search, on-demand browsing). |
| Brave Leo | independent + Bing fallback | Use Bing posture + Brave-specific notes in `llms.txt`. |
| You.com | `YouBot` | Open to fully crawled sites. |
| Claude / Anthropic | `ClaudeBot`, `anthropic-ai`, `Claude-Web` | Crawls for both Claude training and live browsing. |
| Meta AI | `Meta-ExternalAgent`, `FacebookBot` | Surfaces in WhatsApp / Instagram search results. |
| Cohere | `cohere-ai` | Training only — but powers some downstream engines. |
| Amazon Bedrock (Alexa) | `Amazonbot` | Future-proof. |
| ByteDance / Doubao | `Bytespider` | Asia-Pacific coverage. |

All of the above are explicitly allow-listed in `app/robots.ts`.

---

## 2. Sitemap architecture

### 2a. File layout

```
/sitemap.xml              ← index (lists per-chunk sitemaps)
/sitemap-0.xml            ← core pages (home, /pricing, /commands, /faq, /security…)
/sitemap-1.xml            ← /how-to/* (all 69)
/sitemap-2.xml            ← /fix/* (all 37)
/sitemap-3.xml            ← /compare/* + /use-cases/* + /blog/*
/sitemap-10.xml … N.xml   ← chunked landing pages (2000 URLs per chunk)
```

`sitemap-0.xml` through `sitemap-3.xml` are static IDs. Chunks for landing pages start at ID 10 to allow future core-section additions without renumbering.

### 2b. Hard rules (DO NOT VIOLATE)

1. **Never reorder** `lib/landingpages/data.ts`. URLs are mapped to chunks by index.
2. **Never resize** `LANDING_CHUNK_SIZE` (currently 2000). Resizing reshuffles which URL falls in which chunk → Google must re-discover every URL.
3. **Never delete** existing landing-page entries. Soft-deprecate by leaving the data row and adding a `deprecated: true` field — the template can then render a redirect or 410 server-side.
4. **Append-only** for `howToPages`, `fixPages`, `comparePages`, `useCases`, blog-post directories. New entries go to the end of the array.
5. Sitemap `<lastmod>` for chunked landing pages uses a single `BUILD_DATE = new Date()` constant. This is intentional — per-URL lastmod would change every deploy and falsely tell Google the entire chunk needs re-crawling.

### 2c. What IS safe to change

- Add new entries (append, never reorder).
- Update `priority` and `changeFrequency` on the index pages.
- Add brand-new sitemap chunks (e.g. `sitemap-4.xml` for a future content type).
- Update per-page metadata (title, description, canonical) — this does not affect chunking.

---

## 3. On-page SEO checklist (per new programmatic page)

Every dynamic `[slug]` route must have:

- [ ] `generateMetadata` returning `title`, `description`, `keywords`, `openGraph`, `alternates.canonical`.
- [ ] `alternates.canonical` set to the absolute path (e.g. `/how-to/${slug}`). The framework will prefix with the configured host.
- [ ] At least **one** of: `BreadcrumbSchema`, `FAQSchema`, `HowToSchema`, `WebPageSchema`, or `ArticleSchema` JSON-LD.
- [ ] Unique H1 (not boilerplate).
- [ ] Per-slug body content (intro paragraph, structured fields). No identical-rendered HTML across slugs.
- [ ] Internal links to ≥ 2 related slugs (cross-linking is a discovery + topical-authority signal).
- [ ] Mobile-responsive (every existing template already is).

### 3a. Content-depth template (from this PR)

```
/how-to/[slug]:    intro → prerequisites → 5–7 steps → expected result → tips → pitfalls → FAQs → CTA → related
/fix/[slug]:       intro → symptoms → quick fix → root causes → resolution steps → prevention → FAQs → CTA → related
/compare/[slug]:   intro → feature table → BotWave strengths → competitor strengths → who-is-it-for → verdict → FAQs → CTA → related
/use-cases/[slug]: intro → pain points → solutions → real-world story → featured commands → getting started → FAQs → CTA → related
/blog/[slug]:      markdown content → FAQs (new!) → related posts → CTA
```

Every `[slug]` data file has a sister `content.ts` (e.g. `lib/howto/content.ts`) that holds the rich, unique fields keyed by slug. The template renders `content[slug]` if present and falls back to a generic body otherwise — but **every slug should have a content entry** before merging.

---

## 4. Schema markup matrix

| Page type | JSON-LD types emitted |
|---|---|
| `/` | `Organization`, `WebSite`, `SoftwareApplication` |
| `/how-to/[slug]` | `HowTo`, `BreadcrumbList`, `FAQPage` |
| `/fix/[slug]` | `BreadcrumbList`, `FAQPage` |
| `/compare/[slug]` | `BreadcrumbList`, `FAQPage` |
| `/use-cases/[slug]` | `BreadcrumbList`, `FAQPage` |
| `/blog/[slug]` | `Article`, `BreadcrumbList`, `FAQPage` (when faqs present) |
| `/privacy`, `/terms` | `BreadcrumbList`, `WebPage`, `FAQPage` |
| `/pricing` | `Product` / `Offer` per tier (TODO if not present) |

All schema components live in `components/seo/`:

```
BreadcrumbSchema.tsx
FAQSchema.tsx
HowToSchema.tsx
WebPageSchema.tsx
ArticleSchema.tsx
SoftwareApplicationSchema.tsx
TableOfContents.tsx       // visual TOC, not JSON-LD
HrefLangTags.tsx          // hreflang for multi-locale
```

---

## 5. AI-engine-specific signals

### 5a. `/llms.txt` (the index)

Short, machine-parseable, indexes the site for LLM crawlers. ~3 KB. Lives at `public/llms.txt`.

Contains: TL;DR + key pages + sitemap pointers + robots policy + contact.

### 5b. `/llms-full.txt` (the fat dump)

`app/llms-full.txt/route.ts` — generated route. Concatenates **every** how-to/fix/compare/use-case/blog headline + intro + FAQ. ~80–200 KB plain text. AI engines (Perplexity, ChatGPT Search, etc.) ingest this as a single batch.

Regenerated server-side every 1 hour (revalidate = 3600).

### 5c. FAQPage schema density

Each programmatic page emits 4–6 FAQs in `FAQPage` JSON-LD. AI engines (especially Perplexity and ChatGPT Search) extract these directly into their answers. **Every new content addition must include 4–6 unique FAQs.**

### 5d. Citation-friendly structure

- H1 + H2 + H3 hierarchy (LLMs use this to extract outlines).
- Clear "Verdict" sections on compare pages (LLMs surface these as the recommendation).
- Numbered lists for steps (LLMs preserve numbering in extractions).
- Tables for feature comparisons (LLMs preserve columns).

---

## 6. Internal linking strategy

Programmatic page templates each render:

- 3–6 cross-links to sibling slugs (same content type).
- 2–4 cross-links to complementary content type (e.g. how-to → fix, compare → use-case).
- 1 CTA link to `/signup`.

The homepage links to top-N entries of each content type via the "Internal links" section (added in this PR).

Footer links to: `/privacy`, `/terms`, `/security`, `/integrations`, `/status`, `/faq`, `/commands`, `/pricing` — top-level discovery for crawlers landing on any internal page.

---

## 7. Performance / Core Web Vitals

- LCP target: < 2.5s. Hero images use `priority` in Next.js Image.
- FID / INP target: < 100ms. Avoid heavy JS on initial load; use `'use client'` only where needed.
- CLS target: < 0.1. All images have explicit width/height. No inserts above existing content.

Lighthouse + WebPageTest CI integration recommended for next sprint.

---

## 8. International (hreflang)

Currently single-locale (en). When adding locales:

- Add hreflang entries to `<head>` via `HrefLangTags.tsx`.
- Use Next.js i18n routing (`/en/...`, `/sw/...`).
- Update sitemap to emit `xhtml:link rel="alternate"` per locale.

---

## 9. Verification & monitoring

### Google
- GSC property: `https://www.botwave.online`
- Submit `sitemap.xml` (auto-discovered)
- Monitor: Coverage, Performance, Core Web Vitals, Mobile Usability
- Tools: Rich Results Test (validates JSON-LD), URL Inspection (live test pages)

### Bing
- Bing Webmaster Tools — submit sitemap.
- IndexNow protocol — push URL pings to `api.indexnow.org` on publish.

### Perplexity / ChatGPT Search
- No webmaster tool. Verify by asking the engine "what is BotWave?" and checking citations.

### AI bot crawl-rate
- Server logs: filter by `User-Agent` for each named bot. Confirm `200` responses, not `429`/`5xx`.

---

## 10. Common pitfalls (post-mortem of past PRs)

1. **Reordering append-only arrays** → broke GSC indexing for 1,200 URLs in PR #432. Fix: enforce in code review.
2. **Same generic body across 140 programmatic pages** → caused 98 "Discovered – currently not indexed" in May 2026. Fixed in this PR by adding per-slug `content.ts` files.
3. **Missing `/terms` from footer** → users (and crawlers) had no path to terms. Fixed in this PR.
4. **`canonical` missing on `/whatsapp-bot-india` landing page** → GSC flagged duplicate without user-selected canonical. Fix: `alternates.canonical` is set in all dynamic templates as of this PR.
5. **Blog posts thin on Q&A signal** → added `FAQPage` schema to all 18 posts via `lib/blog/faqs.ts`.

---

## 11. Next-PR checklist (post-merge)

After this PR ships:

- [ ] Submit updated sitemap in GSC + Bing Webmaster Tools.
- [ ] Request URL inspection for `/privacy`, `/terms`, `/llms-full.txt`.
- [ ] Validate FAQPage / HowTo schemas via Google Rich Results Test for 5 sample pages.
- [ ] Add `IndexNow` ping to publish workflow (so Bing learns about new content within minutes).
- [ ] Monitor GSC "Discovered – not indexed" count weekly; should drop by ≥ 50% within 4 weeks.
- [ ] Verify Perplexity / ChatGPT Search cite BotWave pages by running test queries.

---

Maintainer notes: when extending content, always pair the new `data.ts` entry with a `content.ts` entry. Lint passes ≠ content quality. Read the actual rendered page on staging before merging.
