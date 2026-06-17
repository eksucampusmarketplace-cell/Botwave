import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const stats = [
  { label: 'Commands Available', value: '150+' },
  { label: 'Countries Supported', value: '50+' },
  { label: 'Platforms', value: '2' },
  { label: 'Price', value: 'Free' },
];

const values = [
  {
    title: 'Free Forever',
    description: 'We believe bot automation should be accessible to everyone. Our core platform is and always will be free. No trials, no credit card, no catch.',
    icon: '💸',
  },
  {
    title: 'Your Device, Your IP',
    description: 'Unlike other bot services, your Telegram connection uses the official Bot API. Zero ban risk, fully supported by Telegram, and no IP-sharing with other bot users.',
    icon: '🛡️',
  },
  {
    title: 'Community-First',
    description: 'Built for group admins, school communities, church groups, and small businesses who need automation without the enterprise price tag.',
    icon: '🤝',
  },
  {
    title: 'Open & Transparent',
    description: 'We publish our security practices, anti-ban techniques, and status page openly. No black boxes.',
    icon: '🔓',
  },
];

const platforms = [
  { name: 'Telegram Bot API', desc: 'Official Telegram bot via @BotFather. Zero ban risk. Anti-spam, CAPTCHA, welcome messages, and full group management.', icon: '✈️', color: 'blue' },
  { name: 'Telegram Bot', desc: 'Connect your real Telegram account via MTProto. Full personal account automation.', icon: '👤', color: 'violet' },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-6">
            About <span className="text-blue-500">BotWave</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
            BotWave is a free Telegram bot automation platform. We are built around one belief: powerful group management tools should be available to everyone, not just enterprises with six-figure software budgets.
          </p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="text-center p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
              <div className="text-3xl font-black text-blue-500 mb-1">{s.value}</div>
              <div className="text-xs text-[var(--text-muted)]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 bg-[var(--bg-alt)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">What We Stand For</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map(v => (
              <div key={v.title} className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <span className="text-3xl block mb-3">{v.icon}</span>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">{v.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-4">Supported Platforms</h2>
          <p className="text-center text-[var(--text-secondary)] mb-10">One BotWave account covers both Telegram platforms.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {platforms.map(p => (
              <div key={p.name} className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-center">
                <span className="text-3xl block mb-3">{p.icon}</span>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">{p.name}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Not affiliated with other "BotWave" projects</h2>
          <p className="text-[var(--text-secondary)] mb-8">
            BotWave (botwave.online) is an independent Telegram bot automation platform. We are not affiliated with any other projects sharing similar names.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/signup" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
              Get Started Free
            </Link>
            <Link href="/community" className="px-6 py-3 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-[var(--text-primary)] font-bold rounded-xl hover:border-blue-400 transition-colors">
              Join Community
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
