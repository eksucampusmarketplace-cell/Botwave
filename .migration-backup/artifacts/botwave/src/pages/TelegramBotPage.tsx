import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

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
            night mode, member boosting, and AI — all managed from a web dashboard.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/signup" className="px-8 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors">
              Get Started Free
            </Link>
            <Link href="/commands/telegram" className="px-8 py-3 bg-[var(--card-bg,var(--surface))] text-[var(--text-primary)] font-bold rounded-xl border border-[var(--border)] hover:border-blue-400 transition-colors">
              View Telegram Commands
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-4">Telegram Bot Features</h2>
          <p className="text-center text-[var(--text-secondary)] mb-10">Official Bot API — zero ban risk. One-click setup.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {botFeatures.map(f => (
              <div key={f.title} className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <span className="text-2xl block mb-3">{f.icon}</span>
                <h3 className="font-bold text-[var(--text-primary)] mb-1 text-sm">{f.title}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-[var(--bg-alt)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-4">Telegram Userbot Features</h2>
          <p className="text-center text-[var(--text-secondary)] mb-10">MTProto — automate your personal Telegram account.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {userbotFeatures.map(f => (
              <div key={f.title} className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <span className="text-2xl block mb-3">{f.icon}</span>
                <h3 className="font-bold text-[var(--text-primary)] mb-1 text-sm">{f.title}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-10">Bot vs Userbot — What's the difference?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
              <h3 className="font-bold text-blue-500 mb-4">Telegram Bot</h3>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex gap-2"><span className="text-emerald-500">✓</span> Official Bot API (no ban risk)</li>
                <li className="flex gap-2"><span className="text-emerald-500">✓</span> Easy setup — just paste a token from @BotFather</li>
                <li className="flex gap-2"><span className="text-emerald-500">✓</span> Group management, anti-spam, moderation</li>
                <li className="flex gap-2"><span className="text-[var(--text-muted)]">·</span> Requires being added to groups as admin</li>
                <li className="flex gap-2"><span className="text-[var(--text-muted)]">·</span> Cannot read past messages</li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-violet-500/5 border border-violet-500/20">
              <h3 className="font-bold text-violet-500 mb-4">Telegram Userbot</h3>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex gap-2"><span className="text-emerald-500">✓</span> Automates your real Telegram account</li>
                <li className="flex gap-2"><span className="text-emerald-500">✓</span> Full access to all your chats</li>
                <li className="flex gap-2"><span className="text-emerald-500">✓</span> PM permit, auto-read, global ban</li>
                <li className="flex gap-2"><span className="text-[var(--text-muted)]">·</span> Needs API credentials from my.telegram.org</li>
                <li className="flex gap-2"><span className="text-[var(--text-muted)]">·</span> Slight ban risk if misused</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Try both platforms free</h2>
          <p className="text-[var(--text-secondary)] mb-8">One BotWave account covers both Telegram Bot and Telegram Userbot.</p>
          <Link href="/signup" className="inline-flex px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-lg">
            Get Started Free →
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
