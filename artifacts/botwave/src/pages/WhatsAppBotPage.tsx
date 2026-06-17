import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const features = [
  { icon: '🤖', title: 'AI Chat', desc: 'Powered by Gemini 2.0 Flash. Ask anything, get intelligent replies.' },
  { icon: '🎨', title: 'Sticker Maker', desc: 'Convert any image or video to WhatsApp sticker instantly.' },
  { icon: '📥', title: 'Media Downloader', desc: 'Download YouTube, TikTok, Instagram Reels without watermarks.' },
  { icon: '🛡️', title: 'Anti-Spam', desc: 'Auto-detect and remove spam, floods, and malicious links.' },
  { icon: '👋', title: 'Welcome Bot', desc: 'Custom welcome messages for new group members.' },
  { icon: '💬', title: 'Auto-Reply', desc: 'Set keyword-based auto-replies for when you are busy.' },
  { icon: '📊', title: 'Polls & Games', desc: 'Trivia, hangman, polls, leaderboard — engage your group.' },
  { icon: '📅', title: 'Scheduled Messages', desc: 'Schedule messages to be sent at specific times.' },
];

const steps = [
  { step: '01', title: 'Create free account', desc: 'Sign up with your email. No credit card required.' },
  { step: '02', title: 'Scan QR code', desc: 'Open WhatsApp → Linked Devices → Link a Device → Scan.' },
  { step: '03', title: 'Bot goes live', desc: 'Your bot is now active in all your WhatsApp groups.' },
];

export default function WhatsAppBotPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-xs font-mono tracking-wide mb-6">
            WHATSAPP BOT PLATFORM
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            The Free WhatsApp Bot<br />With 150+ Commands
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            Connect your WhatsApp number in 2 minutes. Get AI chat, sticker maker, media downloader,
            anti-spam, auto-replies, group management, and more. No coding. No server setup.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/signup" className="px-8 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors">
              Get Started Free
            </Link>
            <Link href="/commands" className="px-8 py-3 bg-[var(--card-bg,var(--surface))] text-[var(--text-primary)] font-bold rounded-xl border border-[var(--border)] hover:border-blue-400 transition-colors">
              View All Commands
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
            Everything Your WhatsApp Group Needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(f => (
              <div key={f.title} className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <span className="text-2xl block mb-3">{f.icon}</span>
                <h3 className="font-bold text-[var(--text-primary)] mb-1">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-[var(--bg-alt)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-12">Set up in under 2 minutes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map(s => (
              <div key={s.step} className="p-6 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <div className="text-3xl font-black text-blue-500/30 mb-3">{s.step}</div>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-8">Anti-Ban Protection</h2>
          <div className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] mb-8">
            <p className="text-[var(--text-secondary)] mb-4">
              WhatsApp can ban accounts that behave like bots. BotWave has a multi-layer anti-ban system to protect your number:
            </p>
            <ul className="space-y-2">
              {[
                'Session warmup: starts at 15 messages/day, grows to 200 over 7 days',
                'Human-like timing: random 1-5 second delays before each reply',
                'Typing indicators and read receipts sent before responses',
                'Message variation: 50+ response templates per command',
                'Your own device IP: you are not sharing a server with other bot users',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-emerald-500 mt-1 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Start for free, no credit card</h2>
          <p className="text-[var(--text-secondary)] mb-8">300 messages/month, 10 AI queries/day, all 150+ commands. Upgrade when you grow.</p>
          <Link href="/signup" className="inline-flex px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors text-lg">
            Get Started Free →
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
