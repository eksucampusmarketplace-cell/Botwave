import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { mailboxPages } from '@/lib/mailbox/data';

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return mailboxPages.map((page) => ({ slug: page.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const page = mailboxPages.find((p) => p.slug === params.slug);
  if (!page) return {};
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    keywords: page.keywords,
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      url: `https://www.botwave.online/mailbox/${page.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/mailbox/${page.slug}` },
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  overview: 'Overview',
  'use-case': 'Use case',
  'how-to': 'How-to',
  comparison: 'Comparison',
};

const CATEGORY_COLORS: Record<string, string> = {
  overview: 'bg-blue-500/10 text-blue-500',
  'use-case': 'bg-emerald-500/10 text-emerald-500',
  'how-to': 'bg-amber-500/10 text-amber-500',
  comparison: 'bg-purple-500/10 text-purple-500',
};

export default function MailboxArticlePage({ params }: Props) {
  const page = mailboxPages.find((p) => p.slug === params.slug);
  if (!page) notFound();

  const related = mailboxPages
    .filter((p) => p.slug !== page.slug && p.category === page.category)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <article className="max-w-3xl mx-auto">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
            <Link href="/" className="hover:text-[var(--primary)]">
              Home
            </Link>
            <span>/</span>
            <Link href="/mailbox" className="hover:text-[var(--primary)]">
              Mailbox
            </Link>
            <span>/</span>
            <span className="text-[var(--text-primary)] line-clamp-1">{page.title}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                CATEGORY_COLORS[page.category] ?? CATEGORY_COLORS.overview
              }`}
            >
              {CATEGORY_LABELS[page.category] ?? page.category}
            </span>
            <span className="inline-block px-3 py-1 rounded-full bg-white/5 text-[var(--text-muted)] text-xs sm:text-sm font-medium">
              BotWave Mailbox
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4 leading-tight">
            {page.heading}
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] mb-8">{page.description}</p>

          <section className="p-5 sm:p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-3">What you get</h2>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              {page.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="p-5 sm:p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 mb-10">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-2">{page.primaryCTA}</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Sign up free and your @mail.botwave.online inbox is ready in under a minute. No phone number needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/mailbox"
                className="inline-flex justify-center items-center bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                Open the mailbox
              </Link>
              {page.secondaryCTA && (
                <Link
                  href="/signup"
                  className="inline-flex justify-center items-center bg-white/5 hover:bg-white/10 text-[var(--text-primary)] px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-white/10"
                >
                  {page.secondaryCTA}
                </Link>
              )}
            </div>
          </section>

          {related.length > 0 && (
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-4">Related</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/mailbox/${r.slug}`}
                    className="block p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-500/40 transition-colors"
                  >
                    <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] mb-1">
                      {r.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2">{r.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
      <Footer />
    </main>
  );
}
