import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import {
  searchEngines,
  getEngineBySlug,
  searchEngineSlugs,
} from '@/lib/search-engines/data';

export function generateStaticParams() {
  return searchEngineSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const engine = getEngineBySlug(params.slug);
  if (!engine) return {};
  return {
    title: `BotWave on ${engine.name}, how we appear + how to verify`,
    description: engine.oneLiner,
    keywords: [
      `botwave ${engine.name.toLowerCase()}`,
      `${engine.name.toLowerCase()} whatsapp bot`,
      `${engine.name.toLowerCase()} telegram bot`,
      'botwave search engine optimization',
      'whatsapp bot ai search',
    ],
    openGraph: {
      title: `BotWave on ${engine.name}`,
      description: engine.oneLiner,
      url: `https://www.botwave.online/search-engines/${engine.slug}`,
      type: 'article',
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(`BotWave on ${engine.name}`)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    alternates: { canonical: `/search-engines/${engine.slug}` },
  };
}

const umbrellaCopy: Record<string, string> = {
  google:
    'Part of the Google umbrella, optimising for Googlebot covers this engine.',
  bing:
    'Part of the Bing umbrella, one IndexNow ping covers Bing, Yahoo, DuckDuckGo, Ecosia, Swisscows, AOL, and Yandex.',
  ai:
    'AI answer engine, synthesises live web data into conversational answers with citations. No webmaster console exists; coverage is automatic via robots.txt allow-listing and structured data.',
  independent:
    'Independent index, crawls BotWave directly using its own user agent. Coverage is automatic.',
};

export default function SearchEngineDetailPage({ params }: { params: { slug: string } }) {
  const engine = getEngineBySlug(params.slug);
  if (!engine) notFound();

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `BotWave on ${engine.name}`,
    description: engine.oneLiner,
    image: [
      `https://www.botwave.online/api/og?title=${encodeURIComponent(`BotWave on ${engine.name}`)}`,
    ],
    datePublished: '2026-05-22',
    dateModified: '2026-05-22',
    author: { '@type': 'Organization', name: 'BotWave', url: 'https://www.botwave.online' },
    publisher: {
      '@type': 'Organization',
      name: 'BotWave',
      url: 'https://www.botwave.online',
      logo: { '@type': 'ImageObject', url: 'https://www.botwave.online/icon-512.png' },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.botwave.online/search-engines/${engine.slug}`,
    },
    inLanguage: 'en',
  };

  const otherEngines = searchEngines.filter((e) => e.slug !== engine.slug).slice(0, 8);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Search Engines', url: '/search-engines' },
          { name: engine.name, url: `/search-engines/${engine.slug}` },
        ]}
      />
      <FAQSchema items={engine.faqs} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/search-engines" className="hover:text-[var(--primary)]">Search Engines</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{engine.name}</span>
          </nav>

          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${
              engine.umbrella === 'google'
                ? 'bg-blue-500/10 text-blue-500'
                : engine.umbrella === 'bing'
                ? 'bg-teal-500/10 text-teal-500'
                : engine.umbrella === 'ai'
                ? 'bg-purple-500/10 text-purple-500'
                : 'bg-orange-500/10 text-orange-500'
            }`}
          >
            {engine.umbrella === 'google' && 'Google umbrella'}
            {engine.umbrella === 'bing' && 'Bing umbrella'}
            {engine.umbrella === 'ai' && 'AI answer engine'}
            {engine.umbrella === 'independent' && 'Independent index'}
          </span>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-3">
            BotWave on {engine.name}
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-8 leading-relaxed">
            {engine.oneLiner}
          </p>

          {/* Fact card */}
          <section className="mb-10 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-2 pr-3 font-medium text-[var(--text-primary)] w-1/3 align-top">
                    Audience
                  </td>
                  <td className="py-2 text-[var(--text-secondary)]">{engine.audience}</td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-2 pr-3 font-medium text-[var(--text-primary)] align-top">
                    Index source
                  </td>
                  <td className="py-2 text-[var(--text-secondary)]">{engine.indexSource}</td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-2 pr-3 font-medium text-[var(--text-primary)] align-top">
                    Crawler UA(s)
                  </td>
                  <td className="py-2 text-[var(--text-secondary)] font-mono text-xs">
                    {engine.userAgents}
                  </td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-2 pr-3 font-medium text-[var(--text-primary)] align-top">
                    IndexNow support
                  </td>
                  <td className="py-2 text-[var(--text-secondary)]">
                    {engine.supportsIndexNow ? 'Yes, covered by api.indexnow.org' : 'No'}
                  </td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-2 pr-3 font-medium text-[var(--text-primary)] align-top">
                    Webmaster console
                  </td>
                  <td className="py-2 text-[var(--text-secondary)]">
                    {engine.hasConsole && engine.consoleUrl ? (
                      <a
                        href={engine.consoleUrl}
                        target="_blank"
                        rel="nofollow noopener"
                        className="text-blue-500 hover:underline"
                      >
                        {engine.consoleUrl}
                      </a>
                    ) : (
                      'None'
                    )}
                  </td>
                </tr>
                {engine.marketShare && (
                  <tr>
                    <td className="py-2 pr-3 font-medium text-[var(--text-primary)] align-top">
                      Market share
                    </td>
                    <td className="py-2 text-[var(--text-secondary)]">{engine.marketShare}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <p className="text-sm text-[var(--text-muted)] italic mb-10">
            {umbrellaCopy[engine.umbrella]}
          </p>

          {/* How BotWave optimises */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              How BotWave is optimised for {engine.name}
            </h2>
            <ul className="space-y-3 list-none">
              {engine.optimization.map((o, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-[var(--text-secondary)] leading-relaxed"
                >
                  <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* How to verify */}
          <section className="mb-10 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              How to verify BotWave shows up
            </h2>
            <ol className="space-y-3 list-decimal list-inside text-sm text-[var(--text-secondary)] leading-relaxed">
              {engine.howToVerify.map((step, i) => (
                <li key={i} className="pl-1">
                  {step}
                </li>
              ))}
              <li className="pl-1">
                Try a direct search:{' '}
                <a
                  href={engine.searchUrl}
                  target="_blank"
                  rel="nofollow noopener"
                  className="text-blue-500 hover:underline"
                >
                  open {engine.name} →
                </a>
              </li>
            </ol>
          </section>

          {/* FAQ */}
          {engine.faqs.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">
                {engine.name}, FAQ
              </h2>
              <div className="space-y-5">
                {engine.faqs.map((f, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]"
                  >
                    <h3 className="font-semibold text-[var(--text-primary)] mb-2">{f.question}</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="mb-10 p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/30">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
              Try BotWave for free
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              While you&apos;re here, BotWave is a free WhatsApp + Telegram bot platform with 150+ commands.
              Pair your number, run AI chat, stickers, games, group moderation, and more.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:opacity-90 text-white text-sm font-semibold transition-opacity"
              >
                Start free →
              </Link>
              <Link
                href="/search-engines"
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors"
              >
                All engines
              </Link>
            </div>
          </section>

          {/* Other engines */}
          <section className="text-sm">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Other search engines</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-none">
              {otherEngines.map((e) => (
                <li key={e.slug}>
                  <Link
                    href={`/search-engines/${e.slug}`}
                    className="text-blue-500 hover:underline"
                  >
                    {e.name}
                  </Link>{' '}
                  <span className="text-[var(--text-muted)]">
                    ·{' '}
                    {e.umbrella === 'google'
                      ? 'Google umbrella'
                      : e.umbrella === 'bing'
                      ? 'Bing umbrella'
                      : e.umbrella === 'ai'
                      ? 'AI engine'
                      : 'Independent'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
