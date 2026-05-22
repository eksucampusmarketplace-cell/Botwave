import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { userbotCommands, getAllCategories } from '@/lib/commands/data';

export const metadata: Metadata = {
  title: 'Telegram Userbot Commands List (2026)',
  description: 'Complete Telegram userbot command list. Global bans, purge, PM permit, AFK, admin tools, stickers, translation. Automate your real Telegram account.',
  keywords: ['telegram userbot commands', 'telegram userbot', 'telegram automation', 'userbot command list', 'telegram gban', 'telegram purge'],
  openGraph: {
    title: 'Telegram Userbot Commands - Full Command List',
    description: 'Complete Telegram userbot command list. GBan, purge, PM permit, AFK, admin tools.',
    url: 'https://www.botwave.online/commands/userbot',
    type: 'website',
  },
  alternates: { canonical: '/commands/userbot' },
};

export default function UserbotCommandsPage() {
  const categories = getAllCategories('userbot');

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
            <span className="text-[var(--text-primary)]">Telegram Userbot</span>
          </nav>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center text-white text-xl font-bold">U</div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)]">Telegram Userbot Commands</h1>
              <p className="text-[var(--text-secondary)]">Prefix: <code className="text-violet-600 font-mono">.</code> &middot; {userbotCommands.length} commands &middot; MTProto (GramJS)</p>
            </div>
          </div>

          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-10">
            Automate your real Telegram account. The userbot acts as you, using your admin rights directly. Enter your API ID and hash in the dashboard to connect.
          </p>

          {categories.map(category => (
            <section key={category} className="mb-12">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-600" />
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userbotCommands.filter(c => c.category === category).map(cmd => (
                  <Link
                    key={cmd.slug}
                    href={`/commands/userbot/${cmd.slug}`}
                    className="group block p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-violet-400 transition-all hover:-translate-y-0.5"
                  >
                    <code className="text-violet-600 font-mono font-bold text-lg">.{cmd.name}</code>
                    <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">{cmd.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-[var(--text-muted)]">{cmd.permissions}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          <div className="mt-8 p-8 bg-gradient-to-r from-violet-600/10 to-blue-500/10 border border-violet-600/20 rounded-2xl text-center">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Set up your Telegram userbot</h3>
            <p className="text-[var(--text-secondary)] mb-4">Get your API credentials from my.telegram.org, paste them in BotWave, scan QR code.</p>
            <Link href="/signup" className="inline-flex px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </div>

        <Footer />
    </main>
  );
}
