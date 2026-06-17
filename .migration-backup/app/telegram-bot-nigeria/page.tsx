import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Telegram Bot for Nigeria (2026)',
  description: 'The best free Telegram bot for Nigeria. AI chat, stickers, anti-spam, group management, polls, games, media downloads - all from one dashboard. Set up in 2 minutes, no coding.',
  keywords: ['telegram bot nigeria', 'free telegram bot nigeria', 'telegram group bot nigeria', 'telegram automation nigeria', 'telegram bot africa', 'nigerian telegram bot', 'telegram bot free 2026', 'telegram userbot nigeria'],
  openGraph: {
    title: 'Telegram Bot for Nigeria (2026)',
    description: 'The best free Telegram bot for Nigeria. AI chat, anti-spam, group management - set up in 2 minutes.',
    url: 'https://www.botwave.online/telegram-bot-nigeria',
    type: 'website',
    images: [{ url: '/api/og?title=Telegram+Bot+for+Nigeria+(2026)', width: 1200, height: 630 }],
  },
  alternates: { canonical: '/telegram-bot-nigeria' },
};

export default function TelegramBotNigeria() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-mono tracking-wide mb-6">
            TELEGRAM + NIGERIA 🇳🇬
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            The Free Telegram Bot<br />Built for Nigeria
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            AI chat, stickers, anti-spam, group management, games, polls - everything Nigerian Telegram communities need. Set up in 2 minutes. Zero coding. Zero ban risk.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/signup" className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/20 text-lg">
              Get Started Free →
            </Link>
            <Link href="/blog/telegram-bot-for-groups-nigeria" className="px-8 py-4 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-semibold rounded-lg hover:border-blue-500/30 transition-all text-lg">
              Read Setup Guide
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
            Why Nigerian Groups Are Switching to Telegram Bots
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🏫', title: 'Campus Groups', desc: 'Computer science departments, student unions, and study groups are moving to Telegram for file sharing, larger groups, and better bot support.' },
              { icon: '💰', title: 'Crypto & Trading', desc: 'Nigerian crypto communities rely on Telegram for real-time signals, alerts, and group management. BotWave adds AI analysis and moderation.' },
              { icon: '⛪', title: 'Community Groups', desc: 'Church groups, neighborhood associations, and social clubs use Telegram bots for announcements, polls, and member engagement.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="p-6 bg-[var(--bg)] border border-[var(--border)] rounded-2xl">
                <span className="text-3xl mb-3 block">{icon}</span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-8">
            Two Ways to Automate Telegram
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">🤖 Telegram Bot (via @BotFather)</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Zero ban risk. Create a bot token from @BotFather, paste it in BotWave. Your bot appears as a separate user in your group.</p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>{'✓'} /ai - AI chat powered by Google Gemini</li>
                <li>{'✓'} /sticker - Create stickers from images</li>
                <li>{'✓'} /poll - Interactive group polls</li>
                <li>{'✓'} /trivia - Fun trivia games</li>
                <li>{'✓'} /translate - Translate in 25+ languages</li>
                <li>{'✓'} Anti-spam + welcome messages</li>
              </ul>
            </div>
            <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">⚡ Telegram Userbot (MTProto)</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Automate your real account. Execute admin commands as yourself. 100+ commands with dot prefix (.ban, .mute, .purge).</p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>{'✓'} .ban .mute .kick - Full admin control</li>
                <li>{'✓'} .gban - Global ban across all groups</li>
                <li>{'✓'} .kang - Steal stickers to your pack</li>
                <li>{'✓'} .afk - Auto-reply when away</li>
                <li>{'✓'} .purge - Mass delete messages</li>
                <li>{'✓'} PM Permit + Notes + Filters</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-8">
            Full Command List
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-3 px-4 text-sm font-bold text-[var(--text-primary)]">Category</th>
                  <th className="py-3 px-4 text-sm font-bold text-[var(--text-primary)]">Bot Commands</th>
                  <th className="py-3 px-4 text-sm font-bold text-[var(--text-primary)]">Userbot Commands</th>
                </tr>
              </thead>
              <tbody className="text-sm text-[var(--text-secondary)]">
                {[
                  ['AI & Chat', '/ai, /translate', '.ai, .tr, .google, .wiki'],
                  ['Stickers & Media', '/sticker, /download', '.kang, .stickerid, .download'],
                  ['Admin', '/ban, /mute, /warn', '.ban, .mute, .kick, .promote, .demote'],
                  ['Group Tools', '/poll, /trivia, /welcome', '.purge, .antiflood, .setwelcome, .invite'],
                  ['Fun & Games', '/trivia, /joke, /quote', '.dice, .dart, .slot, .8ball, .rate'],
                  ['Utilities', '/weather, /define, /calc', '.ping, .alive, .info, .id, .stats'],
                  ['Notes & Filters', '-', '.save, .get, .filter, .notes'],
                  ['Privacy', '-', '.approve, .block, .pmguard, .afk'],
                  ['Settings', '/lang', '.setprefix, .lang, .setalive, .addsudo'],
                ].map(([cat, bot, userbot]) => (
                  <tr key={cat} className="border-b border-[var(--border)]/50">
                    <td className="py-3 px-4 font-medium">{cat}</td>
                    <td className="py-3 px-4 font-mono text-xs">{bot}</td>
                    <td className="py-3 px-4 font-mono text-xs">{userbot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Set Up Your Telegram Bot in 2 Minutes
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">No coding. No monthly fees. No catch.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="px-8 py-4 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold rounded-xl shadow-lg text-lg">
              Get Started Free →
            </Link>
            <Link href="/what-is-botwave" className="px-8 py-4 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-semibold rounded-xl text-lg">
              Learn More About BotWave
            </Link>
          </div>
        </div>
      </section>

        <Footer />
    </main>
  );
}
