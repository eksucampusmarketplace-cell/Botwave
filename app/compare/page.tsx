import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'BotWave vs Alternatives - Comparison | BotWave',
  description: 'Compare BotWave to Evolution API, Baileys, WA Web Plus, and other WhatsApp bot platforms. See features, pricing, and ban risk side by side.',
  keywords: ['botwave vs evolution api', 'botwave vs baileys', 'whatsapp bot comparison', 'best whatsapp bot platform'],
  openGraph: {
    title: 'BotWave vs Alternatives',
    description: 'Compare BotWave to Evolution API, Baileys, and other WhatsApp bot platforms.',
    url: 'https://www.botwave.online/compare',
    type: 'website',
  },
  alternates: { canonical: '/compare' },
};

const comparisons = [
  {
    slug: 'evolution-api',
    name: 'Evolution API',
    description: 'BotWave vs Evolution API. Both use Baileys under the hood, but BotWave adds anti-ban, commands, AI, and a user dashboard on top.',
  },
  {
    slug: 'baileys',
    name: 'Baileys (Raw)',
    description: 'BotWave vs raw Baileys library. Baileys is the engine, BotWave is the full car. No coding needed with BotWave.',
  },
  {
    slug: 'telegram-bots',
    name: 'Telegram Bots',
    description: 'WhatsApp bots vs Telegram bots. Why both matter, and how BotWave supports all three: WhatsApp, Telegram Bot, and Telegram Userbot.',
  },
];

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Compare</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">BotWave vs Alternatives</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-12">
            Honest comparisons. See how BotWave stacks up against other WhatsApp and Telegram bot platforms.
          </p>

          <div className="space-y-6">
            {comparisons.map(comp => (
              <Link key={comp.slug} href={`/compare/${comp.slug}`} className="group block p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400 transition-all hover:-translate-y-0.5">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-blue-500 transition-colors">
                  BotWave vs {comp.name}
                </h2>
                <p className="text-[var(--text-secondary)]">{comp.description}</p>
                <span className="inline-block mt-3 text-sm text-blue-500 font-medium group-hover:underline">Read comparison &rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
