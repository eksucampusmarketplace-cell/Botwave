import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Best Telegram Bot for Groups (2026) — Free Moderation & Anti-Spam | BotWave',
  description: 'Free Telegram group management bot with anti-spam, captcha verification, welcome messages, night mode, member boosting, and AI chat. Set up in under 2 minutes — no coding needed.',
  keywords: [
    'telegram bot for groups',
    'telegram group management bot',
    'telegram anti-spam bot',
    'telegram moderation bot',
    'telegram welcome bot',
    'best telegram group bot 2026',
    'free telegram bot',
    'telegram captcha bot',
    'telegram admin bot',
  ],
  openGraph: {
    title: 'Best Telegram Bot for Groups (2026) — Free Moderation & Anti-Spam | BotWave',
    description: 'Free Telegram group bot: anti-spam, captcha, welcome messages, night mode, member boosting, AI chat.',
    url: 'https://www.botwave.online/telegram-bot-for-groups',
    type: 'website',
    images: [{ url: '/api/og?title=Best+Telegram+Bot+for+Groups+2026', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: '/telegram-bot-for-groups',
  },
};

const moderationFeatures = [
  { icon: '🛡️', title: 'Anti-Spam Protection', desc: 'Automatically detect and remove spam messages, links, and forwarded floods. Configurable sensitivity thresholds.' },
  { icon: '🔐', title: 'Captcha Verification', desc: 'Challenge new members with math, button, or text captcha. Auto-kick unverified users after a timeout.' },
  { icon: '🚫', title: 'Anti-Raid Shield', desc: 'Detect mass-join raids and automatically lock the group. Set member-join rate limits to prevent bot attacks.' },
  { icon: '🔇', title: 'Mute & Ban System', desc: 'Mute, ban, or warn members. Track warnings with auto-escalation (3 warnings = auto-ban).' },
];

const engagementFeatures = [
  { icon: '👋', title: 'Welcome Messages', desc: 'Greet new members with custom messages. Include group rules, links, and personalized greetings with {name} variables.' },
  { icon: '📢', title: 'Force Channel Join', desc: 'Require members to join your channel before they can chat. Great for cross-promoting channels and groups.' },
  { icon: '🌙', title: 'Night Mode', desc: 'Lock the group during specific hours. Only admins can post during quiet hours — perfect for study groups or work channels.' },
  { icon: '📈', title: 'Member Boosting', desc: 'Run automated member growth campaigns with referral tracking and reward systems.' },
];

const advancedFeatures = [
  { icon: '🤖', title: 'AI Chat (Gemini)', desc: 'Members tag the bot and get intelligent AI-powered answers. Powered by Google Gemini 2.0 Flash.' },
  { icon: '📅', title: 'Scheduled Messages', desc: 'Schedule one-time or recurring messages to your groups. Great for daily reminders, announcements, or content drips.' },
  { icon: '📊', title: 'Group Analytics', desc: 'Track member activity, message volume, and growth trends from a web dashboard.' },
  { icon: '⚙️', title: 'Web Dashboard', desc: 'Configure everything from your browser. No Telegram commands needed — just toggle switches and fill forms.' },
];

const steps = [
  { step: '1', title: 'Create a Bot', desc: 'Go to @BotFather on Telegram, create a new bot, and copy the token.' },
  { step: '2', title: 'Connect to BotWave', desc: 'Paste the token in your BotWave dashboard. The bot is instantly live.' },
  { step: '3', title: 'Add to Your Group', desc: 'Add the bot as an admin in your Telegram group. It starts moderating immediately.' },
];

export default function TelegramBotForGroupsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-mono tracking-wide mb-6">
            TELEGRAM GROUP MANAGEMENT
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            The Best Telegram Bot<br />for Group Moderation
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            Stop spam, verify new members, set welcome messages, and manage your Telegram group
            from a web dashboard. Free to use, no coding required. Set up in under 2 minutes.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup"
              className="px-8 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/telegram-bot"
              className="px-8 py-3 bg-[var(--surface)] text-[var(--text-primary)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--surface-light)] transition-colors"
            >
              View All Telegram Features
            </Link>
          </div>
        </div>
      </section>

      {/* Moderation Features */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-4">
            Moderation &amp; Security
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-12">
            Protect your group from spam, raids, and unwanted members — automatically.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {moderationFeatures.map(f => (
              <div key={f.title} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engagement Features */}
      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-4">
            Engagement &amp; Growth
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-12">
            Welcome new members, boost engagement, and grow your community.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {engagementFeatures.map(f => (
              <div key={f.title} className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-6">
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-4">
            Advanced Features
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-12">
            AI chat, scheduled messages, analytics, and a full web dashboard.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {advancedFeatures.map(f => (
              <div key={f.title} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
            How to Set Up a Telegram Bot for Your Group
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(s => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              { q: 'Is the Telegram bot really free?', a: 'Yes. The core features — anti-spam, captcha, welcome messages, and moderation — are completely free. Premium plans with advanced analytics and priority support are coming soon.' },
              { q: 'Do I need to know how to code?', a: 'No. Everything is configured through a web dashboard. Just create a bot token from @BotFather, paste it into BotWave, and add the bot to your group.' },
              { q: 'Can I use the bot in multiple groups?', a: 'Yes. One bot token can be added to multiple Telegram groups. All groups are managed from the same dashboard.' },
              { q: 'How does anti-spam work?', a: 'The bot detects spam patterns including rapid message flooding, suspicious links, forwarded messages, and known spam phrases. You can configure the sensitivity and choose between mute, delete, or ban actions.' },
              { q: 'Does BotWave also support WhatsApp?', a: 'Yes! BotWave is a multi-platform bot automation tool. You can manage both WhatsApp and Telegram bots from a single dashboard.' },
            ].map(faq => (
              <div key={faq.q} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">{faq.q}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            Ready to Protect Your Telegram Group?
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Join thousands of group admins using BotWave to keep their communities safe and engaged.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
