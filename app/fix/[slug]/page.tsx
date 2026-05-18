import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { fixPages } from '@/lib/fix/data';

export function generateStaticParams() {
  return fixPages.map(page => ({ slug: page.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = fixPages.find(p => p.slug === params.slug);
  if (!page) return {};
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    keywords: page.keywords,
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      url: `https://www.botwave.online/fix/${page.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/fix/${page.slug}` },
  };
}

export default function FixPage({ params }: { params: { slug: string } }) {
  const page = fixPages.find(p => p.slug === params.slug);
  if (!page) notFound();

  const otherFixes = fixPages.filter(p => p.slug !== page.slug).slice(0, 4);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/fix" className="hover:text-[var(--primary)]">Troubleshooting</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{page.title}</span>
          </nav>

          <span className="inline-block px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-sm font-medium mb-4">Troubleshooting</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4">Fix: {page.title}</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-8">{page.description}</p>

          <div className="prose prose-invert max-w-none">
            <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] mb-8">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Quick checklist</h2>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>+ Check your session is active in the BotWave dashboard</li>
                <li>+ Make sure you are using the correct command prefix (! for WhatsApp, / for Telegram bot, . for userbot)</li>
                <li>+ Verify your phone/account has internet connection</li>
                <li>+ Try reconnecting from the dashboard</li>
                <li>+ If all else fails, delete the session and create a new one</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 mb-8">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Need more help?</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                If this guide did not solve your issue, check our documentation or contact support through the dashboard.
              </p>
              <div className="flex gap-3 mt-3">
                <Link href="/docs" className="text-sm font-medium text-blue-500 hover:underline">Documentation</Link>
                <Link href="/how-to/create-whatsapp-bot" className="text-sm font-medium text-blue-500 hover:underline">Setup guide</Link>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Other troubleshooting guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {otherFixes.map(fix => (
                <Link
                  key={fix.slug}
                  href={`/fix/${fix.slug}`}
                  className="p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-red-400/50 transition-colors"
                >
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">{fix.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{fix.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
