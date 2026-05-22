import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import DocSidebar from '@/components/docs/DocSidebar';
import DocsSearch from '@/components/docs/DocsSearch';
import { docPages, getAllDocCategories } from '@/lib/docs/data';

export const metadata: Metadata = {
  title: 'Documentation - Guides and Tutorials | BotWave',
  description:
    'BotWave documentation. Setup guides, troubleshooting, feature tutorials for WhatsApp Bot, Telegram Bot, and Telegram Userbot.',
  keywords: [
    'botwave docs',
    'whatsapp bot guide',
    'telegram bot tutorial',
    'bot setup guide',
    'whatsapp automation guide',
  ],
  openGraph: {
    title: 'BotWave Documentation',
    description: 'Setup guides, tutorials, and troubleshooting for WhatsApp and Telegram bots.',
    url: 'https://www.botwave.online/docs',
    type: 'website',
  },
  alternates: { canonical: '/docs' },
};

const platformColors: Record<string, string> = {
  all: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  whatsapp: 'bg-green-600/10 text-green-600 border-green-600/20',
  telegram: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  userbot: 'bg-violet-600/10 text-violet-600 border-violet-600/20',
};

const platformLabels: Record<string, string> = {
  all: 'All Platforms',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram Bot',
  userbot: 'Userbot',
};

const categoryBlurbs: Record<string, string> = {
  Setup: 'Get connected in minutes, WhatsApp QR, Telegram bot tokens, userbot pairing.',
  Features: 'AI, welcome messages, group management, and the day-to-day power user toolkit.',
  Security: 'How BotWave protects your account and how to use the anti-ban system properly.',
  Troubleshooting: 'Fixes for QR errors, disconnections, missing features, and edge cases.',
  Billing: 'Plans, payments, invoices, and what each tier includes.',
  Advanced: 'API access, webhooks, custom commands, multi-session, and developer extensions.',
};

export default function DocsPage() {
  const categories = getAllDocCategories();
  const popular = docPages
    .filter((d) => ['getting-started', 'connect-whatsapp', 'connect-telegram', 'ai-commands'].includes(d.slug))
    .slice(0, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'BotWave Documentation',
    description:
      'Setup guides, tutorials, and troubleshooting for WhatsApp and Telegram bots.',
    url: 'https://www.botwave.online/docs',
    hasPart: docPages.map((d) => ({
      '@type': 'TechArticle',
      headline: d.title,
      url: `https://www.botwave.online/docs/${d.slug}`,
    })),
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
          <DocSidebar />

          <div className="min-w-0 flex-1">
            <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Link href="/" className="hover:text-blue-500">
                Home
              </Link>
              <span>/</span>
              <span className="text-[var(--text-primary)]">Docs</span>
            </nav>

            <h1 className="mb-3 text-4xl font-extrabold text-[var(--text-primary)] md:text-5xl">
              Documentation
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-[var(--text-secondary)]">
              Everything you need to set up, configure, and get the most out of BotWave. Step-by-step
              guides for every platform.
            </p>

            <DocsSearch
              docs={docPages.map((d) => ({
                slug: d.slug,
                title: d.title,
                description: d.description,
                category: d.category,
              }))}
            />

            {popular.length > 0 && (
              <section className="mb-12">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Start here
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {popular.map((doc) => (
                    <Link
                      key={doc.slug}
                      href={`/docs/${doc.slug}`}
                      className="group block rounded-xl border border-[var(--border)] bg-[var(--card-bg,var(--surface))] p-5 transition-all hover:-translate-y-0.5 hover:border-blue-400"
                    >
                      <span
                        className={`mb-3 inline-block rounded border px-2 py-1 text-xs font-medium ${platformColors[doc.platform]}`}
                      >
                        {platformLabels[doc.platform]}
                      </span>
                      <h3 className="mb-1 font-bold text-[var(--text-primary)] group-hover:text-blue-500">
                        {doc.title}
                      </h3>
                      <p className="line-clamp-2 text-sm text-[var(--text-secondary)]">
                        {doc.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {categories.map((category) => (
              <section key={category} className="mb-12">
                <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  {category}
                </h2>
                {categoryBlurbs[category] && (
                  <p className="mb-4 text-sm text-[var(--text-muted)]">{categoryBlurbs[category]}</p>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {docPages
                    .filter((d) => d.category === category)
                    .map((doc) => (
                      <Link
                        key={doc.slug}
                        href={`/docs/${doc.slug}`}
                        className="group block rounded-xl border border-[var(--border)] bg-[var(--card-bg,var(--surface))] p-6 transition-all hover:-translate-y-0.5 hover:border-blue-400"
                      >
                        <span
                          className={`mb-3 inline-block rounded border px-2 py-1 text-xs font-medium ${platformColors[doc.platform]}`}
                        >
                          {platformLabels[doc.platform]}
                        </span>
                        <h3 className="mb-2 font-bold text-[var(--text-primary)] transition-colors group-hover:text-blue-500">
                          {doc.title}
                        </h3>
                        <p className="line-clamp-2 text-sm text-[var(--text-secondary)]">
                          {doc.description}
                        </p>
                      </Link>
                    ))}
                </div>
              </section>
            ))}

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Link
                href="/commands"
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-alt)] p-6 transition-colors hover:border-blue-400"
              >
                <h3 className="mb-1 font-bold text-[var(--text-primary)]">Command Gallery</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Browse all commands across WhatsApp, Telegram Bot, and Userbot
                </p>
              </Link>
              <Link
                href="/blog"
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-alt)] p-6 transition-colors hover:border-blue-400"
              >
                <h3 className="mb-1 font-bold text-[var(--text-primary)]">Blog</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Tutorials, comparisons, and guides for WhatsApp and Telegram automation
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
