import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { howToPages } from '@/lib/howto/data';

export const metadata: Metadata = {
  title: 'How-To Guides, WhatsApp & Telegram Bot',
  description: 'Step-by-step guides for WhatsApp and Telegram bot setup. Create bots, auto-reply, moderation, stickers, downloads, AI assistant, and more.',
  keywords: ['how to create whatsapp bot', 'whatsapp bot tutorial', 'telegram bot guide', 'bot setup guide'],
  alternates: { canonical: '/how-to' },
};

export default function HowToIndexPage() {
  const difficultyColors = {
    beginner: 'bg-green-500/10 text-green-500',
    intermediate: 'bg-yellow-500/10 text-yellow-600',
    advanced: 'bg-red-500/10 text-red-500',
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">How-To Guides</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-12">Learn how to use every feature of BotWave with step-by-step tutorials.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {howToPages.map(page => (
              <Link
                key={page.slug}
                href={`/how-to/${page.slug}`}
                className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${difficultyColors[page.difficulty]}`}>{page.difficulty}</span>
                  <span className="text-xs text-[var(--text-muted)]">{page.timeToComplete}</span>
                </div>
                <h2 className="font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors mb-2">{page.title}</h2>
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
