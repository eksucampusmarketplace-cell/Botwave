import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const features = [
  { icon: '📬', title: 'Persistent Inbox', desc: 'Your @mail.botwave.online address never expires. Unlike temp email services, your inbox stays active as long as your account exists.' },
  { icon: '🔀', title: 'Multiple Aliases', desc: 'Create multiple email aliases from a single inbox. Use different addresses for different signups to avoid spam.' },
  { icon: '📱', title: 'Mobile-First Dashboard', desc: 'Read and manage emails from any device. Clean, distraction-free inbox optimized for mobile.' },
  { icon: '🤖', title: 'AI Email Summarizer', desc: 'Long newsletters? Hit summarize and get the key points in under 30 words.' },
  { icon: '🔔', title: 'Telegram Notifications', desc: 'Forward email alerts to your Telegram bot so you never miss important messages.' },
  { icon: '🔒', title: 'No Phone Required', desc: 'Sign up for services that require email verification without using your personal email or phone number.' },
];

export default function MailboxPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-mono tracking-wide mb-6">
            FREE EMAIL INBOX
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">
            BotWave Mailbox
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-4">
            Every BotWave account gets a free, persistent email inbox at{' '}
            <code className="text-blue-400">@mail.botwave.online</code>
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Receive verification emails, newsletters, and signups. Multiple aliases, real send/receive, no phone number.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/signup" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
              Get Your Inbox Free
            </Link>
            <Link href="/login" className="px-8 py-3 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-[var(--text-primary)] font-bold rounded-xl hover:border-blue-400 transition-colors">
              Sign In to Inbox
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <span className="text-2xl block mb-3">{f.icon}</span>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-6 bg-[var(--bg-alt)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Use Cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left mt-6">
            {[
              'Sign up for websites that require email verification',
              'Receive newsletters without cluttering your personal inbox',
              'Use separate aliases for different services',
              'Get email alerts forwarded to Telegram',
              'Test email workflows as a developer',
              'Protect your personal email from spam lists',
            ].map((uc, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] p-3 rounded-lg bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <span className="text-blue-400 shrink-0">·</span> {uc}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
