import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const moderationFeatures = [
  { icon: '🛡️', title: 'Anti-Spam Protection', desc: 'Automatically detect and remove spam, links, and forwarded floods. Configurable sensitivity.' },
  { icon: '🔐', title: 'Captcha Verification', desc: 'Math, button, or text captcha for new members. Auto-kick unverified users after timeout.' },
  { icon: '🚫', title: 'Anti-Raid Shield', desc: 'Detect mass-join raids and automatically lock the group.' },
  { icon: '🔇', title: 'Mute & Ban System', desc: 'Mute, ban, or warn members. 3 warnings = auto-ban.' },
];

const engagementFeatures = [
  { icon: '👋', title: 'Welcome Messages', desc: 'Custom welcome messages with group rules and {name} variables.' },
  { icon: '📢', title: 'Force Channel Join', desc: 'Require members to join your channel before chatting.' },
  { icon: '🌙', title: 'Night Mode', desc: 'Lock the group during specific hours.' },
  { icon: '📈', title: 'Member Boosting', desc: 'Automated member growth campaigns with referral tracking.' },
];

const steps = [
  { step: '1', title: 'Create a Bot', desc: 'Go to @BotFather on Telegram, create a new bot, copy the token.' },
  { step: '2', title: 'Connect to BotWave', desc: 'Paste the token in your BotWave dashboard. The bot is instantly live.' },
  { step: '3', title: 'Add to Your Group', desc: 'Add the bot as admin in your Telegram group.' },
];

export default function TelegramBotForGroupsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-mono mb-6">
            TELEGRAM GROUP BOT
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            Best Telegram Bot for Groups<br />(2026), Free
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            Free Telegram group management bot with anti-spam, captcha verification, welcome messages, night mode, member boosting, and AI chat. Set up in under 2 minutes.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/signup" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
              Get Started Free
            </Link>
            <Link href="/deploy-telegram-bot" className="px-8 py-3 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-[var(--text-primary)] font-bold rounded-xl hover:border-blue-400 transition-colors">
              Deploy Now →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-10">Moderation Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
            {moderationFeatures.map(f => (
              <div key={f.title} className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] flex gap-4">
                <span className="text-2xl shrink-0">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] mb-1">{f.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-10">Engagement Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {engagementFeatures.map(f => (
              <div key={f.title} className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] flex gap-4">
                <span className="text-2xl shrink-0">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] mb-1">{f.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-[var(--bg-alt)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-10">Deploy in 3 Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {steps.map(s => (
              <div key={s.step} className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <div className="text-3xl font-black text-blue-500/30 mb-3">{s.step}</div>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{s.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/deploy-telegram-bot" className="inline-flex px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
            Start Setup Wizard →
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
