import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Telegram Auto-Reply Bot (2026) — Keyword Triggers & Smart Responses | BotWave',
  description: 'Set up automatic replies in Telegram groups and DMs. Keyword-based triggers, regex matching, AI-powered responses, and scheduled messages. Free, no coding required.',
  keywords: [
    'telegram auto reply',
    'telegram auto reply bot',
    'telegram keyword bot',
    'telegram auto responder',
    'telegram automated messages',
    'how to set auto reply in telegram',
    'telegram bot auto response',
    'telegram group auto reply',
  ],
  openGraph: {
    title: 'Telegram Auto-Reply Bot (2026) — Keyword Triggers & Smart Responses | BotWave',
    description: 'Automatic replies for Telegram: keyword triggers, regex, AI responses, scheduled messages.',
    url: 'https://www.botwave.online/telegram-auto-reply',
    type: 'website',
    images: [{ url: '/api/og?title=Telegram+Auto-Reply+Bot+2026', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: '/telegram-auto-reply',
  },
};

const replyTypes = [
  {
    icon: '🔑',
    title: 'Keyword Triggers',
    desc: 'Set exact-match keywords to trigger automatic responses. When someone types "price" or "hours", the bot replies instantly with your configured answer.',
    example: 'Trigger: "pricing" → Response: "Check our pricing at example.com/pricing"',
  },
  {
    icon: '🔍',
    title: 'Regex Pattern Matching',
    desc: 'Use regular expressions for advanced matching. Catch variations like "what is your price", "how much does it cost", or "pricing info" with a single rule.',
    example: 'Regex: /pric(e|ing|es)|cost|how much/i → Response: "Our plans start at $9/mo"',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Responses',
    desc: 'Let Gemini AI handle complex questions. When no keyword matches, the AI generates a contextual response based on your business information.',
    example: 'User: "Can I integrate with Shopify?" → AI: "Yes, we support Shopify integration via..."',
  },
  {
    icon: '📅',
    title: 'Scheduled Messages',
    desc: 'Send automated messages at specific times. Perfect for daily reminders, weekly summaries, or recurring announcements to your group.',
    example: 'Every day at 9am: "Good morning! Here are today\'s top deals..."',
  },
];

const useCases = [
  { icon: '🏪', title: 'Customer Support', desc: 'Auto-answer FAQs about pricing, shipping, hours, and return policies. Reduce response time from hours to seconds.' },
  { icon: '📚', title: 'Study Groups', desc: 'Auto-reply with study materials, syllabus links, or exam schedules when members ask common questions.' },
  { icon: '💼', title: 'Community Management', desc: 'Auto-post rules when members join, reply with links when asked "how to join", and handle repetitive admin queries.' },
  { icon: '🛒', title: 'E-Commerce', desc: 'Auto-reply with product catalogs, order tracking links, and payment instructions when customers ask.' },
  { icon: '📢', title: 'Announcements', desc: 'Schedule daily or weekly messages to keep your community informed without manual effort.' },
  { icon: '🎮', title: 'Gaming Communities', desc: 'Auto-share server info, event schedules, and leaderboards when members ask common questions.' },
];

export default function TelegramAutoReplyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-mono tracking-wide mb-6">
            AUTO-REPLY BOT
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            Telegram Auto-Reply<br />That Actually Works
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            Set keyword triggers, regex patterns, or AI-powered responses for your Telegram group.
            Reply to common questions instantly — 24/7, even while you sleep.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup"
              className="px-8 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors"
            >
              Set Up Auto-Reply Free
            </Link>
            <Link
              href="/dashboard/auto-replies"
              className="px-8 py-3 bg-[var(--surface)] text-[var(--text-primary)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--surface-light)] transition-colors"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Reply Types */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-4">
            Four Ways to Auto-Reply
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-12">
            From simple keyword matches to intelligent AI responses.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {replyTypes.map(r => (
              <div key={r.title} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                <span className="text-3xl mb-3 block">{r.icon}</span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{r.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-3">{r.desc}</p>
                <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3">
                  <p className="text-xs font-mono text-[var(--text-muted)]">{r.example}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
            How to Set Up Auto-Reply in Telegram
          </h2>
          <div className="space-y-8 max-w-2xl mx-auto">
            {[
              { step: '1', title: 'Connect your bot', desc: 'Create a bot via @BotFather and paste the token into your BotWave dashboard.' },
              { step: '2', title: 'Add your triggers', desc: 'Go to Auto-Replies in the dashboard. Add keywords, regex patterns, or enable AI fallback.' },
              { step: '3', title: 'Write your responses', desc: 'Write the response text for each trigger. Use variables like {name} for personalization.' },
              { step: '4', title: 'Go live', desc: 'Add the bot to your group and make it admin. Replies start working immediately.' },
            ].map(s => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-green-500 text-white font-bold text-lg flex items-center justify-center flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">{s.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-4">
            Use Cases
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-12">
            Auto-reply works for customer support, communities, e-commerce, and more.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map(u => (
              <div key={u.title} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                <span className="text-3xl mb-3 block">{u.icon}</span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{u.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Stop Answering the Same Questions
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Let your bot handle repetitive queries while you focus on growing your community.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup"
              className="inline-block px-8 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/telegram-bot-for-groups"
              className="inline-block px-8 py-3 bg-[var(--surface)] text-[var(--text-primary)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--surface-light)] transition-colors"
            >
              Group Management
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
