import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { telegramCommands, getAllCategories } from '@/lib/commands/data';

export const metadata: Metadata = {
  title: 'Telegram Bot Commands List (2026)',
  description: 'Complete list of Telegram bot commands. Anti-spam, moderation, AI chat, games, XP system, notes, federations. 50+ commands, zero ban risk.',
  keywords: ['telegram bot commands', 'telegram group bot commands', 'telegram moderation bot', 'telegram bot command list'],
  openGraph: {
    title: 'Telegram Bot Commands - Full Command List',
    description: 'Complete list of 50+ Telegram bot commands. Moderation, AI, games, anti-spam.',
    url: 'https://www.botwave.online/commands/telegram',
    type: 'website',
  },
  alternates: { canonical: '/commands/telegram' },
};

export default function TelegramCommandsPage() {
  const categories = getAllCategories('telegram');

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/commands" className="hover:text-[var(--primary)]">Commands</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Telegram Bot</span>
          </nav>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-xl font-bold">T</div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)]">Telegram Bot Commands</h1>
              <p className="text-[var(--text-secondary)]">Prefix: <code className="text-blue-500 font-mono">/</code> &middot; {telegramCommands.length} commands &middot; Zero ban risk</p>
            </div>
          </div>

          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-10">
            Uses the official Telegram Bot API via @BotFather. Add the bot to your group and start managing with slash commands. No risk to your account.
          </p>

          {categories.map(category => (
            <section key={category} className="mb-12">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {telegramCommands.filter(c => c.category === category).map(cmd => (
                  <Link
                    key={cmd.slug}
                    href={`/commands/telegram/${cmd.slug}`}
                    className="group block p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400 transition-all hover:-translate-y-0.5"
                  >
                    <code className="text-blue-500 font-mono font-bold text-lg">/{cmd.name}</code>
                    <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">{cmd.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-[var(--text-muted)]">{cmd.permissions}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          <div className="mt-8 p-8 bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-2xl text-center">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Add BotWave to your Telegram group</h3>
            <p className="text-[var(--text-secondary)] mb-4">{"Create a bot token via @BotFather, paste it in the dashboard, and you're live."}</p>
            <Link href="/signup" className="inline-flex px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </div>

        <Footer />
    </main>
  );
}
