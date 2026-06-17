import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const metrics = [
  { icon: '📊', title: 'Message Volume', desc: 'Track total messages per day, week, and month. Identify peak hours.' },
  { icon: '👥', title: 'Member Growth', desc: 'Monitor joins, leaves, and net growth. See which days attract the most new members.' },
  { icon: '🏆', title: 'Active Users', desc: 'Identify your most active contributors. See who posts most and engagement scores.' },
  { icon: '⚡', title: 'Command Usage', desc: 'Track which bot commands are used most. Optimize features based on real usage.' },
  { icon: '📈', title: 'Engagement Rate', desc: 'Measure the percentage of members who actively participate.' },
  { icon: '🕐', title: 'Activity Heatmap', desc: 'See when your group is most active. Plan announcements for maximum visibility.' },
];

export default function TelegramGroupAnalyticsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-mono mb-6">
            TELEGRAM ANALYTICS
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            Telegram Group Analytics<br />(2026), Members & Growth
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            Free Telegram group analytics dashboard. Track member growth, message activity, active users, command usage, and engagement trends.
          </p>
          <Link href="/signup" className="inline-flex px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
            Get Started Free
          </Link>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-10">What You Can Track</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {metrics.map(m => (
              <div key={m.title} className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <span className="text-2xl block mb-3">{m.icon}</span>
                <h3 className="font-bold text-[var(--text-primary)] mb-1">{m.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-6 bg-[var(--bg-alt)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Analytics included with every plan</h2>
          <p className="text-[var(--text-secondary)] mb-6">Connect your Telegram bot to BotWave and analytics start tracking immediately. No setup required.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/pricing" className="px-6 py-3 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-[var(--text-primary)] font-semibold rounded-xl hover:border-blue-400 transition-colors">
              View Plans
            </Link>
            <Link href="/signup" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Start Free →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
