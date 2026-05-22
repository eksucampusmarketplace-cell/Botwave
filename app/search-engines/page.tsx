import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import WebPageSchema from '@/components/seo/WebPageSchema';
import FAQSchema from '@/components/seo/FAQSchema';

const LAST_UPDATED = '2026-05-22';

export const metadata: Metadata = {
  title: 'BotWave on Search Engines — Google, Bing, Perplexity, ChatGPT Search, Brave Leo, You.com',
  description:
    'How BotWave appears across the modern search landscape: Google + the Bing umbrella (Yahoo, DuckDuckGo, Ecosia, AOL) + AI answer engines (Perplexity, ChatGPT Search, Brave Leo, You.com, Claude).',
  keywords: [
    'botwave search engines',
    'botwave perplexity',
    'botwave chatgpt search',
    'botwave brave leo',
    'botwave bing',
    'botwave duckduckgo',
    'whatsapp bot search ai engines',
  ],
  openGraph: {
    title: 'BotWave on search engines (Google, Bing, AI engines)',
    description:
      'Where to find BotWave across traditional and AI search — including how AI engines like Perplexity and ChatGPT Search cite our content.',
    url: 'https://www.botwave.online/search-engines',
    type: 'website',
  },
  alternates: { canonical: '/search-engines' },
};

interface EngineRow {
  name: string;
  audience: string;
  indexSource: string;
  searchUrl: string;
}

const googleUmbrella: EngineRow[] = [
  { name: 'Google Search', audience: 'Everyone', indexSource: 'Google index (Googlebot)', searchUrl: 'https://www.google.com/search?q=BotWave+whatsapp+bot' },
  { name: 'Google Discover', audience: 'Mobile users', indexSource: 'Google index, freshness-weighted', searchUrl: 'https://www.google.com/' },
  { name: 'Startpage', audience: 'Privacy-conscious', indexSource: 'Google index (proxied)', searchUrl: 'https://www.startpage.com/do/search?q=BotWave' },
];

const bingUmbrella: EngineRow[] = [
  { name: 'Bing', audience: 'Microsoft ecosystem', indexSource: 'Microsoft index (Bingbot)', searchUrl: 'https://www.bing.com/search?q=BotWave+whatsapp+bot' },
  { name: 'Yahoo Search', audience: 'Legacy + email users', indexSource: 'Bing index', searchUrl: 'https://search.yahoo.com/search?p=BotWave' },
  { name: 'DuckDuckGo', audience: 'Privacy-first', indexSource: 'Bing index + DuckDuckBot', searchUrl: 'https://duckduckgo.com/?q=BotWave' },
  { name: 'Ecosia', audience: 'Eco-conscious', indexSource: 'Bing index', searchUrl: 'https://www.ecosia.org/search?q=BotWave' },
  { name: 'Swisscows', audience: 'Family-friendly', indexSource: 'Bing index', searchUrl: 'https://swisscows.com/web?query=BotWave' },
  { name: 'AOL', audience: 'Legacy US users', indexSource: 'Bing index', searchUrl: 'https://search.aol.com/aol/search?q=BotWave' },
];

const aiEngines = [
  { name: 'Perplexity AI', audience: 'Researchers, power users', how: 'Skims live web, multi-source citations.', uas: 'PerplexityBot, Perplexity-User', searchUrl: 'https://www.perplexity.ai/search?q=BotWave+whatsapp+bot' },
  { name: 'ChatGPT Search', audience: 'General public', how: "Uses OpenAI's crawl for real-time questions.", uas: 'OAI-SearchBot, ChatGPT-User, GPTBot', searchUrl: 'https://chatgpt.com/' },
  { name: 'Brave Search (Leo AI)', audience: 'Privacy-first', how: 'Independent index + localised AI summaries inside Brave Browser.', uas: 'Brave indexing', searchUrl: 'https://search.brave.com/search?q=BotWave' },
  { name: 'You.com', audience: 'Developers, creators', how: 'Highly customisable AI search with file parsing and multi-agent assistance.', uas: 'YouBot', searchUrl: 'https://you.com/search?q=BotWave' },
  { name: 'Claude / Anthropic', audience: 'Power users, business', how: 'Web browsing during conversations.', uas: 'ClaudeBot, Claude-Web, anthropic-ai', searchUrl: 'https://claude.ai/' },
  { name: 'Meta AI', audience: 'WhatsApp / Instagram users', how: 'Inline AI in Meta apps with web grounding.', uas: 'Meta-ExternalAgent, FacebookBot', searchUrl: 'https://www.meta.ai/' },
];

const faqs = [
  {
    question: 'Why does BotWave list AI search engines separately from Google?',
    answer:
      "AI answer engines (Perplexity, ChatGPT Search, Brave Leo, You.com) synthesise live web data into direct conversational answers. They use different crawlers, weigh different signals, and surface content in a fundamentally different format than the traditional 10-blue-links page. We optimise for both — see /llms.txt and /llms-full.txt for the AI-engine-specific signals.",
  },
  {
    question: 'How do I find BotWave on Bing?',
    answer:
      'Search "BotWave whatsapp bot" on Bing (bing.com), Yahoo, DuckDuckGo, Ecosia, Swisscows, or AOL — they all use the Microsoft index. Optimising for Bingbot gives us coverage on all six engines at once.',
  },
  {
    question: 'How do I get Perplexity / ChatGPT Search to cite BotWave?',
    answer:
      'Ask the engine a direct question like "What is the best free WhatsApp bot for Nigeria?" or "How do I create a WhatsApp bot in 2026?". If the engine has crawled our content recently it will cite the relevant /how-to, /compare, or /blog page inline.',
  },
  {
    question: 'Are AI bot crawlers allowed on BotWave?',
    answer:
      'Yes — all major AI crawlers (GPTBot, ClaudeBot, PerplexityBot, YouBot, Bytespider, Google-Extended, Meta-ExternalAgent, Amazonbot, and 10+ others) are explicitly allowed in our robots.txt. We want to be in their training and live search indexes.',
  },
  {
    question: 'Where can I see the canonical sitemap?',
    answer:
      "Sitemap index: https://www.botwave.online/sitemap.xml. It links to chunked sitemaps for each content type (how-to, fix, compare, use-cases, landing pages, blog).",
  },
];

