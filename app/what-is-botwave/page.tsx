import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'What is BotWave? - Free Multi-Platform Bot Automation (2026)',
  description: 'BotWave is a free bot automation platform for WhatsApp and Telegram. Connect your own account, get 50+ commands - AI chat, stickers, anti-spam, games, group management. No coding. No monthly fees. Used by 5,000+ users in Nigeria and worldwide.',
  keywords: ['what is botwave', 'botwave', 'free bot platform', 'whatsapp bot platform', 'telegram bot platform', 'botwave review', 'botwave alternative', 'free bot maker'],
  openGraph: {
    title: 'What is BotWave? - Free Multi-Platform Bot Automation',
    description: 'BotWave is a free bot automation platform for WhatsApp and Telegram. 50+ commands, AI chat, no coding. Used by 5,000+ users.',
    url: 'https://www.botwave.online/what-is-botwave',
    type: 'website',
    images: [{ url: '/api/og?title=What+is+BotWave%3F', width: 1200, height: 630 }],
  },
  alternates: { canonical: '/what-is-botwave' },
};

export default function WhatIsBotWavePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <article className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            What is BotWave?
          </h1>

          <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
            BotWave is a free, multi-platform bot automation platform that lets you add powerful features to your WhatsApp and Telegram accounts without writing a single line of code. You connect your own account - WhatsApp via QR code, Telegram Bot via @BotFather token, or Telegram Userbot via API credentials - and instantly get access to 50+ built-in commands including AI chat (powered by Google Gemini), sticker creation, media downloads, anti-spam, group management, games, polls, and more.
          </p>

          <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
            Unlike most bot platforms that charge $20-50/month and run your connection through their servers, BotWave runs your WhatsApp session from your own device IP (via QR code scan), drastically reducing ban risk. For Telegram, the official Bot API ensures zero ban risk. BotWave is used by over 5,000 users across Nigeria, South Africa, India, and worldwide - with pricing in local currencies including Nigerian Naira (₦).
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Key Facts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['Founded', '2026'],
                ['Creator', 'BotWave Team'],
                ['Platforms', 'WhatsApp, Telegram Bot, Telegram Userbot'],
                ['Price', 'Free tier (300 msgs/mo), Paid from ₦500/mo'],
                ['Commands', '50+ built-in (AI, stickers, games, admin, media)'],
                ['AI Engine', 'Google Gemini 2.0 Flash'],
                ['Users', '5,000+ worldwide'],
                ['No-Code', 'Yes - scan QR and go, no programming required'],
                ['Anti-Ban', 'Advanced (7-day warmup, presence sim, jitter)'],
                ['Open Source', 'Built on Evolution API + Baileys + GramJS'],
              ].map(([label, value]) => (
                <div key={label} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Supported Platforms</h2>
            <div className="space-y-4">
              <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">WhatsApp</h3>
                <p className="text-sm text-[var(--text-secondary)]">Connect by scanning a QR code from the BotWave dashboard. Your session runs from your own device IP using the Baileys WebSocket library. Features include !sticker, !ai, !download, !trivia, !poll, !weather, !translate, and 40+ more commands. Advanced anti-ban protection with session warmup, message variation, and presence simulation.</p>
              </div>
              <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Telegram Bot</h3>
                <p className="text-sm text-[var(--text-secondary)]">Create a bot via @BotFather on Telegram, paste the token in BotWave. Uses the official Telegram Bot API - zero ban risk. Supports /sticker, /ai, /download, /poll, /trivia, /translate, and group management features. Per-group configuration and multi-language auto-detection.</p>
              </div>
              <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Telegram Userbot</h3>
                <p className="text-sm text-[var(--text-secondary)]">Automate your real Telegram account using MTProto via GramJS. 100+ commands including .ban, .mute, .purge, .gban, .kang (stickers), .tr (translate), .afk, PM Permit, Notes, Filters, Antiflood, and more. In-memory state management with anti-flood protection.</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">How BotWave Works</h2>
            <ol className="space-y-3 text-sm text-[var(--text-secondary)] list-decimal list-inside">
              <li><strong>Sign up</strong> at www.botwave.online - free, no credit card required.</li>
              <li><strong>Choose your platform</strong> - WhatsApp, Telegram Bot, or Telegram Userbot.</li>
              <li><strong>Connect</strong> - scan QR code (WhatsApp), paste token (TG Bot), or enter API credentials (TG Userbot).</li>
              <li><strong>Your bot is live</strong> - all 50+ commands work instantly in your groups and chats.</li>
              <li><strong>Manage from dashboard</strong> - toggle features, view analytics, configure settings, all from one place.</li>
            </ol>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Who Uses BotWave?</h2>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-disc list-inside">
              <li><strong>Campus groups</strong> - class reps and student orgs use BotWave for announcements, polls, and engagement in WhatsApp and Telegram groups.</li>
              <li><strong>Church and community groups</strong> - manage member communication, share devotionals, run Q&A with AI chat.</li>
              <li><strong>Small businesses</strong> - auto-reply to customers, manage orders via group bots, reduce response time.</li>
              <li><strong>Tech communities</strong> - Telegram groups for developers, crypto traders, and tech enthusiasts use BotWave for moderation and utilities.</li>
              <li><strong>Content creators</strong> - sticker creation, media downloads, and engagement tools for fan groups.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Pricing</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { plan: 'Free', price: '₦0/mo', features: '300 msgs, 10 AI/day, 1 session, all commands' },
                { plan: 'Standard', price: '₦500/mo', features: 'Unlimited msgs, 50 AI/day, 3 sessions, priority support' },
                { plan: 'Boss', price: '₦2,000/mo', features: 'Unlimited everything, 10 sessions, white-label, API access' },
              ].map(({ plan, price, features }) => (
                <div key={plan} className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-center">
                  <p className="text-lg font-bold text-[var(--text-primary)]">{plan}</p>
                  <p className="text-2xl font-extrabold text-[var(--primary)] my-2">{price}</p>
                  <p className="text-xs text-[var(--text-muted)]">{features}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link href="/signup" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold rounded-xl transition-all text-center text-lg shadow-lg shadow-blue-500/20">
              Get Started Free →
            </Link>
            <Link href="/blog" className="px-8 py-4 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-semibold rounded-xl hover:border-blue-500/30 transition-all text-center text-lg">
              Read Our Blog
            </Link>
          </div>
        </div>
      </article>

        <Footer />
    </main>
  );
}
