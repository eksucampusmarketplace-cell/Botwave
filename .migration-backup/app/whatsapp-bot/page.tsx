import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LatestPostsCompact from '@/components/blog/LatestPostsCompact';

export const metadata: Metadata = {
  title: 'WhatsApp Bot (2026), Free Automation Platform',
  description: 'The most powerful free WhatsApp bot platform. 150+ commands, AI chat, sticker maker, anti-spam, auto-replies, group management, scheduled messages. No coding required. Set up in 2 minutes.',
  keywords: ['whatsapp bot', 'free whatsapp bot', 'whatsapp automation', 'whatsapp business bot', 'whatsapp group bot', 'whatsapp bot maker', 'botwave'],
  openGraph: {
    title: 'WhatsApp Bot (2026), Free Automation Platform',
    description: 'The most powerful free WhatsApp bot. 150+ commands, AI, anti-spam, stickers. No coding.',
    url: 'https://www.botwave.online/whatsapp-bot',
    type: 'website',
    images: [{ url: '/api/og?title=WhatsApp+Bot+2026+%E2%80%94+Free+Automation+Platform', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: '/whatsapp-bot',
    languages: {
      'en-NG': '/whatsapp-bot-nigeria',
      'en-ZA': '/whatsapp-bot-south-africa',
      'en-IN': '/whatsapp-bot-india',
      'en-US': '/whatsapp-bot-usa',
      'x-default': '/whatsapp-bot',
    },
  },
};

const features = [
  { icon: '🤖', title: 'AI Chat', desc: 'Powered by Gemini 2.0 Flash. Ask anything, get intelligent replies.' },
  { icon: '🎨', title: 'Sticker Maker', desc: 'Convert any image or video to WhatsApp sticker instantly.' },
  { icon: '📥', title: 'Media Downloader', desc: 'Download YouTube, TikTok, Instagram Reels without watermarks.' },
  { icon: '🛡️', title: 'Anti-Spam', desc: 'Auto-detect and remove spam, floods, and malicious links.' },
  { icon: '👋', title: 'Welcome Bot', desc: 'Custom welcome messages for new group members.' },
  { icon: '💬', title: 'Auto-Reply', desc: 'Set keyword-based auto-replies for when you are busy.' },
  { icon: '📊', title: 'Polls & Games', desc: 'Trivia, hangman, polls, leaderboard, engage your group.' },
  { icon: '📅', title: 'Scheduled Messages', desc: 'Schedule messages to be sent at specific times.' },
];

export default function WhatsAppBotPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono tracking-wide mb-6">
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
            <Link
              href="/signup"
              className="px-8 py-3 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-[var(--surface)] text-[var(--text-primary)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--surface-light)] transition-colors"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
            Everything Your WhatsApp Group Needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(f => (
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
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-emerald-400 font-bold text-xl">1</span>
              </div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Sign Up</h3>
              <p className="text-sm text-[var(--text-secondary)]">Create your free account in seconds.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-emerald-400 font-bold text-xl">2</span>
              </div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Scan QR Code</h3>
              <p className="text-sm text-[var(--text-secondary)]">Link your WhatsApp by scanning a QR code.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-emerald-400 font-bold text-xl">3</span>
              </div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Start Using</h3>
              <p className="text-sm text-[var(--text-secondary)]">Type !help in any chat. 150+ commands ready.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-8">
            Anti-Ban Technology
          </h2>
          <p className="text-center text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            BotWave uses advanced anti-ban features to keep your WhatsApp account safe.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Session warmup: new accounts start with low limits, scaling up over 7 days',
              'Human-like typing simulation with read receipts and natural delays',
              'Daily message caps (200/day) to stay under WhatsApp radar',
              'Presence scheduling: bot goes offline during night hours',
              'Message fingerprint jitter: every message has unique bytes',
              'Your device IP, not shared servers: lowest possible ban risk',
            ].map(text => (
              <div key={text} className="flex items-start gap-3 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                <span className="text-emerald-400 mt-0.5">&#10003;</span>
                <p className="text-sm text-[var(--text-secondary)]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Available in Your Region
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            BotWave works worldwide. Check out our region-specific pages:
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/whatsapp-bot-nigeria" className="px-4 py-2 bg-[var(--bg)] rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Nigeria
            </Link>
            <Link href="/whatsapp-bot-south-africa" className="px-4 py-2 bg-[var(--bg)] rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              South Africa
            </Link>
            <Link href="/whatsapp-bot-india" className="px-4 py-2 bg-[var(--bg)] rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              India
            </Link>
            <Link href="/whatsapp-bot-usa" className="px-4 py-2 bg-[var(--bg)] rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              USA
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Ready to Automate Your WhatsApp?
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Join thousands of users automating their WhatsApp groups with BotWave.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-3 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      <LatestPostsCompact limit={4} />
      <Footer />
    </main>
  );
}
