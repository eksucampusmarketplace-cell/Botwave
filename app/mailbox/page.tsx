import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { mailboxPages, mailboxCategories } from '@/lib/mailbox/data';

export const metadata: Metadata = {
  title: 'BotWave Mailbox — Free Email Inbox at @mail.botwave.online',
  description:
    'Every BotWave account gets a free, persistent email inbox at @mail.botwave.online. Receive verification mail, newsletters and signups in one mobile-friendly dashboard. Multiple aliases, real send/receive, no phone number.',
  keywords: [
    'botwave mailbox',
    'free email inbox',
    'temp email',
    'temporary email',
    'burner email',
    'email aliases',
    '@mail.botwave.online',
    'free email without phone',
  ],
  openGraph: {
    title: 'BotWave Mailbox — Free Email Inbox',
    description:
      'Free persistent email inbox at @mail.botwave.online. Receive signups, verifications and newsletters. Multiple aliases, mobile-first.',
    url: 'https://www.botwave.online/mailbox',
    type: 'website',
  },
  alternates: { canonical: '/mailbox' },
};

export default function MailboxLandingPage() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BotWave Mailbox',
    applicationCategory: 'CommunicationApplication',
    operatingSystem: 'Web',
    description:
      'Free persistent email inbox built into BotWave. @mail.botwave.online address with multiple aliases, send/receive, mobile-friendly dashboard.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: mailboxPages.map((p) => p.title).join(', '),
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <div className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
            <Link href="/" className="hover:text-[var(--primary)]">
              Home
            </Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Mailbox</span>
          </nav>

          <header className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium mb-4">
              Free with every BotWave account
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">
              A real email inbox at <span className="text-blue-500 break-all">@mail.botwave.online</span>
            </h1>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl">
              Every BotWave user gets a free, persistent email address — with a full inbox right inside the
              dashboard. Use it for signups, newsletters, support, side projects, or a clean alias for sites you
              do not fully trust.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/mailbox"
                className="inline-flex justify-center items-center bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-lg text-sm font-semibold transition-colors"
              >
                Open your mailbox
              </Link>
              <Link
                href="/signup"
                className="inline-flex justify-center items-center bg-white/5 hover:bg-white/10 text-[var(--text-primary)] px-5 py-3 rounded-lg text-sm font-semibold transition-colors border border-white/10"
              >
                Create a free account
              </Link>
            </div>
          </header>

          {mailboxCategories.map((cat) => {
            const pages = mailboxPages.filter((p) => p.category === cat.key);
            if (pages.length === 0) return null;
            return (
              <section key={cat.key} className="mb-10 sm:mb-12">
                <div className="mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{cat.label}</h2>
                  <p className="text-sm text-[var(--text-muted)]">{cat.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {pages.map((page) => (
                    <Link
                      key={page.slug}
                      href={`/mailbox/${page.slug}`}
                      className="block p-4 sm:p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-500/40 transition-colors"
                    >
                      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{page.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{page.description}</p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          <section className="mt-12 p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-2">
              Ready for your @mail.botwave.online address?
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Free, persistent, no phone number needed. Sign up and your inbox is ready in under a minute.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Get my mailbox
            </Link>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
