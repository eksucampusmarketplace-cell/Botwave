import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { comparePages } from '@/lib/compare/data';

export const metadata: Metadata = {
  title: 'Compare - BotWave vs Alternatives | Bot Platform Comparisons',
  description: 'Compare BotWave with other bot platforms. Evolution API, Baileys, Telegram bots, WhatsApp Business API. Features, pricing, and ease of use.',
  keywords: ['botwave vs', 'whatsapp bot comparison', 'best whatsapp bot', 'bot platform comparison'],
  alternates: { canonical: '/compare' },
};

export default function CompareIndexPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Comparisons</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-12">See how BotWave compares to other bot platforms and tools.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comparePages.map(page => (
              <Link
                key={page.slug}
                href={`/compare/${page.slug}`}
                className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-purple-400/50 transition-colors group"
              >
                <h2 className="font-bold text-[var(--text-primary)] group-hover:text-purple-500 transition-colors mb-2">{page.title}</h2>
                <p className="text-sm text-[var(--text-muted)] line-clamp-2">{page.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
