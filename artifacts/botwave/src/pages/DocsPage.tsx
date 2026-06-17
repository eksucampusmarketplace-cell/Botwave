import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { docPages, getAllDocCategories } from '@/lib/docs/data';

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
  Setup: 'Get connected in minutes — WhatsApp QR, Telegram bot tokens, userbot pairing.',
  Features: 'AI, welcome messages, group management, and the day-to-day power user toolkit.',
  Security: 'How BotWave protects your account and how to use the anti-ban system properly.',
  Troubleshooting: 'Fixes for QR errors, disconnections, missing features, and edge cases.',
  Billing: 'Plans, payments, invoices, and what each tier includes.',
  Advanced: 'API access, webhooks, custom commands, multi-session, and developer extensions.',
};

export default function DocsPage() {
  const categories = getAllDocCategories();
  const popular = docPages
    .filter(d => ['getting-started', 'connect-whatsapp', 'connect-telegram', 'ai-commands'].includes(d.slug))
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Documentation</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Documentation</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-12">
            Setup guides, feature tutorials, and troubleshooting for WhatsApp Bot, Telegram Bot, and Telegram Userbot.
          </p>

          {popular.length > 0 && (
            <div className="mb-14">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-5">Popular Guides</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {popular.map(doc => (
                  <Link
                    key={doc.slug}
                    href={`/docs/${doc.slug}`}
                    className="group block p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-colors"
                  >
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium mb-3 ${platformColors[doc.platform]}`}>
                      {platformLabels[doc.platform]}
                    </span>
                    <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors text-sm">{doc.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{doc.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {categories.map(category => (
            <section key={category} className="mb-12">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{category}</h2>
                {categoryBlurbs[category] && (
                  <p className="text-sm text-[var(--text-muted)] mt-1">{categoryBlurbs[category]}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {docPages.filter(d => d.category === category).map(doc => (
                  <Link
                    key={doc.slug}
                    href={`/docs/${doc.slug}`}
                    className="group block p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${platformColors[doc.platform]}`}>
                        {platformLabels[doc.platform]}
                      </span>
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors text-sm">{doc.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{doc.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
