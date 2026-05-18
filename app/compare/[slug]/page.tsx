import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { comparePages } from '@/lib/compare/data';

export function generateStaticParams() {
  return comparePages.map(page => ({ slug: page.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = comparePages.find(p => p.slug === params.slug);
  if (!page) return {};
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    keywords: page.keywords,
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      url: `https://www.botwave.online/compare/${page.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/compare/${page.slug}` },
  };
}

export default function ComparePage({ params }: { params: { slug: string } }) {
  const page = comparePages.find(p => p.slug === params.slug);
  if (!page) notFound();

  const otherComparisons = comparePages.filter(p => p.slug !== page.slug).slice(0, 4);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/compare" className="hover:text-[var(--primary)]">Comparisons</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{page.title}</span>
          </nav>

          <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-sm font-medium mb-4">Comparison</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4">{page.title}</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-8">{page.description}</p>

          <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] mb-8">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Quick comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 text-[var(--text-muted)] font-medium">Feature</th>
                    <th className="text-left py-2 text-[var(--primary)] font-medium">BotWave</th>
                    <th className="text-left py-2 text-[var(--text-muted)] font-medium">Alternative</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border)]"><td className="py-2">Setup difficulty</td><td className="py-2">No coding needed</td><td className="py-2">Varies</td></tr>
                  <tr className="border-b border-[var(--border)]"><td className="py-2">Anti-ban system</td><td className="py-2">Built-in (7 layers)</td><td className="py-2">Manual or none</td></tr>
                  <tr className="border-b border-[var(--border)]"><td className="py-2">Free tier</td><td className="py-2">Yes (300 msgs/month)</td><td className="py-2">Varies</td></tr>
                  <tr className="border-b border-[var(--border)]"><td className="py-2">Multi-platform</td><td className="py-2">WhatsApp + Telegram</td><td className="py-2">Usually single</td></tr>
                  <tr className="border-b border-[var(--border)]"><td className="py-2">AI features</td><td className="py-2">Gemini 2.0 Flash</td><td className="py-2">Varies</td></tr>
                  <tr><td className="py-2">Commands included</td><td className="py-2">150+ ready-to-use</td><td className="py-2">Build yourself</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] mb-8">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Why choose BotWave?</h2>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li>+ No coding required. 150+ commands ready to use immediately</li>
              <li>+ Multi-layer anti-ban system keeps your number safe</li>
              <li>+ Free tier available with 300 messages/month</li>
              <li>+ Works on WhatsApp AND Telegram (bot + userbot)</li>
              <li>+ Built-in AI powered by Google Gemini 2.0 Flash</li>
              <li>+ Dashboard for managing sessions, analytics, and settings</li>
              <li>+ Active development with regular updates</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-green-500/5 border border-green-500/20 mb-8">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Try BotWave free</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-3">Create your free account. No credit card needed. Connect in under 60 seconds.</p>
            <Link href="/signup" className="inline-block px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
              Get started free
            </Link>
          </div>

          <div className="mt-12">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">More comparisons</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {otherComparisons.map(comp => (
                <Link
                  key={comp.slug}
                  href={`/compare/${comp.slug}`}
                  className="p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-purple-400/50 transition-colors"
                >
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">{comp.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{comp.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
