import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { docPages, getAllDocCategories } from '@/lib/docs/data';

export const metadata: Metadata = {
  title: 'Documentation - Guides and Tutorials | BotWave',
  description: 'BotWave documentation. Setup guides, troubleshooting, feature tutorials for WhatsApp Bot, Telegram Bot, and Telegram Userbot.',
  keywords: ['botwave docs', 'whatsapp bot guide', 'telegram bot tutorial', 'bot setup guide', 'whatsapp automation guide'],
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

export default function DocsPage() {
  const categories = getAllDocCategories();

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Docs</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Documentation</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-12">
            Everything you need to set up, configure, and get the most out of BotWave. Step-by-step guides for every platform.
          </p>

          {categories.map(category => (
            <section key={category} className="mb-12">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {docPages.filter(d => d.category === category).map(doc => (
                  <Link
                    key={doc.slug}
                    href={`/docs/${doc.slug}`}
                    className="group block p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400 transition-all hover:-translate-y-0.5"
                  >
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium border mb-3 ${platformColors[doc.platform]}`}>
                      {platformLabels[doc.platform]}
                    </span>
                    <h3 className="font-bold text-[var(--text-primary)] mb-2 group-hover:text-blue-500 transition-colors">{doc.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{doc.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/commands" className="p-6 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl hover:border-blue-400 transition-colors">
              <h3 className="font-bold text-[var(--text-primary)] mb-1">Command Gallery</h3>
              <p className="text-sm text-[var(--text-secondary)]">Browse all commands across WhatsApp, Telegram Bot, and Userbot</p>
            </Link>
            <Link href="/blog" className="p-6 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl hover:border-blue-400 transition-colors">
              <h3 className="font-bold text-[var(--text-primary)] mb-1">Blog</h3>
              <p className="text-sm text-[var(--text-secondary)]">Tutorials, comparisons, and guides for WhatsApp and Telegram automation</p>
            </Link>
          </div>
        </div>
      </div>

        <Footer />
    </main>
  );
}
