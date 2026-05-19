import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { fixPages } from '@/lib/fix/data';

export const metadata: Metadata = {
  title: 'Troubleshooting - Fix Common Bot Issues | BotWave',
  description: 'Fix common WhatsApp and Telegram bot issues. Disconnection, bans, QR scanning, auto-reply, slow response, and more. Step-by-step troubleshooting guides.',
  keywords: ['whatsapp bot fix', 'fix bot issues', 'whatsapp bot troubleshooting', 'telegram bot not working'],
  alternates: { canonical: '/fix' },
};

export default function FixIndexPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Troubleshooting</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-12">Step-by-step guides to fix common bot issues.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fixPages.map(page => (
              <Link
                key={page.slug}
                href={`/fix/${page.slug}`}
                className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-red-400/50 transition-colors group"
              >
                <h2 className="font-bold text-[var(--text-primary)] group-hover:text-red-500 transition-colors mb-2">{page.title}</h2>
                <p className="text-sm text-[var(--text-muted)] line-clamp-2">{page.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

        <Footer />
    </main>
  );
}
