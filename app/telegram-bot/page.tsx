import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Telegram Bot & Userbot (2026), Free',
  description: 'Free Telegram bot and userbot platform. Group management, anti-spam, captcha, welcome messages, anti-raid, member boosting, scheduled messages, and AI chat. No coding required.',
  keywords: ['telegram bot', 'telegram group bot', 'telegram userbot', 'telegram anti-spam bot', 'telegram captcha bot', 'telegram welcome bot', 'botwave telegram'],
  openGraph: {
    title: 'Telegram Bot & Userbot (2026), Free',
    description: 'Free Telegram bot platform. Anti-spam, captcha, welcome messages, member boosting, AI chat.',
    url: 'https://www.botwave.online/telegram-bot',
    type: 'website',
    images: [{ url: '/api/og?title=Telegram+Bot+2026+%E2%80%94+Free+Group+Management', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: '/telegram-bot',
  },
};

const botFeatures = [
  { icon: '🛡️', title: 'Anti-Spam & Anti-Raid', desc: 'Automatic flood detection, raid protection with configurable thresholds.' },
  { icon: '🔐', title: 'Captcha Verification', desc: 'Math, button, or text captcha to verify new members. Auto-kick bots.' },
  { icon: '👋', title: 'Welcome & Goodbye', desc: 'Custom welcome messages with timing control and goodbye notifications.' },
  { icon: '🌙', title: 'Night Mode', desc: 'Lock the group during specified hours. Only admins can post.' },
  { icon: '📢', title: 'Force Channel Join', desc: 'Require users to join your channel before chatting in the group.' },
  { icon: '📈', title: 'Member Booster', desc: 'Automated member growth campaigns with reward tracking.' },
  { icon: '🤖', title: 'AI Chat', desc: 'Gemini-powered AI replies. Tag the bot and get intelligent answers.' },
  { icon: '📅', title: 'Scheduled Messages', desc: 'Schedule one-time or daily recurring messages to your groups.' },
];

const userbotFeatures = [
  { icon: '🔒', title: 'PM Permit', desc: 'Block unapproved DMs with custom message and inline buttons.' },
  { icon: '👀', title: 'Auto-Read', desc: 'Automatically mark messages as read across all chats.' },
  { icon: '🌐', title: 'Proxy Support', desc: 'Route connection through SOCKS5, HTTP, or MTProto proxy.' },
  { icon: '📝', title: 'Notes & Filters', desc: 'Save and trigger notes with hashtags. Auto-filter keywords.' },
  { icon: '🚫', title: 'Global Ban', desc: 'Ban users across all your groups simultaneously.' },
  { icon: '🎭', title: 'Presence Simulation', desc: 'Appear online/offline naturally based on your timezone.' },
];

export default function TelegramBotPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-mono tracking-wide mb-6">
            TELEGRAM BOT + USERBOT
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            Telegram Group Management<br />Made Easy
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            Deploy a Telegram bot or userbot with anti-spam, captcha, welcome messages, anti-raid,
            night mode, member boosting, and AI, all managed from a web dashboard.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup"
              className="px-8 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/dashboard/telegram"
              className="px-8 py-3 bg-[var(--surface)] text-[var(--text-primary)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--surface-light)] transition-colors"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-4">
            Telegram Bot Features
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-12">
            Add the bot to your group and configure everything from the dashboard.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {botFeatures.map(f => (
              <div key={f.title} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-4">
            Telegram Userbot Features
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-12">
            Run commands from your own account. Full control without a separate bot.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userbotFeatures.map(f => (
              <div key={f.title} className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-6">
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
            Bot vs Userbot, Which One?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Telegram Bot</h3>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>&#10003; Separate bot account (@YourBot)</li>
                <li>&#10003; Best for group administration</li>
                <li>&#10003; Captcha, anti-spam, welcome messages</li>
                <li>&#10003; No risk to your personal account</li>
                <li>&#10003; Runs 24/7 on our servers</li>
              </ul>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-xl font-bold text-purple-400 mb-4">Telegram Userbot</h3>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>&#10003; Runs from your own account</li>
                <li>&#10003; PM permit, auto-read, global bans</li>
                <li>&#10003; Notes, filters, text tools</li>
                <li>&#10003; Proxy support for privacy</li>
                <li>&#10003; Presence simulation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Also Available for WhatsApp
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            BotWave supports both WhatsApp and Telegram. Manage all your bots from one dashboard.
          </p>
          <Link
            href="/whatsapp-bot"
            className="inline-block px-6 py-3 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors mr-4"
          >
            WhatsApp Bot
          </Link>
          <Link
            href="/signup"
            className="inline-block px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
          >
            Sign Up Free
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
