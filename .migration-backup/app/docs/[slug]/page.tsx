import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MarkdownRenderer from '@/components/docs/MarkdownRenderer';
import DocSidebar from '@/components/docs/DocSidebar';
import DocToc from '@/components/docs/DocToc';
import DocPrevNext from '@/components/docs/DocPrevNext';
import { docPages, getDocBySlug } from '@/lib/docs/data';
import { extractHeadings } from '@/lib/docs/toc';

export function generateStaticParams() {
  return docPages.map((doc) => ({ slug: doc.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const doc = getDocBySlug(params.slug);
  if (!doc) return {};
  return {
    title: `${doc.title} | BotWave Docs`,
    description: doc.description,
    keywords: doc.seoKeywords,
    openGraph: {
      title: doc.title,
      description: doc.description,
      url: `https://www.botwave.online/docs/${doc.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/docs/${doc.slug}` },
  };
}

const platformLabels: Record<string, string> = {
  all: 'All Platforms',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram Bot',
  userbot: 'Userbot',
};

const platformColors: Record<string, string> = {
  all: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  whatsapp: 'bg-green-600/10 text-green-600 border-green-600/20',
  telegram: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  userbot: 'bg-violet-600/10 text-violet-600 border-violet-600/20',
};

const GITHUB_REPO = 'https://github.com/eksucampusmarketplace-cell/Botwave';

export default function DocPage({ params }: { params: { slug: string } }) {
  const doc = getDocBySlug(params.slug);
  if (!doc) notFound();

  const idx = docPages.findIndex((d) => d.slug === doc.slug);
  const prev = idx > 0 ? docPages[idx - 1] : undefined;
  const next = idx >= 0 && idx < docPages.length - 1 ? docPages[idx + 1] : undefined;

  const headings = extractHeadings(doc.content);

  const related = doc.relatedDocs
    .map((slug) => docPages.find((d) => d.slug === slug))
    .filter((d): d is (typeof docPages)[number] => Boolean(d));

  const lastUpdated = doc.lastUpdated ?? null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: doc.title,
    description: doc.description,
    ...(lastUpdated ? { dateModified: lastUpdated } : {}),
    author: { '@type': 'Organization', name: 'BotWave' },
    publisher: { '@type': 'Organization', name: 'BotWave', url: 'https://www.botwave.online' },
    mainEntityOfPage: `https://www.botwave.online/docs/${doc.slug}`,
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="pt-28 pb-20 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl gap-8">
          <DocSidebar activeSlug={doc.slug} />

          <div className="min-w-0 flex-1">
            <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
              <Link href="/" className="hover:text-blue-500">
                Home
              </Link>
              <span>/</span>
              <Link href="/docs" className="hover:text-blue-500">
                Docs
              </Link>
              <span>/</span>
              <span className="text-[var(--text-primary)]">{doc.title}</span>
            </nav>

            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span
                className={`inline-block rounded-lg border px-3 py-1.5 text-xs font-semibold ${platformColors[doc.platform]}`}
              >
                {platformLabels[doc.platform]}
              </span>
              <span className="rounded-lg border border-[var(--border)] bg-[var(--bg-alt)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
                {doc.category}
              </span>
              {lastUpdated && (
                <span className="text-xs text-[var(--text-muted)]">
                  Updated{' '}
                  {new Date(lastUpdated).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>

            <h1 className="mb-3 text-3xl font-extrabold text-[var(--text-primary)] md:text-4xl">
              {doc.title}
            </h1>
            <p className="mb-8 text-lg text-[var(--text-secondary)]">{doc.description}</p>

            <MarkdownRenderer content={doc.content} />

            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5 text-xs text-[var(--text-muted)]">
              <span>
                Was this page helpful? Found a typo?{' '}
                <a
                  href={`${GITHUB_REPO}/issues/new?title=Docs+feedback%3A+${encodeURIComponent(doc.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Open an issue
                </a>
                .
              </span>
              <a
                href={`${GITHUB_REPO}/edit/BotWave/lib/docs/data.ts`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Edit this page on GitHub
              </a>
            </div>

            <DocPrevNext prev={prev} next={next} />

            {related.length > 0 && (
              <section className="mt-12">
                <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">Related guides</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {related.map((rd) => (
                    <Link
                      key={rd.slug}
                      href={`/docs/${rd.slug}`}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card-bg,var(--surface))] p-4 transition-colors hover:border-blue-400"
                    >
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{rd.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
                        {rd.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-12 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-violet-500/10 p-8 text-center">
              <h3 className="mb-2 text-xl font-bold text-[var(--text-primary)]">Need more help?</h3>
              <p className="mb-4 text-[var(--text-secondary)]">
                Browse more guides, the FAQ, or start using BotWave now.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/docs"
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-5 py-2.5 font-medium text-[var(--text-primary)] transition-colors hover:border-blue-400"
                >
                  All Docs
                </Link>
                <Link
                  href="/faq"
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-5 py-2.5 font-medium text-[var(--text-primary)] transition-colors hover:border-blue-400"
                >
                  FAQ
                </Link>
                <Link
                  href="/commands"
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-5 py-2.5 font-medium text-[var(--text-primary)] transition-colors hover:border-blue-400"
                >
                  Commands
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>

          <DocToc headings={headings} />
        </div>
      </div>

      <Footer />
    </main>
  );
}
