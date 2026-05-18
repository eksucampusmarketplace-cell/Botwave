import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { whatsappCommands, getAllCategories } from '@/lib/commands/data';

export const metadata: Metadata = {
  title: 'WhatsApp Bot Commands - Full Command List (2026) | BotWave',
  description: 'Complete list of WhatsApp bot commands. Stickers, AI chat, media downloads, games, moderation, group management. 80+ commands, all free.',
  keywords: ['whatsapp bot commands', 'whatsapp bot command list', 'whatsapp automation commands', 'free whatsapp bot'],
  openGraph: {
    title: 'WhatsApp Bot Commands - Full Command List',
    description: 'Complete list of 80+ WhatsApp bot commands. Stickers, AI chat, media, games, moderation.',
    url: 'https://www.botwave.online/commands/whatsapp',
    type: 'website',
  },
  alternates: { canonical: '/commands/whatsapp' },
};

export default function WhatsAppCommandsPage() {
  const categories = getAllCategories('whatsapp');

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
            <span className="text-[var(--text-primary)]">WhatsApp Bot</span>
          </nav>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center text-white text-xl font-bold">W</div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)]">WhatsApp Bot Commands</h1>
              <p className="text-[var(--text-secondary)]">Prefix: <code className="text-green-600 font-mono">!</code> &middot; {whatsappCommands.length} commands</p>
            </div>
          </div>

          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-10">
            Connect via QR code scan from the BotWave dashboard. All commands work in group chats, some also work in private messages.
          </p>

          {categories.map(category => (
            <section key={category} className="mb-12">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-600" />
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {whatsappCommands.filter(c => c.category === category).map(cmd => (
                  <Link
                    key={cmd.slug}
                    href={`/commands/whatsapp/${cmd.slug}`}
                    className="group block p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-green-400 transition-all hover:-translate-y-0.5"
                  >
                    <code className="text-green-600 font-mono font-bold text-lg">!{cmd.name}</code>
                    <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">{cmd.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-[var(--text-muted)]">{cmd.permissions}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          <div className="mt-8 p-8 bg-gradient-to-r from-green-600/10 to-blue-500/10 border border-green-600/20 rounded-2xl text-center">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Start using these commands in 2 minutes</h3>
            <p className="text-[var(--text-secondary)] mb-4">{"Sign up, scan QR code, type a command. That's it."}</p>
            <Link href="/signup" className="inline-flex px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