export default function SearchEnginesPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Search Engines', url: '/search-engines' },
        ]}
      />
      <WebPageSchema
        url="https://www.botwave.online/search-engines"
        name="BotWave on Search Engines"
        description="How BotWave is discoverable on Google, Bing, AI answer engines, and every umbrella in between."
        datePublished={LAST_UPDATED}
        dateModified={LAST_UPDATED}
        inLanguage="en"
      />
      <FAQSchema items={faqs} />
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Search Engines</span>
          </nav>

          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium mb-4">
            Reference
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4">
            BotWave on every search engine that matters in 2026
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-10">
            Three umbrellas: <strong>Google</strong>, <strong>Bing</strong>, and the new <strong>AI answer engines</strong>. We optimise for all of them — and this page explains exactly how, so you (or any crawler reading) can verify the coverage.
          </p>

          {/* Google umbrella */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">1. The Google umbrella</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Optimised for Googlebot. Coverage on Google Search, Google Discover, and any third-party engine that proxies Google's index.
            </p>
            <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--card-bg,var(--surface))]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">Engine</th>
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">Audience</th>
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">Index source</th>
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">Try it</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  {googleUmbrella.map(r => (
                    <tr key={r.name} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3 font-medium text-[var(--text-primary)]">{r.name}</td>
                      <td className="p-3">{r.audience}</td>
                      <td className="p-3">{r.indexSource}</td>
                      <td className="p-3"><a href={r.searchUrl} target="_blank" rel="nofollow noopener" className="text-blue-400 hover:underline">Search →</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Bing umbrella */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">2. The Bing umbrella</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Optimising for Bingbot gives us coverage on six engines at once. All of these draw from the same Microsoft index.
            </p>
            <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--card-bg,var(--surface))]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">Engine</th>
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">Audience</th>
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">Index source</th>
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">Try it</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  {bingUmbrella.map(r => (
                    <tr key={r.name} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3 font-medium text-[var(--text-primary)]">{r.name}</td>
                      <td className="p-3">{r.audience}</td>
                      <td className="p-3">{r.indexSource}</td>
                      <td className="p-3"><a href={r.searchUrl} target="_blank" rel="nofollow noopener" className="text-blue-400 hover:underline">Search →</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* AI engines */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">3. AI answer engines (the new wave)</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              These engines synthesise live web data into conversational answers with citations. They're rapidly replacing traditional search for research-style queries.
            </p>
            <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--card-bg,var(--surface))]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">Engine</th>
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">Audience</th>
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">How it works</th>
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">Crawler UA(s)</th>
                    <th className="text-left p-3 font-medium text-[var(--text-muted)]">Try it</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  {aiEngines.map(e => (
                    <tr key={e.name} className="border-b border-[var(--border)] last:border-0 align-top">
                      <td className="p-3 font-medium text-[var(--text-primary)]">{e.name}</td>
                      <td className="p-3">{e.audience}</td>
                      <td className="p-3">{e.how}</td>
                      <td className="p-3 font-mono text-xs">{e.uas}</td>
                      <td className="p-3"><a href={e.searchUrl} target="_blank" rel="nofollow noopener" className="text-blue-400 hover:underline">Open →</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* How BotWave optimises */}
          <section className="mb-10 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">How BotWave optimises for all three umbrellas</h2>
            <ul className="space-y-3 text-sm text-[var(--text-secondary)] list-none">
              <li className="flex gap-3"><span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-blue-500" /><span><strong>Sitemap chunking</strong>: 20,000+ landing pages chunked at 2,000 URLs per sitemap so Google / Bing can ingest the catalog efficiently.</span></li>
              <li className="flex gap-3"><span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-blue-500" /><span><strong>Per-slug content</strong>: every /how-to, /fix, /compare, /use-cases page has unique body content (no thin programmatic pages).</span></li>
              <li className="flex gap-3"><span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-blue-500" /><span><strong>FAQPage + HowTo + BreadcrumbList + Article JSON-LD</strong> across the site so AI engines can extract structured facts.</span></li>
              <li className="flex gap-3"><span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-blue-500" /><span><strong><Link href="/llms.txt" className="text-blue-400 hover:underline">/llms.txt</Link></strong> + <strong><Link href="/llms-full.txt" className="text-blue-400 hover:underline">/llms-full.txt</Link></strong> — AI-engine-friendly content dumps.</span></li>
              <li className="flex gap-3"><span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-blue-500" /><span><strong>Allow-listed crawlers</strong>: 30+ named bots explicitly permitted in <Link href="/robots.txt" className="text-blue-400 hover:underline">/robots.txt</Link>, including all AI engines.</span></li>
              <li className="flex gap-3"><span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-blue-500" /><span><strong>Internal cross-linking</strong> between how-to / fix / compare / use-cases so crawlers discover sibling pages.</span></li>
            </ul>
          </section>

          {/* FAQ */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">FAQ</h2>
            <div className="space-y-5">
              {faqs.map((f, i) => (
                <div key={i} className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2">{f.question}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <p className="text-xs text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
