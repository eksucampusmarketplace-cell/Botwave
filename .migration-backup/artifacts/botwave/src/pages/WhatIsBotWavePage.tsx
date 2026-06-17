import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const platforms = [
  { name: 'Telegram Bot API', desc: 'Use @BotFather to create a bot token. Zero ban risk. Full group management and automation.', icon: '🤖' },
  { name: 'Telegram Userbot', desc: 'Connect your real Telegram account using MTProto. Full automation from your personal account.', icon: '👤' },
];

const commandHighlights = [
  { name: 'AI Chat', cmd: '!ai', desc: 'Powered by Google Gemini 2.0 Flash' },
  { name: 'Sticker Maker', cmd: '/sticker', desc: 'Any image or video → Telegram sticker' },
  { name: 'Media Downloader', cmd: '!yt / !tiktok / !ig', desc: 'Download without watermarks' },
  { name: 'Anti-Spam', cmd: 'Auto', desc: 'Flood detection and auto-moderation' },
  { name: 'Polls & Games', cmd: '!poll / !trivia', desc: 'Group engagement tools' },
  { name: 'Scheduled Messages', cmd: '!schedule', desc: 'Send at specific times' },
];

const faq = [
  { q: 'Is BotWave free?', a: 'Yes. The free tier gives you 300 messages/month, 10 AI queries/day, and all 150+ commands. No credit card required.' },
  { q: 'Is there any ban risk?', a: 'Telegram Bots use the official Bot API — zero ban risk. Telegram Userbots use MTProto, which is also officially supported. BotWave is built on top of Telegram\'s official infrastructure.' },
  { q: 'Do I need coding knowledge?', a: 'No. BotWave is a no-code platform. You connect via @BotFather token or Telegram credentials and configure everything from a web dashboard or directly in your chat.' },
  { q: 'Which countries are supported?', a: 'BotWave works in all countries where Telegram is available. Pricing includes Nigerian Naira (₦), South African Rand, and USD.' },
];

export default function WhatIsBotWavePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <article className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            What is BotWave?
          </h1>

          <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-6">
            BotWave is a free Telegram bot automation platform that lets you add powerful features to your Telegram groups and channels without writing a single line of code. You connect your account — Telegram Bot via @BotFather token, or Telegram Userbot via API credentials — and instantly get access to 150+ built-in commands including AI chat (powered by Google Gemini), sticker creation, media downloads, anti-spam, group management, games, polls, and more.
          </p>

          <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-10">
            Unlike most bot platforms that charge $20–50/month, BotWave is free forever. The official Telegram Bot API ensures zero ban risk. BotWave is used by thousands of users across Nigeria, South Africa, India, and worldwide — with pricing in local currencies including Nigerian Naira (₦).
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">How You Connect</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {platforms.map(p => (
                <div key={p.name} className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <span className="text-2xl block mb-2">{p.icon}</span>
                  <h3 className="font-bold text-[var(--text-primary)] mb-1 text-sm">{p.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{p.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">What Commands Can It Run?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {commandHighlights.map(c => (
                <div key={c.name} className="flex items-center gap-3 p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <code className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded shrink-0">{c.cmd}</code>
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{c.name}</span>
                    <p className="text-xs text-[var(--text-muted)]">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/commands" className="inline-flex mt-4 text-sm text-blue-500 hover:underline">
              View all 150+ commands →
            </Link>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faq.map(item => (
                <div key={item.q} className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2">{item.q}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="text-center py-8">
            <Link href="/signup" className="inline-flex px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-lg">
              Try BotWave Free →
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}
