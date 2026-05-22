import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { allCommands, platformMeta, type Platform } from '@/lib/commands/data';

export const metadata: Metadata = {
  title: 'Bot Commands, WhatsApp & Telegram',
  description: 'Browse 150+ bot commands across WhatsApp, Telegram Bot, and Telegram Userbot. Stickers, AI chat, moderation, games, media tools, group management. Free.',
  keywords: ['bot commands', 'whatsapp bot commands', 'telegram bot commands', 'telegram userbot commands', 'bot command list', 'whatsapp automation commands'],
  openGraph: {
    title: 'Bot Commands - WhatsApp, Telegram Bot & Userbot',
    description: 'Browse 150+ bot commands across 3 platforms. Stickers, AI chat, moderation, games, media tools, group management.',
    url: 'https://www.botwave.online/commands',
    type: 'website',
    images: [{ url: '/api/og?title=Bot+Commands+Gallery', width: 1200, height: 630 }],
  },
  alternates: { canonical: '/commands' },
};

function PlatformSection({ platform }: { platform: Platform }) {
  const meta = platformMeta[platform];
  const commands = allCommands[platform];
  const categories = [...new Set(commands.map(c => c.category))];
  const urlPrefix = platform === 'userbot' ? '/commands/userbot' : `/commands/${platform}`;

  return (
    <div className="mb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold ${
          platform === 'whatsapp' ? 'bg-green-600' : platform === 'telegram' ? 'bg-blue-500' : 'bg-violet-600'
        }`}>
          {meta.icon}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">{meta.name}</h2>
          <p className="text-[var(--text-secondary)] text-sm">{meta.description}</p>
        </div>
      </div>

      {categories.map(category => (
        <div key={category} className="mb-8">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {commands.filter(c => c.category === category).map(cmd => (
              <Link
                key={cmd.slug}
                href={`${urlPrefix}/${cmd.slug}`}
                className="group block p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400 transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <code className="text-blue-500 font-mono font-bold text-lg">{cmd.prefix}{cmd.name}</code>
                </div>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{cmd.description}</p>
                <span className="inline-block mt-3 text-xs text-blue-500 font-medium group-hover:underline">
                  View details
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <Link
        href={urlPrefix}
        className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-medium hover:border-blue-400 transition-colors"
      >
        View all {meta.name} commands
        <span>&rarr;</span>
      </Link>
    </div>
  );
}

export default function CommandsPage() {
  const totalCommands = Object.values(allCommands).reduce((sum, cmds) => sum + cmds.length, 0);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Commands</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">
            Command Gallery
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-4">
            {totalCommands}+ commands across WhatsApp, Telegram Bot, and Telegram Userbot. Everything you need to automate, moderate, and supercharge your groups.
          </p>
          <div className="flex gap-3 flex-wrap mb-12">
            <Link href="#whatsapp" className="px-4 py-2 rounded-lg bg-green-600/10 border border-green-600/20 text-green-600 text-sm font-medium hover:bg-green-600/20 transition-colors">WhatsApp Bot</Link>
            <Link href="#telegram" className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm font-medium hover:bg-blue-500/20 transition-colors">Telegram Bot</Link>
            <Link href="#userbot" className="px-4 py-2 rounded-lg bg-violet-600/10 border border-violet-600/20 text-violet-600 text-sm font-medium hover:bg-violet-600/20 transition-colors">Telegram Userbot</Link>
          </div>

          <div id="whatsapp"><PlatformSection platform="whatsapp" /></div>
          <div id="telegram"><PlatformSection platform="telegram" /></div>
          <div id="userbot"><PlatformSection platform="userbot" /></div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
